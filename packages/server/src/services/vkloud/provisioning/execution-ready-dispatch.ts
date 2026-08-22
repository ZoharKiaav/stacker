import {
        dispatchProvisioningExecution,
} from "./execution-dispatch-executor";

import type {
        PersistFirstComposeRecordInput,
} from "./first-compose-record";

export const dispatchReadyProvisioningExecution = async (
        input: PersistFirstComposeRecordInput,
) => {
        return dispatchProvisioningExecution(input);
};
