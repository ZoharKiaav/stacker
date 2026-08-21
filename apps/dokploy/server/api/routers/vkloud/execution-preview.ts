import {
	evaluateProvisioningExecutionReadiness,
	executionReadinessSchema,
	loadExecutionTargetCatalogue,
} from "@dokploy/server";
import { z } from "zod";
import { createTRPCRouter, sessionAdminProcedure } from "../../trpc";

const previewExecutionInput = z.object({
	operationId: z.string().min(1).max(255),
});

export const vkloudExecutionPreviewRouter = createTRPCRouter({
	operation: sessionAdminProcedure
		.input(previewExecutionInput)
		.output(executionReadinessSchema)
		.query(async ({ input, ctx }) => {
			const organizationId = ctx.session.activeOrganizationId;

			const targets = await loadExecutionTargetCatalogue(organizationId);

			return evaluateProvisioningExecutionReadiness(
				organizationId,
				input.operationId,
				targets,
			);
		}),
});
