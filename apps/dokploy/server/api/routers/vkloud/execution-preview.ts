import {
	dispatchProvisioningOperationDryRun,
	provisioningExecutionPlanSchema,
} from "@dokploy/server";
import { z } from "zod";
import { createTRPCRouter, sessionAdminProcedure } from "../../trpc";

const previewExecutionInput = z.object({
	operationId: z.string().min(1).max(255),
});

export const vkloudExecutionPreviewRouter = createTRPCRouter({
	operation: sessionAdminProcedure
		.input(previewExecutionInput)
		.output(provisioningExecutionPlanSchema)
		.query(async ({ input, ctx }) =>
			dispatchProvisioningOperationDryRun(
				ctx.session.activeOrganizationId,
				input.operationId,
			),
		),
});
