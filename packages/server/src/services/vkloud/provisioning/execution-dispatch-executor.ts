import { TRPCError } from "@trpc/server";

import type {
        PersistFirstComposeRecordInput,
} from "./first-compose-record";

import {
        executeFirstComposeRecord,
} from "./first-compose-record-execution";

export const dispatchProvisioningExecution = async (
        input: PersistFirstComposeRecordInput,
) => {
        if (input.intent.mode !== "authorized_intent") {
                throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Authorized execution intent required",
                });
        }

        return executeFirstComposeRecord(input);
};
