import { db } from "@dokploy/server/db";
import { auditLog } from "@dokploy/server/db/schema";
import { redactAuditMetadata } from "./audit-redaction";
import type { CreateVkloudAuditEventInput } from "./audit-types";

export const createVkloudAuditEvent = async (
	input: CreateVkloudAuditEventInput,
) => {
	const metadata = redactAuditMetadata(input.metadata);

	const [created] = await db
		.insert(auditLog)
		.values({
			organizationId: input.organizationId,
			userId: input.actor.userId,
			userEmail: input.actor.email,
			userRole: input.actor.role,
			action: input.action,
			resourceType: input.resourceType,
			resourceId: input.resourceId,
			resourceName: input.resourceName,
			metadata: metadata ? JSON.stringify(metadata) : null,
		})
		.returning({ id: auditLog.id });

	if (!created) {
		throw new Error("Failed to create vKloud audit event");
	}

	return created;
};
