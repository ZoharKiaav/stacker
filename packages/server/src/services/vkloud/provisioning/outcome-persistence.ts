import { db } from "@dokploy/server/db";
import {
	auditLog,
	vkloudBillingService,
	vkloudProvisioningOperation,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { redactAuditMetadata } from "../audit";
import type { VkloudAuditActor } from "../audit/audit-types";
import { getProvisioningAuditMapping } from "./audit";
import type { ProvisioningErrorCategory } from "./errors";
import {
	canCompleteProvisioningOperation,
	isCompletionErrorValid,
	type TerminalOperationState,
	terminalServiceState,
} from "./outcome-decisions";

export interface CompleteProvisioningOperationInput {
	organizationId: string;
	operationId: string;
	outcome: TerminalOperationState;
	actor: VkloudAuditActor;
	error?: {
		code: string;
		category: ProvisioningErrorCategory;
		retryable: boolean;
		supportReference: string;
	};
}

export const completeProvisioningOperationPersistence = async ({
	organizationId,
	operationId,
	outcome,
	actor,
	error,
}: CompleteProvisioningOperationInput) =>
	await db.transaction(async (tx) => {
		const operation = await tx.query.vkloudProvisioningOperation.findFirst({
			where: and(
				eq(vkloudProvisioningOperation.organizationId, organizationId),
				eq(vkloudProvisioningOperation.id, operationId),
			),
		});

		if (!operation) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Provisioning operation not found",
			});
		}

		const mapping = await tx.query.vkloudBillingService.findFirst({
			where: and(
				eq(vkloudBillingService.organizationId, organizationId),
				eq(vkloudBillingService.id, operation.billingServiceMappingId),
			),
		});

		if (!mapping) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Billing-service mapping not found",
			});
		}

		if (!canCompleteProvisioningOperation(operation.operationState, outcome)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Operation cannot move from ${operation.operationState} to ${outcome}`,
			});
		}

		if (operation.operationState === outcome) {
			return {
				mapping,
				operation,
				duplicate: true,
			};
		}

		if (!isCompletionErrorValid(outcome, Boolean(error))) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					outcome === "failed"
						? "Customer-safe error details are required for failed operations"
						: "Error details are only valid for failed operations",
			});
		}

		const serviceState = terminalServiceState(
			operation.operation,
			outcome,
			mapping.serviceState,
		);

		const now = new Date();

		const updatedOperation = await tx
			.update(vkloudProvisioningOperation)
			.set({
				operationState: outcome,
				startedAt: operation.startedAt ?? now,
				completedAt: now,
				safeErrorCode: error?.code ?? null,
				safeErrorCategory: error?.category ?? null,
				retryable: error?.retryable ?? false,
				supportReference: error?.supportReference ?? null,
			})
			.where(
				and(
					eq(vkloudProvisioningOperation.organizationId, organizationId),
					eq(vkloudProvisioningOperation.id, operationId),
					eq(
						vkloudProvisioningOperation.operationState,
						operation.operationState,
					),
				),
			)
			.returning()
			.then((rows) => rows[0]);

		if (!updatedOperation) {
			const concurrent = await tx.query.vkloudProvisioningOperation.findFirst({
				where: and(
					eq(vkloudProvisioningOperation.organizationId, organizationId),
					eq(vkloudProvisioningOperation.id, operationId),
				),
			});

			if (concurrent?.operationState === outcome) {
				const currentMapping = await tx.query.vkloudBillingService.findFirst({
					where: and(
						eq(vkloudBillingService.organizationId, organizationId),
						eq(vkloudBillingService.id, operation.billingServiceMappingId),
					),
				});

				if (!currentMapping) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Billing-service mapping not found",
					});
				}

				return {
					mapping: currentMapping,
					operation: concurrent,
					duplicate: true,
				};
			}

			throw new TRPCError({
				code: "CONFLICT",
				message:
					"Provisioning operation was completed concurrently with another outcome",
			});
		}

		const updatedMapping = await tx
			.update(vkloudBillingService)
			.set({
				serviceState,
				terminatedAt: serviceState === "terminated" ? now : undefined,
			})
			.where(
				and(
					eq(vkloudBillingService.organizationId, organizationId),
					eq(vkloudBillingService.id, mapping.id),
				),
			)
			.returning()
			.then((rows) => rows[0]);

		if (!updatedMapping) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Unable to update billing-service state",
			});
		}

		const auditMapping = getProvisioningAuditMapping(operation.operation);

		if (auditMapping) {
			const metadata = redactAuditMetadata({
				operationId: operation.id,
				billingServiceId: mapping.billingServiceId,
				productId: mapping.productId,
				templateId: mapping.templateId,
				templateVersion: mapping.templateVersion,
				workloadType: mapping.workloadType,
				outcome,
				errorCode: error?.code,
			});

			const auditEvent = await tx
				.insert(auditLog)
				.values({
					organizationId,
					userId: actor.userId,
					userEmail: actor.email,
					userRole: actor.role,
					action: auditMapping.action,
					resourceType: auditMapping.resourceType,
					resourceId: operation.id,
					resourceName: mapping.billingServiceId,
					metadata: metadata ? JSON.stringify(metadata) : null,
				})
				.returning({ id: auditLog.id })
				.then((rows) => rows[0]);

			if (!auditEvent) {
				throw new Error("Failed to create terminal vKloud audit event");
			}
		}

		return {
			mapping: updatedMapping,
			operation: updatedOperation,
			duplicate: false,
		};
	});
