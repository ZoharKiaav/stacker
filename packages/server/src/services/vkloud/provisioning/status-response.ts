import type { OperationState, WorkloadType } from "./contract";
import type { ProvisioningErrorCategory } from "./errors";
import {
	type ProvisioningResponse,
	provisioningResponseSchema,
} from "./response";

interface StatusResource {
	resourceId: string;
	isPrimary: boolean;
}

export interface BuildProvisioningStatusResponseInput {
	operation: {
		id: string;
		operationState: OperationState;
		safeErrorCode: string | null;
		safeErrorCategory: ProvisioningErrorCategory | null;
		retryable: boolean;
		supportReference: string | null;
	};
	mapping: {
		billingServiceId: string;
		workloadType: WorkloadType;
		customerSafeProperties: Record<string, unknown>;
		resources: StatusResource[];
	};
	duplicate?: boolean;
}

const customerMessageForCategory = (
	category: ProvisioningErrorCategory,
): string => {
	switch (category) {
		case "validation":
			return "The provisioning request could not be validated.";
		case "authentication":
		case "authorization":
			return "The provisioning request could not be authorized.";
		case "capacity":
			return "Provisioning capacity is temporarily unavailable.";
		case "dependency":
			return "A required provisioning dependency is unavailable.";
		case "health":
			return "The provisioned service did not pass its health check.";
		case "conflict":
			return "The provisioning request conflicts with the current service state.";
		default:
			return "The provisioning operation could not be completed.";
	}
};

export const buildProvisioningStatusResponse = ({
	operation,
	mapping,
	duplicate = false,
}: BuildProvisioningStatusResponseInput): ProvisioningResponse => {
	const primaryResource =
		mapping.resources.find((resource) => resource.isPrimary) ??
		mapping.resources[0];

	const error =
		operation.operationState === "failed" &&
		operation.safeErrorCode &&
		operation.safeErrorCategory
			? {
					code: operation.safeErrorCode,
					category: operation.safeErrorCategory,
					retryable: operation.retryable,
					customerMessage: customerMessageForCategory(
						operation.safeErrorCategory,
					),
					operationId: operation.id,
					supportReference: operation.supportReference ?? operation.id,
				}
			: null;

	return provisioningResponseSchema.parse({
		contractVersion: "v1",
		operationId: operation.id,
		billingServiceId: mapping.billingServiceId,
		state: operation.operationState,
		duplicate,
		resource: {
			resourceId: primaryResource?.resourceId ?? null,
			workloadType: mapping.workloadType,
		},
		customerSafe: mapping.customerSafeProperties,
		error,
	});
};
