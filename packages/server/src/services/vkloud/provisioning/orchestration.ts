import type { VkloudBillingService } from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { createVkloudAuditEvent } from "../audit";
import type { VkloudAuditActor } from "../audit/audit-types";
import { getProvisioningAuditMapping } from "./audit";
import type { ProvisioningRequest } from "./contract";
import { createProvisioningRequestFingerprint } from "./idempotency";
import {
	canBeginLifecycleOperation,
	startingStateForOperation,
} from "./lifecycle";
import { matchesProvisioningProduct } from "./orchestration-decisions";
import {
	createBillingServiceMapping,
	createProvisioningOperation,
	findBillingServiceMapping,
	findProvisioningOperationByIdempotencyKey,
	updateBillingServiceState,
} from "./persistence";

export interface AcceptProvisioningRequestInput {
	organizationId: string;
	request: ProvisioningRequest;
	targetPolicy: string;
	actor: VkloudAuditActor;
}

export const acceptProvisioningRequest = async ({
	organizationId,
	request,
	targetPolicy,
	actor,
}: AcceptProvisioningRequestInput) => {
	let mapping: VkloudBillingService | undefined =
		await findBillingServiceMapping(
			organizationId,
			"vpay",
			request.billing.serviceId,
		);

	if (!mapping) {
		if (request.operation !== "deploy") {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Billing-service mapping not found",
			});
		}

		try {
			mapping = await createBillingServiceMapping({
				organizationId,
				request,
				targetPolicy,
			});
		} catch (error) {
			if (error instanceof TRPCError && error.code === "CONFLICT") {
				mapping = await findBillingServiceMapping(
					organizationId,
					"vpay",
					request.billing.serviceId,
				);
			} else {
				throw error;
			}
		}
	}

	if (!mapping) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Unable to resolve billing-service mapping",
		});
	}

	if (!matchesProvisioningProduct(mapping, request, targetPolicy)) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Billing service does not match the requested provisioning product",
		});
	}

	const existing = await findProvisioningOperationByIdempotencyKey(
		organizationId,
		request.idempotencyKey,
	);

	if (existing) {
		const fingerprint = createProvisioningRequestFingerprint(request);

		if (existing.requestFingerprint !== fingerprint) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Idempotency key was already used for a different request",
			});
		}

		if (existing.billingServiceMappingId !== mapping.id) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Idempotency key belongs to another billing service",
			});
		}

		return {
			mapping,
			operation: existing,
			duplicate: true,
		};
	}

	if (!canBeginLifecycleOperation(mapping.serviceState, request.operation)) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Operation ${request.operation} is not valid from state ${mapping.serviceState}`,
		});
	}

	const accepted = await createProvisioningOperation({
		organizationId,
		billingServiceMappingId: mapping.id,
		request,
	});

	if (accepted.duplicate) {
		return {
			mapping,
			operation: accepted.operation,
			duplicate: true,
		};
	}

	const startingState = startingStateForOperation(request.operation);

	if (startingState) {
		mapping = await updateBillingServiceState(
			organizationId,
			mapping.id,
			startingState,
		);
	}

	const auditMapping = getProvisioningAuditMapping(request.operation);

	if (auditMapping) {
		await createVkloudAuditEvent({
			organizationId,
			actor,
			action: auditMapping.action,
			resourceType: auditMapping.resourceType,
			resourceId: accepted.operation.id,
			resourceName: request.billing.serviceId,
			metadata: {
				operationId: accepted.operation.id,
				billingServiceId: request.billing.serviceId,
				productId: request.product.productId,
				templateId: request.product.templateId,
				templateVersion: request.product.templateVersion,
				workloadType: request.product.workloadType,
				outcome: "accepted",
			},
		});
	}

	return {
		mapping,
		operation: accepted.operation,
		duplicate: false,
	};
};
