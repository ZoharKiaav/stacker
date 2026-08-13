import { db } from "@dokploy/server/db";
import { auditLog } from "@dokploy/server/db/schema";
import { and, desc, eq, gte, ilike, lte } from "drizzle-orm";
import type { VkloudAuditAction, VkloudAuditResourceType } from "./audit-types";

export interface GetVkloudAuditEventsInput {
	organizationId: string;
	userId?: string;
	userEmail?: string;
	resourceName?: string;
	action?: VkloudAuditAction;
	resourceType?: VkloudAuditResourceType;
	from?: Date;
	to?: Date;
	limit?: number;
	offset?: number;
}

export const getVkloudAuditEvents = async (
	input: GetVkloudAuditEventsInput,
) => {
	const {
		organizationId,
		userId,
		userEmail,
		resourceName,
		action,
		resourceType,
		from,
		to,
		limit = 50,
		offset = 0,
	} = input;

	const conditions = [eq(auditLog.organizationId, organizationId)];

	if (userId) {
		conditions.push(eq(auditLog.userId, userId));
	}

	if (userEmail) {
		conditions.push(ilike(auditLog.userEmail, `%${userEmail}%`));
	}

	if (resourceName) {
		conditions.push(ilike(auditLog.resourceName, `%${resourceName}%`));
	}

	if (action) {
		conditions.push(eq(auditLog.action, action));
	}

	if (resourceType) {
		conditions.push(eq(auditLog.resourceType, resourceType));
	}

	if (from) {
		conditions.push(gte(auditLog.createdAt, from));
	}

	if (to) {
		conditions.push(lte(auditLog.createdAt, to));
	}

	const where = and(...conditions);

	const [logs, total] = await Promise.all([
		db.query.auditLog.findMany({
			where,
			orderBy: [desc(auditLog.createdAt)],
			limit,
			offset,
		}),
		db.$count(auditLog, where),
	]);

	return {
		logs,
		total,
		limit,
		offset,
	};
};
