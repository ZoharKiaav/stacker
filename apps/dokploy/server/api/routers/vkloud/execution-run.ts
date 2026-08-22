import {
	evaluateProvisioningExecutionReadiness,
	findProvisioningOperationStatus,
	loadExecutionTargetCatalogue,
	runProvisioningExecution,
	verifyImmutableTemplateArtifact,
} from "@dokploy/server";
import { fetchTemplateFiles } from "@dokploy/server/templates/github";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, sessionAdminProcedure } from "../../trpc";

const runExecutionInput = z.object({
	operationId: z.string().min(1).max(255),
});

const runExecutionOutput = z.object({
	composeId: z.string().min(1),
	resourceName: z.string().min(1),
	duplicate: z.boolean(),
	operationState: z.literal("running"),
});

export const vkloudExecutionRunRouter = createTRPCRouter({
	operation: sessionAdminProcedure
		.input(runExecutionInput)
		.output(runExecutionOutput)
		.mutation(async ({ input, ctx }) => {
			const organizationId = ctx.session.activeOrganizationId;

			const targets = await loadExecutionTargetCatalogue(organizationId);

			const readiness = await evaluateProvisioningExecutionReadiness(
				organizationId,
				input.operationId,
				targets,
			);

			const baseUrl = readiness.target.templateSource.baseUrl;

			if (!baseUrl) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Execution target does not define a trusted template registry URL",
				});
			}

			const current = await findProvisioningOperationStatus(
				organizationId,
				input.operationId,
			);

			if (current.operationState !== "accepted") {
				throw new TRPCError({
					code: "CONFLICT",
					message: `Operation cannot execute from state ${current.operationState}`,
				});
			}

			const fetched = await fetchTemplateFiles(
				readiness.target.templateSource.templateId,
				baseUrl,
			);

			const artifact = verifyImmutableTemplateArtifact(
				{
					templateId: readiness.target.templateSource.templateId,
					templateVersion: readiness.target.templateSource.templateVersion,
					baseUrl,
				},
				{
					metadata: fetched.config.metadata,
					dockerCompose: fetched.dockerCompose,
				},
			);

			return runProvisioningExecution({
				readiness,
				artifact,
				operationState: current.operationState,
				existingResourceCount: current.billingService.resources.length,
			});
		}),
});
