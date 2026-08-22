import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { organization } from "./account";

export const vkloudWorkloadType = pgEnum("vkloudWorkloadType", [
	"saas",
	"vpstack",
]);

export const vkloudServiceState = pgEnum("vkloudServiceState", [
	"pending",
	"provisioning",
	"active",
	"suspending",
	"suspended",
	"unsuspending",
	"terminating",
	"terminated",
	"failed",
	"reconciling",
]);

export const vkloudProvisioningOperationType = pgEnum(
	"vkloudProvisioningOperationType",
	[
		"deploy",
		"status",
		"suspend",
		"unsuspend",
		"terminate",
		"rotate_credentials",
		"health_check",
	],
);

export const vkloudProvisioningErrorCategory = pgEnum(
	"vkloudProvisioningErrorCategory",
	[
		"validation",
		"authentication",
		"authorization",
		"conflict",
		"capacity",
		"dependency",
		"execution",
		"health",
		"internal",
	],
);

export const vkloudProvisioningOperationState = pgEnum(
	"vkloudProvisioningOperationState",
	["accepted", "running", "succeeded", "failed", "cancelled"],
);

export const vkloudBillingService = pgTable(
	"vkloud_billing_service",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		billingSource: text("billing_source").notNull().default("vpay"),
		billingCustomerId: text("billing_customer_id").notNull(),
		billingServiceId: text("billing_service_id").notNull(),
		workloadType: vkloudWorkloadType("workload_type").notNull(),
		productId: text("product_id").notNull(),
		templateId: text("template_id").notNull(),
		templateVersion: text("template_version").notNull(),
		targetPolicy: text("target_policy").notNull(),
		serviceState: vkloudServiceState("service_state")
			.notNull()
			.default("pending"),
		customerSafeProperties: jsonb("customer_safe_properties")
			.$type<Record<string, unknown>>()
			.notNull()
			.default({}),
		lastReconciledAt: timestamp("last_reconciled_at"),
		terminatedAt: timestamp("terminated_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		billingServiceUnique: uniqueIndex(
			"vkloud_billing_service_identity_uidx",
		).on(table.organizationId, table.billingSource, table.billingServiceId),
		organizationIdx: index("vkloud_billing_service_organization_idx").on(
			table.organizationId,
		),
		stateIdx: index("vkloud_billing_service_state_idx").on(table.serviceState),
	}),
);

export const vkloudProvisioningOperation = pgTable(
	"vkloud_provisioning_operation",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		billingServiceMappingId: text("billing_service_mapping_id")
			.notNull()
			.references(() => vkloudBillingService.id, {
				onDelete: "restrict",
			}),
		operation: vkloudProvisioningOperationType("operation").notNull(),
		operationState: vkloudProvisioningOperationState("operation_state")
			.notNull()
			.default("accepted"),
		idempotencyKey: text("idempotency_key").notNull(),
		requestFingerprint: text("request_fingerprint").notNull(),
		safeErrorCode: text("safe_error_code"),
		safeErrorCategory: vkloudProvisioningErrorCategory("safe_error_category"),
		retryable: boolean("retryable").notNull().default(false),
		supportReference: text("support_reference"),
		attempt: integer("attempt").notNull().default(1),
		startedAt: timestamp("started_at"),
		completedAt: timestamp("completed_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		idempotencyUnique: uniqueIndex(
			"vkloud_provisioning_operation_idempotency_uidx",
		).on(table.organizationId, table.idempotencyKey),
		serviceIdx: index("vkloud_provisioning_operation_service_idx").on(
			table.billingServiceMappingId,
		),
		stateIdx: index("vkloud_provisioning_operation_state_idx").on(
			table.operationState,
		),
	}),
);

export const vkloudProvisioningResource = pgTable(
	"vkloud_provisioning_resource",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		billingServiceMappingId: text("billing_service_mapping_id")
			.notNull()
			.references(() => vkloudBillingService.id, {
				onDelete: "restrict",
			}),
		createdByOperationId: text("created_by_operation_id").references(
			() => vkloudProvisioningOperation.id,
			{ onDelete: "set null" },
		),
		resourceType: text("resource_type").notNull(),
		resourceId: text("resource_id").notNull(),
		resourceName: text("resource_name"),
		isPrimary: boolean("is_primary").notNull().default(false),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => ({
		resourceUnique: uniqueIndex(
			"vkloud_provisioning_resource_identity_uidx",
		).on(table.organizationId, table.resourceType, table.resourceId),
		serviceIdx: index("vkloud_provisioning_resource_service_idx").on(
			table.billingServiceMappingId,
		),
		organizationIdx: index("vkloud_provisioning_resource_organization_idx").on(
			table.organizationId,
		),
		createdByOperationIdx: index(
			"vkloud_provisioning_resource_operation_idx",
		).on(table.createdByOperationId),
	}),
);

export const vkloudBillingServiceRelations = relations(
	vkloudBillingService,
	({ one, many }) => ({
		organization: one(organization, {
			fields: [vkloudBillingService.organizationId],
			references: [organization.id],
		}),
		operations: many(vkloudProvisioningOperation),
		resources: many(vkloudProvisioningResource),
	}),
);

export const vkloudProvisioningOperationRelations = relations(
	vkloudProvisioningOperation,
	({ one }) => ({
		billingService: one(vkloudBillingService, {
			fields: [vkloudProvisioningOperation.billingServiceMappingId],
			references: [vkloudBillingService.id],
		}),
		organization: one(organization, {
			fields: [vkloudProvisioningOperation.organizationId],
			references: [organization.id],
		}),
	}),
);

export const vkloudProvisioningResourceRelations = relations(
	vkloudProvisioningResource,
	({ one }) => ({
		billingService: one(vkloudBillingService, {
			fields: [vkloudProvisioningResource.billingServiceMappingId],
			references: [vkloudBillingService.id],
		}),
		organization: one(organization, {
			fields: [vkloudProvisioningResource.organizationId],
			references: [organization.id],
		}),
		createdByOperation: one(vkloudProvisioningOperation, {
			fields: [vkloudProvisioningResource.createdByOperationId],
			references: [vkloudProvisioningOperation.id],
		}),
	}),
);

export type VkloudBillingService = typeof vkloudBillingService.$inferSelect;
export type NewVkloudBillingService = typeof vkloudBillingService.$inferInsert;

export type VkloudProvisioningOperation =
	typeof vkloudProvisioningOperation.$inferSelect;
export type NewVkloudProvisioningOperation =
	typeof vkloudProvisioningOperation.$inferInsert;

export type VkloudProvisioningResource =
	typeof vkloudProvisioningResource.$inferSelect;
export type NewVkloudProvisioningResource =
	typeof vkloudProvisioningResource.$inferInsert;
