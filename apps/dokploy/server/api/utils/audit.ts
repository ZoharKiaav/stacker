import type {
	VkloudAuditAction,
	VkloudAuditResourceType,
} from "@dokploy/server/services/vkloud/audit";
import { createVkloudAuditEvent } from "@dokploy/server/services/vkloud/audit";

interface AuditCtx {
	user: { id: string; email: string; role: string };
	session: { activeOrganizationId: string };
}

interface AuditEvent {
	action: VkloudAuditAction;
	resourceType: VkloudAuditResourceType;
	resourceId?: string;
	resourceName?: string;
	metadata?: Record<string, unknown>;
}

export const audit = (ctx: AuditCtx, event: AuditEvent) =>
	createVkloudAuditEvent({
		organizationId: ctx.session.activeOrganizationId,
		actor: {
			userId: ctx.user.id,
			email: ctx.user.email,
			role: ctx.user.role,
		},
		...event,
	});
