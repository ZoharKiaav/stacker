import { z } from "zod";
import { provisioningOperationSchema, workloadTypeSchema } from "./contract";

export const executionAdapterSchema = z.enum(["compose", "application"]);

export const executableProvisioningOperationSchema =
	provisioningOperationSchema.extract([
		"deploy",
		"suspend",
		"unsuspend",
		"terminate",
	]);

export const provisioningExecutionPlanSchema = z.object({
	mode: z.literal("dry_run"),
	organizationId: z.string().min(1),
	operationId: z.string().min(1),
	billingServiceMappingId: z.string().min(1),
	workloadType: workloadTypeSchema,
	operation: executableProvisioningOperationSchema,
	adapter: executionAdapterSchema,
	productId: z.string().min(1),
	templateId: z.string().min(1),
	templateVersion: z.string().min(1),
	targetPolicy: z.string().min(1),
});

export type ExecutionAdapter = z.infer<typeof executionAdapterSchema>;

export type ExecutableProvisioningOperation = z.infer<
	typeof executableProvisioningOperationSchema
>;

export type ProvisioningExecutionPlan = z.infer<
	typeof provisioningExecutionPlanSchema
>;
