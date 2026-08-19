import { buildDryRunDispatchPlan } from "./execution-dispatch-plan";
import { findProvisioningOperationStatus } from "./status-persistence";

export const dispatchProvisioningOperationDryRun = async (
	organizationId: string,
	operationId: string,
) => {
	const operation = await findProvisioningOperationStatus(
		organizationId,
		operationId,
	);

	return buildDryRunDispatchPlan({
		organizationId,
		operationId: operation.id,
		billingServiceMappingId: operation.billingServiceMappingId,
		operation: operation.operation,
		operationState: operation.operationState,
		workloadType: operation.billingService.workloadType,
		productId: operation.billingService.productId,
		templateId: operation.billingService.templateId,
		templateVersion: operation.billingService.templateVersion,
		targetPolicy: operation.billingService.targetPolicy,
	});
};
