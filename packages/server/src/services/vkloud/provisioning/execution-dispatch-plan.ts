import type {
	OperationState,
	ProvisioningOperation,
	WorkloadType,
} from "./contract";
import type { ProvisioningExecutionPlan } from "./execution-contract";
import {
	assertOperationReadyForDispatch,
	selectExecutionAdapter,
} from "./execution-dispatch-decisions";
import {
	createDryRunPlanner,
	ProvisioningExecutionPlannerRegistry,
} from "./execution-planner";

export interface BuildDryRunDispatchPlanInput {
	organizationId: string;
	operationId: string;
	billingServiceMappingId: string;
	operation: ProvisioningOperation;
	operationState: OperationState;
	workloadType: WorkloadType;
	productId: string;
	templateId: string;
	templateVersion: string;
	targetPolicy: string;
}

export const buildDryRunDispatchPlan = (
	input: BuildDryRunDispatchPlanInput,
): ProvisioningExecutionPlan => {
	const operation = assertOperationReadyForDispatch(
		input.operation,
		input.operationState,
	);

	const adapter = selectExecutionAdapter(input.workloadType);

	const registry = new ProvisioningExecutionPlannerRegistry();

	registry.register(createDryRunPlanner("compose", ["vpstack"]));

	registry.register(createDryRunPlanner("application", ["saas"]));

	return registry.plan({
		organizationId: input.organizationId,
		operationId: input.operationId,
		billingServiceMappingId: input.billingServiceMappingId,
		workloadType: input.workloadType,
		operation,
		adapter,
		productId: input.productId,
		templateId: input.templateId,
		templateVersion: input.templateVersion,
		targetPolicy: input.targetPolicy,
	});
};
