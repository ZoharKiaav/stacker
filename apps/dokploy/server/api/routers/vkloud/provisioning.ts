import {
	acceptProvisioningRequest,
	buildProvisioningServiceStatus,
	buildProvisioningStatusResponse,
	findBillingServiceMappingOrThrow,
	findProvisioningOperationStatus,
	provisioningRequestSchema,
	provisioningResponseSchema,
	provisioningServiceStatusSchema,
} from "@dokploy/server";
import { z } from "zod";
import { createTRPCRouter, vpayProcedure } from "../../trpc";

const TARGET_POLICY = "managed-default";

const operationStatusInput = z.object({
	operationId: z.string().min(1).max(255),
});

const serviceStatusInput = z.object({
	billingServiceId: z.string().min(1).max(255),
});

export const vkloudProvisioningRouter = createTRPCRouter({
	accept: vpayProcedure
		.input(provisioningRequestSchema)
		.output(provisioningResponseSchema)
		.mutation(async ({ input, ctx }) => {
			const accepted = await acceptProvisioningRequest({
				organizationId: ctx.session.activeOrganizationId,
				request: input,
				targetPolicy: TARGET_POLICY,
				actor: {
					userId: ctx.user.id,
					email: ctx.user.email,
					role: ctx.user.role,
				},
			});

			const current = await findProvisioningOperationStatus(
				ctx.session.activeOrganizationId,
				accepted.operation.id,
			);

			return buildProvisioningStatusResponse({
				operation: current,
				mapping: current.billingService,
				duplicate: accepted.duplicate,
			});
		}),

	operationStatus: vpayProcedure
		.input(operationStatusInput)
		.output(provisioningResponseSchema)
		.query(async ({ input, ctx }) => {
			const operation = await findProvisioningOperationStatus(
				ctx.session.activeOrganizationId,
				input.operationId,
			);

			return buildProvisioningStatusResponse({
				operation,
				mapping: operation.billingService,
			});
		}),

	serviceStatus: vpayProcedure
		.input(serviceStatusInput)
		.output(provisioningServiceStatusSchema)
		.query(async ({ input, ctx }) => {
			const mapping = await findBillingServiceMappingOrThrow(
				ctx.session.activeOrganizationId,
				"vpay",
				input.billingServiceId,
			);

			return buildProvisioningServiceStatus(mapping);
		}),
});
