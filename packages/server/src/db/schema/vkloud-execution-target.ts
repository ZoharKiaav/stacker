import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";
import { organization } from "./account";
import { environments } from "./environment";
import { server } from "./server";

export const vkloudExecutionAdapter = pgEnum("vkloudExecutionAdapter", [
	"compose",
	"application",
]);

export const vkloudExecutionPlacement = pgEnum("vkloudExecutionPlacement", [
	"local",
	"remote",
]);

export const vkloudExecutionTarget = pgTable(
	"vkloud_execution_target",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => nanoid()),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, {
				onDelete: "cascade",
			}),
		policy: text("policy").notNull(),
		adapter: vkloudExecutionAdapter("adapter").notNull(),
		environmentId: text("environment_id")
			.notNull()
			.references(() => environments.environmentId, {
				onDelete: "restrict",
			}),
		placement: vkloudExecutionPlacement("placement").notNull(),
		serverId: text("server_id").references(() => server.serverId, {
			onDelete: "restrict",
		}),
		templateId: text("template_id").notNull(),
		templateVersion: text("template_version").notNull(),
		baseUrl: text("base_url"),
		enabled: boolean("enabled").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("vkloud_execution_target_org_policy_uidx").on(
			table.organizationId,
			table.policy,
		),
		index("vkloud_execution_target_organization_idx").on(table.organizationId),
		check(
			"vkloud_execution_target_placement_check",
			sql`
                (
                    ${table.placement} = 'local'
                    AND ${table.serverId} IS NULL
                )
                OR
                (
                    ${table.placement} = 'remote'
                    AND ${table.serverId} IS NOT NULL
                )
            `,
		),
	],
);

export type VkloudExecutionTarget = typeof vkloudExecutionTarget.$inferSelect;

export type NewVkloudExecutionTarget =
	typeof vkloudExecutionTarget.$inferInsert;
