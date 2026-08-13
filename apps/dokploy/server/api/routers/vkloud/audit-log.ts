import {
	getVkloudAuditEvents,
	VKLOUD_AUDIT_ACTIONS,
	VKLOUD_AUDIT_RESOURCE_TYPES,
} from "@dokploy/server/services/vkloud/audit";
import { z } from "zod";
import { createTRPCRouter, withPermission } from "../../trpc";

export const auditLogRouter = createTRPCRouter({
	all: withPermission("auditLog", "read")
		.input(
			z.object({
				userId: z.string().optional(),
				userEmail: z.string().optional(),
				resourceName: z.string().optional(),
				action: z.enum(VKLOUD_AUDIT_ACTIONS).optional(),
				resourceType: z.enum(VKLOUD_AUDIT_RESOURCE_TYPES).optional(),
				from: z.date().optional(),
				to: z.date().optional(),
				limit: z.number().int().min(1).max(500).default(50),
				offset: z.number().int().min(0).default(0),
			}),
		)
		.query(({ ctx, input }) =>
			getVkloudAuditEvents({
				organizationId: ctx.session.activeOrganizationId,
				...input,
			}),
		),
});
