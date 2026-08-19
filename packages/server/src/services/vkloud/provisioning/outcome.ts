import type { VkloudAuditActor } from "../audit/audit-types";
import type { ProvisioningErrorCategory } from "./errors";
import type { TerminalOperationState } from "./outcome-decisions";
import { completeProvisioningOperationPersistence } from "./outcome-persistence";

export interface CompleteProvisioningOperationRequest {
	organizationId: string;
	operationId: string;
	outcome: TerminalOperationState;
	actor: VkloudAuditActor;
	error?: {
		code: string;
		category: ProvisioningErrorCategory;
		retryable: boolean;
		supportReference: string;
	};
}

export const completeProvisioningOperation = async (
	input: CompleteProvisioningOperationRequest,
) => completeProvisioningOperationPersistence(input);
