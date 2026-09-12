import {
        deployCompose,
        evaluateProvisioningExecutionReadiness,
        findProvisioningOperationStatus,
        loadExecutionTargetCatalogue,
        runProvisioningExecution,
        verifyImmutableTemplateArtifact,
} from "@dokploy/server";
import { fetchTemplateFiles } from "@dokploy/server/templates/github";
import { TRPCError } from "@trpc/server";

export interface ExecuteAcceptedProvisioningOperationInput {
        organizationId: string;
        operationId: string;
}

export const executeAcceptedProvisioningOperation = async ({
        organizationId,
        operationId,
}: ExecuteAcceptedProvisioningOperationInput) => {
        const targets =
                await loadExecutionTargetCatalogue(
                        organizationId,
                );

        const readiness =
                await evaluateProvisioningExecutionReadiness(
                        organizationId,
                        operationId,
                        targets,
                );

        const baseUrl =
                readiness.target.templateSource.baseUrl;

        if (!baseUrl) {
                throw new TRPCError({
                        code: "CONFLICT",
                        message:
                                "Execution target does not define a trusted template registry URL",
                });
        }

        const current =
                await findProvisioningOperationStatus(
                        organizationId,
                        operationId,
                );

        if (current.operationState !== "accepted") {
                throw new TRPCError({
                        code: "CONFLICT",
                        message:
                                `Operation cannot execute from state ${current.operationState}`,
                });
        }

        const fetched = await fetchTemplateFiles(
                readiness.target.templateSource.templateId,
                baseUrl,
        );

        const artifact =
                verifyImmutableTemplateArtifact(
                        {
                                templateId:
                                        readiness.target.templateSource.templateId,
                                templateVersion:
                                        readiness.target.templateSource.templateVersion,
                                baseUrl,
                        },
                        {
                                metadata:
                                        fetched.config.metadata,
                                dockerCompose:
                                        fetched.dockerCompose,
                        },
                );

        const execution =
                await runProvisioningExecution({
                        readiness,
                        artifact,
                        operationState:
                                current.operationState,
                        existingResourceCount:
                                current.billingService.resources.length,
                });

        await deployCompose({
                composeId: execution.composeId,
                titleLog:
                        "Automated vKloud VPStack deployment",
                descriptionLog:
                        `Provisioning operation ${operationId}`,
        });

        return execution;
};
