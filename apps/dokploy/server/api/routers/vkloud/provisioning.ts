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
import { executeAcceptedProvisioningOperation } from "./automatic-execution";

const TARGET_POLICY = "managed-default";

const operationStatusInput = z.object({
	operationId: z.string().min(1).max(255),
});

const serviceStatusInput = z.object({
	billingServiceId: z.string().min(1).max(255),
});

export const vkloudProvisioningRouter = createTRPCRouter({
	accept: vpayProcedure
		.meta({
			openapi: {
				enabled: true,
				method: "POST",
				path: "/vkloud/provisioning/v1/accept",
				override: true,
			},
		})
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

			const response = buildProvisioningStatusResponse({
				operation: current,
				mapping: current.billingService,
				duplicate: accepted.duplicate,
			});

			if (!accepted.duplicate) {
				void executeAcceptedProvisioningOperation({
					organizationId:
						ctx.session.activeOrganizationId,
					operationId: accepted.operation.id,
				}).catch((error) => {
					console.error(
						"Automatic vKloud provisioning execution failed",
						{
							operationId:
								accepted.operation.id,
							error,
						},
					);
				});
			}

			return response;
		}),

	operationStatus: vpayProcedure
		.meta({
			openapi: {
				enabled: true,
				method: "GET",
				path: "/vkloud/provisioning/v1/operations/{operationId}",
				override: true,
			},
		})
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
		.meta({
			openapi: {
				enabled: true,
				method: "GET",
				path: "/vkloud/provisioning/v1/services/{billingServiceId}",
				override: true,
			},
		})
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
