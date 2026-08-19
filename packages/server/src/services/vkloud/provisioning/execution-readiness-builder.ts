import type { ProvisioningExecutionPlan } from "./execution-contract";
import {
	type ExecutionReadiness,
	executionReadinessSchema,
} from "./execution-readiness";
import type { ExecutionTargetDefinition } from "./execution-target";
import { ExecutionTargetResolver } from "./execution-target-resolver";

export const buildExecutionReadiness = (
	plan: ProvisioningExecutionPlan,
	targets: ExecutionTargetDefinition[],
): ExecutionReadiness => {
	const resolver = new ExecutionTargetResolver();

	for (const target of targets) {
		resolver.register(target);
	}

	const target = resolver.resolve(plan);

	return executionReadinessSchema.parse({
		ready: true,
		plan,
		target,
	});
};
