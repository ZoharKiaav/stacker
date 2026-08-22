import {
        dispatchReadyProvisioningExecution,
} from "./execution-ready-dispatch";

import {
        authorizeVpstackComposeIntent,
        DISPOSABLE_EXECUTION_AUTHORIZATION,
} from "./vpstack-compose-authorization";

import type {
        ExecutionReadiness,
} from "./execution-readiness";

import type {
        ImmutableTemplateArtifact,
} from "./immutable-template-artifact";

export interface RunProvisioningExecutionInput {
        readiness: ExecutionReadiness;
        artifact: ImmutableTemplateArtifact;
        operationState: "accepted";
        existingResourceCount: number;
}

export const runProvisioningExecution = async ({
        readiness,
        artifact,
        operationState,
        existingResourceCount,
}: RunProvisioningExecutionInput) => {
        const intent =
                authorizeVpstackComposeIntent({
                        readiness,
                        artifact,
                        operationState,
                        existingResourceCount,
                        authorization:
                                DISPOSABLE_EXECUTION_AUTHORIZATION,
                });

        return dispatchReadyProvisioningExecution({
                organizationId:
                        readiness.plan.organizationId,
                intent,
        });
};
