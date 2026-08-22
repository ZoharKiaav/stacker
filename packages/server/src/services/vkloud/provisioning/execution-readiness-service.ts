import { dispatchProvisioningOperationDryRun } from "./execution-dispatch";
import { buildExecutionReadiness } from "./execution-readiness-builder";
import type { ExecutionTargetDefinition } from "./execution-target";
import { validateExecutionTargetOwnership } from "./execution-target-validation";

export const evaluateProvisioningExecutionReadiness = async (
	organizationId: string,
	operationId: string,
	targets: ExecutionTargetDefinition[],
) => {
	const plan = await dispatchProvisioningOperationDryRun(
		organizationId,
		operationId,
	);

	const readiness = buildExecutionReadiness(plan, targets);

	await validateExecutionTargetOwnership(organizationId, readiness.target);

	return readiness;
};
