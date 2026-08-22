import { z } from "zod";
import { provisioningExecutionPlanSchema } from "./execution-contract";
import { executionTargetSchema } from "./execution-target";

export const executionReadinessSchema = z.object({
	ready: z.literal(true),
	plan: provisioningExecutionPlanSchema,
	target: executionTargetSchema,
});

export type ExecutionReadiness = z.infer<typeof executionReadinessSchema>;
