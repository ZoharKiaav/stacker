import type {
	OperationState,
	ProvisioningOperation,
	ServiceState,
} from "./contract";
import { successfulStateForOperation } from "./lifecycle";

export type TerminalOperationState = "succeeded" | "failed" | "cancelled";

export const canCompleteProvisioningOperation = (
	current: OperationState,
	target: TerminalOperationState,
): boolean =>
	current === target || current === "accepted" || current === "running";

export const isCompletionErrorValid = (
	outcome: TerminalOperationState,
	hasError: boolean,
): boolean => (outcome === "failed" ? hasError : !hasError);

export const terminalServiceState = (
	operation: ProvisioningOperation,
	outcome: TerminalOperationState,
	currentServiceState: ServiceState,
): ServiceState => {
	if (
		operation === "status" ||
		operation === "health_check" ||
		operation === "rotate_credentials"
	) {
		return currentServiceState;
	}

	if (outcome === "succeeded") {
		return successfulStateForOperation(operation) ?? currentServiceState;
	}

	if (outcome === "cancelled") {
		return "reconciling";
	}

	return "failed";
};
