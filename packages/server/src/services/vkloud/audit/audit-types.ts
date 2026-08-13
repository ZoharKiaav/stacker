import type { AuditAction, AuditResourceType } from "@dokploy/server/db/schema";

export type VkloudAuditAction =
	| AuditAction
	| "provision"
	| "suspend"
	| "unsuspend"
	| "terminate"
	| "rotateCredentials"
	| "healthCheck";

export type VkloudAuditResourceType =
	| AuditResourceType
	| "product"
	| "template"
	| "provisioningOperation"
	| "billingService"
	| "credential";

export interface VkloudAuditActor {
	userId?: string;
	email: string;
	role: string;
}

export interface CreateVkloudAuditEventInput {
	organizationId: string;
	actor: VkloudAuditActor;
	action: VkloudAuditAction;
	resourceType: VkloudAuditResourceType;
	resourceId?: string;
	resourceName?: string;
	metadata?: Record<string, unknown>;
}
