import { db } from "@dokploy/server/db";
import { vkloudProvisioningResource } from "@dokploy/server/db/schema";
import { and, eq } from "drizzle-orm";
import { completeProvisioningOperation } from "./outcome";

export interface CompleteComposeProvisioningOutcomeInput {
        composeId: string;
        outcome: "succeeded" | "failed";
        supportReference: string;
}

export const completeComposeProvisioningOutcome = async ({
        composeId,
        outcome,
        supportReference,
}: CompleteComposeProvisioningOutcomeInput) => {
        const resource =
                await db.query.vkloudProvisioningResource.findFirst({
                        where: and(
                                eq(
                                        vkloudProvisioningResource.resourceType,
                                        "compose",
                                ),
                                eq(
                                        vkloudProvisioningResource.resourceId,
                                        composeId,
                                ),
                        ),
                });

        if (!resource?.createdByOperationId) {
                return {
                        linked: false,
                        duplicate: false,
                };
        }

        const result = await completeProvisioningOperation({
                organizationId: resource.organizationId,
                operationId: resource.createdByOperationId,
                outcome,
                actor: {
                        email: "vkloud-system@localhost",
                        role: "system",
                },
                error:
                        outcome === "failed"
                                ? {
                                                code: "COMPOSE_DEPLOYMENT_FAILED",
                                                category: "execution",
                                                retryable: true,
                                                supportReference,
                                        }
                                : undefined,
        });

        return {
                linked: true,
                duplicate: result.duplicate,
                operationId: resource.createdByOperationId,
                operationState: result.operation.operationState,
                serviceState: result.mapping.serviceState,
        };
};
