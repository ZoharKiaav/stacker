import { db } from "@dokploy/server/db";
import { vkloudProvisioningOperation } from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

export const findProvisioningOperationStatus = async (
	organizationId: string,
	operationId: string,
) => {
	const operation = await db.query.vkloudProvisioningOperation.findFirst({
		where: and(
			eq(vkloudProvisioningOperation.organizationId, organizationId),
			eq(vkloudProvisioningOperation.id, operationId),
		),
		with: {
			billingService: {
				with: {
					resources: true,
				},
			},
		},
	});

	if (!operation) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Provisioning operation not found",
		});
	}

	return operation;
};
