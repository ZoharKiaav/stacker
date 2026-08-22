import {
        updateProvisioningOperationState,
} from "./persistence";

import {
        persistFirstComposeRecordPostgres,
} from "./first-compose-record-postgres";

import type {
        PersistFirstComposeRecordInput,
} from "./first-compose-record";

export interface FirstComposeRecordExecutionResult {
        composeId: string;
        resourceName: string;
        duplicate: boolean;
        operationState: "running";
}

export const executeFirstComposeRecord = async (
        input: PersistFirstComposeRecordInput,
): Promise<FirstComposeRecordExecutionResult> => {
        const created =
                await persistFirstComposeRecordPostgres(
                        input,
                );

        await updateProvisioningOperationState(
                input.organizationId,
                input.intent.operationId,
                "running",
        );

        return {
                composeId: created.composeId,
                resourceName: created.resourceName,
                duplicate: created.duplicate,
                operationState: "running",
        };
};
