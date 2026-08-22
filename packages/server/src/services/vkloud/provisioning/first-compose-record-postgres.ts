import { db } from "@dokploy/server/db";
import {
        compose,
        vkloudBillingService,
        vkloudProvisioningOperation,
        vkloudProvisioningResource,
} from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import {
        type FirstComposeRecordStore,
        type PersistFirstComposeRecordInput,
        persistFirstComposeRecord,
} from "./first-compose-record";

export const persistFirstComposeRecordPostgres = async (
        input: PersistFirstComposeRecordInput,
) =>
        await db.transaction(async (tx) => {
                const store: FirstComposeRecordStore = {
                        async lockBillingService(
                                organizationId,
                                billingServiceMappingId,
                        ) {
                                const mapping =
                                        await tx.query.vkloudBillingService.findFirst({
                                                where: and(
                                                        eq(
                                                                vkloudBillingService.id,
                                                                billingServiceMappingId,
                                                        ),
                                                        eq(
                                                                vkloudBillingService.organizationId,
                                                                organizationId,
                                                        ),
                                                ),
                                        });

                                if (!mapping) {
                                        throw new TRPCError({
                                                code: "NOT_FOUND",
                                                message:
                                                        "Billing-service mapping not found",
                                        });
                                }

                                const operation =
                                        await tx.query.vkloudProvisioningOperation.findFirst({
                                                where: and(
                                                        eq(
                                                                vkloudProvisioningOperation.id,
                                                                input.intent.operationId,
                                                        ),
                                                        eq(
                                                                vkloudProvisioningOperation.organizationId,
                                                                organizationId,
                                                        ),
                                                        eq(
                                                                vkloudProvisioningOperation.billingServiceMappingId,
                                                                billingServiceMappingId,
                                                        ),
                                                ),
                                        });

                                if (!operation) {
                                        throw new TRPCError({
                                                code: "NOT_FOUND",
                                                message:
                                                        "Authorising provisioning operation not found",
                                        });
                                }

                                if (
                                        operation.operation !== "deploy" ||
                                        operation.operationState !== "accepted"
                                ) {
                                        throw new TRPCError({
                                                code: "CONFLICT",
                                                message:
                                                        "Only an accepted deploy operation may create the first Compose record",
                                        });
                                }
                        },

                        async findExistingComposeResource(
                                organizationId,
                                billingServiceMappingId,
                        ) {
                                const existing =
                                        await tx.query.vkloudProvisioningResource.findFirst({
                                                where: and(
                                                        eq(
                                                                vkloudProvisioningResource.organizationId,
                                                                organizationId,
                                                        ),
                                                        eq(
                                                                vkloudProvisioningResource.billingServiceMappingId,
                                                                billingServiceMappingId,
                                                        ),
                                                        eq(
                                                                vkloudProvisioningResource.resourceType,
                                                                "compose",
                                                        ),
                                                ),
                                        });

                                return existing
                                        ? {
                                                        resourceId: existing.resourceId,
                                                        resourceName: existing.resourceName,
                                                }
                                        : null;
                        },

                        async createCompose(composeInput) {
                                const created = await tx
                                        .insert(compose)
                                        .values({
                                                name: composeInput.name,
                                                description: composeInput.description,
                                                environmentId: composeInput.environmentId,
                                                serverId: composeInput.serverId ?? null,
                                                composeType: composeInput.composeType,
                                                sourceType: composeInput.sourceType,
                                                composeFile: composeInput.composeFile,
                                                appName: composeInput.appName,
                                                composeStatus: "idle",
                                                autoDeploy: false,
                                        })
                                        .returning({
                                                composeId: compose.composeId,
                                                name: compose.name,
                                        })
                                        .then((rows) => rows[0]);

                                if (!created) {
                                        throw new TRPCError({
                                                code: "BAD_REQUEST",
                                                message:
                                                        "Unable to create inert Compose record",
                                        });
                                }

                                return created;
                        },

                        async registerPrimaryResource(resourceInput) {
                                const created = await tx
                                        .insert(vkloudProvisioningResource)
                                        .values({
                                                organizationId:
                                                        resourceInput.organizationId,
                                                billingServiceMappingId:
                                                        resourceInput.billingServiceMappingId,
                                                createdByOperationId:
                                                        resourceInput.operationId,
                                                resourceType: "compose",
                                                resourceId:
                                                        resourceInput.resourceId,
                                                resourceName:
                                                        resourceInput.resourceName,
                                                isPrimary: true,
                                        })
                                        .returning({
                                                id: vkloudProvisioningResource.id,
                                        })
                                        .then((rows) => rows[0]);

                                if (!created) {
                                        throw new TRPCError({
                                                code: "BAD_REQUEST",
                                                message:
                                                        "Unable to register Compose provisioning resource",
                                        });
                                }
                        },
                };

                return persistFirstComposeRecord(store, input);
        });
