export const VKLOUD_AUDIT_ACTIONS = [
	"create",
	"update",
	"delete",
	"deploy",
	"cancel",
	"redeploy",
	"login",
	"logout",
	"restore",
	"run",
	"start",
	"stop",
	"reload",
	"rebuild",
	"move",
	"provision",
	"suspend",
	"unsuspend",
	"terminate",
	"rotateCredentials",
	"healthCheck",
] as const;

export const VKLOUD_AUDIT_RESOURCE_TYPES = [
	"project",
	"service",
	"environment",
	"deployment",
	"user",
	"customRole",
	"domain",
	"certificate",
	"registry",
	"server",
	"sshKey",
	"gitProvider",
	"destination",
	"notification",
	"settings",
	"session",
	"port",
	"redirect",
	"security",
	"schedule",
	"backup",
	"volumeBackup",
	"docker",
	"swarm",
	"previewDeployment",
	"organization",
	"cluster",
	"mount",
	"application",
	"compose",
	"product",
	"template",
	"provisioningOperation",
	"billingService",
	"credential",
] as const;

export type VkloudAuditAction = (typeof VKLOUD_AUDIT_ACTIONS)[number];

export type VkloudAuditResourceType =
	(typeof VKLOUD_AUDIT_RESOURCE_TYPES)[number];

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
