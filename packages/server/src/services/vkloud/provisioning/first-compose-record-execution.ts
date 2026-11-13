import type {
	CustomerSafeEndpoint,
	PersistFirstComposeRecordInput,
} from "./first-compose-record";

import { persistFirstComposeRecordPostgres } from "./first-compose-record-postgres";
import { updateProvisioningOperationState } from "./persistence";

export interface FirstComposeRecordExecutionResult {
	composeId: string;
	resourceName: string;
	duplicate: boolean;
	primaryUrl: string;
	endpoints: CustomerSafeEndpoint[];
	accessDuplicate: boolean;
	operationState: "running";
}

export const executeFirstComposeRecord = async (
	input: PersistFirstComposeRecordInput,
): Promise<FirstComposeRecordExecutionResult> => {
	const created = await persistFirstComposeRecordPostgres(input);

	await updateProvisioningOperationState(
		input.organizationId,
		input.intent.operationId,
		"running",
	);

	return {
		composeId: created.composeId,
		resourceName: created.resourceName,
		duplicate: created.duplicate,
		primaryUrl: created.primaryUrl,
		endpoints: created.endpoints,
		accessDuplicate: created.accessDuplicate,
		operationState: "running",
	};
};
