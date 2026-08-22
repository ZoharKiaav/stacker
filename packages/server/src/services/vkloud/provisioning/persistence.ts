import { db } from "@dokploy/server/db";
import {
	vkloudBillingService,
	vkloudProvisioningOperation,
	vkloudProvisioningResource,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import type {
	ProvisioningOperation,
	ProvisioningRequest,
	ServiceState,
} from "./contract";
import { createProvisioningRequestFingerprint } from "./idempotency";

export interface CreateBillingServiceInput {
	organizationId: string;
	request: ProvisioningRequest;
	targetPolicy: string;
}

export interface CreateOperationInput {
	organizationId: string;
	billingServiceMappingId: string;
	request: ProvisioningRequest;
}

export interface RegisterResourceInput {
	organizationId: string;
	billingServiceMappingId: string;
	createdByOperationId?: string;
	resourceType: string;
	resourceId: string;
	resourceName?: string;
	isPrimary?: boolean;
}

const isConstraintViolation = (error: unknown, constraint: string): boolean =>
	error instanceof Error && error.message.includes(constraint);

export const findBillingServiceMapping = async (
	organizationId: string,
	billingSource: string,
	billingServiceId: string,
) =>
	await db.query.vkloudBillingService.findFirst({
		where: and(
			eq(vkloudBillingService.organizationId, organizationId),
			eq(vkloudBillingService.billingSource, billingSource),
			eq(vkloudBillingService.billingServiceId, billingServiceId),
		),
		with: {
			operations: true,
			resources: true,
		},
	});

export const findBillingServiceMappingOrThrow = async (
	organizationId: string,
	billingSource: string,
	billingServiceId: string,
) => {
	const mapping = await findBillingServiceMapping(
		organizationId,
		billingSource,
		billingServiceId,
	);

	if (!mapping) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Provisioned billing service not found",
		});
	}

	return mapping;
};

export const createBillingServiceMapping = async ({
	organizationId,
	request,
	targetPolicy,
}: CreateBillingServiceInput) => {
	try {
		const mapping = await db
			.insert(vkloudBillingService)
			.values({
				organizationId,
				billingSource: "vpay",
				billingCustomerId: request.billing.customerId,
				billingServiceId: request.billing.serviceId,
				workloadType: request.product.workloadType,
				productId: request.product.productId,
				templateId: request.product.templateId,
				templateVersion: request.product.templateVersion,
				targetPolicy,
				serviceState: "pending",
			})
			.returning()
			.then((rows) => rows[0]);

		if (!mapping) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Unable to create billing-service mapping",
			});
		}

		return mapping;
	} catch (error) {
		if (isConstraintViolation(error, "vkloud_billing_service_identity_uidx")) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "A mapping already exists for this billing service",
			});
		}

		throw error;
	}
};

export const createProvisioningOperation = async ({
	organizationId,
	billingServiceMappingId,
	request,
}: CreateOperationInput) => {
	const mapping = await db.query.vkloudBillingService.findFirst({
		where: and(
			eq(vkloudBillingService.id, billingServiceMappingId),
			eq(vkloudBillingService.organizationId, organizationId),
		),
	});

	if (!mapping) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Billing-service mapping not found",
		});
	}

	const fingerprint = createProvisioningRequestFingerprint(request);

	const existing = await db.query.vkloudProvisioningOperation.findFirst({
		where: and(
			eq(vkloudProvisioningOperation.organizationId, organizationId),
			eq(vkloudProvisioningOperation.idempotencyKey, request.idempotencyKey),
		),
	});

	if (existing) {
		if (existing.requestFingerprint !== fingerprint) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Idempotency key was already used for a different request",
			});
		}

		return {
			operation: existing,
			duplicate: true,
		};
	}

	try {
		const operation = await db
			.insert(vkloudProvisioningOperation)
			.values({
				organizationId,
				billingServiceMappingId,
				operation: request.operation,
				operationState: "accepted",
				idempotencyKey: request.idempotencyKey,
				requestFingerprint: fingerprint,
			})
			.returning()
			.then((rows) => rows[0]);

		if (!operation) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Unable to create provisioning operation",
			});
		}

		return {
			operation,
			duplicate: false,
		};
	} catch (error) {
		if (
			isConstraintViolation(
				error,
				"vkloud_provisioning_operation_idempotency_uidx",
			)
		) {
			const concurrent = await db.query.vkloudProvisioningOperation.findFirst({
				where: and(
					eq(vkloudProvisioningOperation.organizationId, organizationId),
					eq(
						vkloudProvisioningOperation.idempotencyKey,
						request.idempotencyKey,
					),
				),
			});

			if (concurrent && concurrent.requestFingerprint === fingerprint) {
				return {
					operation: concurrent,
					duplicate: true,
				};
			}

			throw new TRPCError({
				code: "CONFLICT",
				message: "Idempotency key was already used for a different request",
			});
		}

		throw error;
	}
};

export const updateProvisioningOperationState = async (
	organizationId: string,
	operationId: string,
	operationState: "running" | "succeeded" | "failed" | "cancelled",
) => {
	const operation = await db
		.update(vkloudProvisioningOperation)
		.set({
			operationState,
			startedAt: operationState === "running" ? new Date() : undefined,
			completedAt:
				operationState === "succeeded" ||
				operationState === "failed" ||
				operationState === "cancelled"
					? new Date()
					: undefined,
		})
		.where(
			and(
				eq(vkloudProvisioningOperation.organizationId, organizationId),
				eq(vkloudProvisioningOperation.id, operationId),
			),
		)
		.returning()
		.then((rows) => rows[0]);

	if (!operation) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Provisioning operation not found",
		});
	}

	return operation;
};

export const updateBillingServiceState = async (
	organizationId: string,
	mappingId: string,
	serviceState: ServiceState,
) => {
	const mapping = await db
		.update(vkloudBillingService)
		.set({
			serviceState,
			terminatedAt: serviceState === "terminated" ? new Date() : undefined,
		})
		.where(
			and(
				eq(vkloudBillingService.organizationId, organizationId),
				eq(vkloudBillingService.id, mappingId),
			),
		)
		.returning()
		.then((rows) => rows[0]);

	if (!mapping) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Billing-service mapping not found",
		});
	}

	return mapping;
};

export const registerProvisioningResource = async ({
	organizationId,
	billingServiceMappingId,
	createdByOperationId,
	resourceType,
	resourceId,
	resourceName,
	isPrimary = false,
}: RegisterResourceInput) => {
	const mapping = await db.query.vkloudBillingService.findFirst({
		where: and(
			eq(vkloudBillingService.id, billingServiceMappingId),
			eq(vkloudBillingService.organizationId, organizationId),
		),
	});

	if (!mapping) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Billing-service mapping not found",
		});
	}

	if (createdByOperationId) {
		const operation = await db.query.vkloudProvisioningOperation.findFirst({
			where: and(
				eq(vkloudProvisioningOperation.id, createdByOperationId),
				eq(vkloudProvisioningOperation.organizationId, organizationId),
				eq(
					vkloudProvisioningOperation.billingServiceMappingId,
					billingServiceMappingId,
				),
			),
		});

		if (!operation) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Creating provisioning operation not found",
			});
		}
	}

	try {
		const resource = await db
			.insert(vkloudProvisioningResource)
			.values({
				organizationId,
				billingServiceMappingId,
				createdByOperationId,
				resourceType,
				resourceId,
				resourceName,
				isPrimary,
			})
			.returning()
			.then((rows) => rows[0]);

		if (!resource) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Unable to register provisioning resource",
			});
		}

		return resource;
	} catch (error) {
		if (
			isConstraintViolation(error, "vkloud_provisioning_resource_identity_uidx")
		) {
			throw new TRPCError({
				code: "CONFLICT",
				message: "Stacker resource is already assigned",
			});
		}

		throw error;
	}
};

export const findProvisioningResources = async (
	organizationId: string,
	billingServiceMappingId: string,
) =>
	await db.query.vkloudProvisioningResource.findMany({
		where: and(
			eq(vkloudProvisioningResource.organizationId, organizationId),
			eq(
				vkloudProvisioningResource.billingServiceMappingId,
				billingServiceMappingId,
			),
		),
	});

export const operationCreatesLifecycleState = (
	operation: ProvisioningOperation,
): boolean =>
	operation === "deploy" ||
	operation === "suspend" ||
	operation === "unsuspend" ||
	operation === "terminate";

export const findProvisioningOperationByIdempotencyKey = async (
	organizationId: string,
	idempotencyKey: string,
) =>
	await db.query.vkloudProvisioningOperation.findFirst({
		where: and(
			eq(vkloudProvisioningOperation.organizationId, organizationId),
			eq(vkloudProvisioningOperation.idempotencyKey, idempotencyKey),
		),
	});
