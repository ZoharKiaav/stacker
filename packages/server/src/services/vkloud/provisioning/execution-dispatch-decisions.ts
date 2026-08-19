import { TRPCError } from "@trpc/server";
import type {
	OperationState,
	ProvisioningOperation,
	WorkloadType,
} from "./contract";
import type {
	ExecutableProvisioningOperation,
	ExecutionAdapter,
} from "./execution-contract";

export const selectExecutionAdapter = (
	workloadType: WorkloadType,
): ExecutionAdapter => (workloadType === "vpstack" ? "compose" : "application");

export const isExecutableProvisioningOperation = (
	operation: ProvisioningOperation,
): operation is ExecutableProvisioningOperation =>
	operation === "deploy" ||
	operation === "suspend" ||
	operation === "unsuspend" ||
	operation === "terminate";

export const assertOperationReadyForDispatch = (
	operation: ProvisioningOperation,
	operationState: OperationState,
): ExecutableProvisioningOperation => {
	if (!isExecutableProvisioningOperation(operation)) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Operation ${operation} does not require infrastructure execution`,
		});
	}

	if (operationState !== "accepted") {
		throw new TRPCError({
			code: "CONFLICT",
			message: `Operation cannot be dispatched from state ${operationState}`,
		});
	}

	return operation;
};
