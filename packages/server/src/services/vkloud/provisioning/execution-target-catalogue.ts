import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { executionAdapterSchema } from "./execution-contract";
import type { ExecutionTargetDefinition } from "./execution-target";

const cataloguePolicySchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(
		/^[a-z0-9][a-z0-9-]*$/,
		"Policy must use lowercase letters, numbers and dashes",
	);

const localPlacementSchema = z
	.object({
		type: z.literal("local"),
	})
	.strict();

const remotePlacementSchema = z
	.object({
		type: z.literal("remote"),
		serverId: z.string().trim().min(1).max(255),
	})
	.strict();

export const executionTargetCatalogueEntrySchema = z
	.object({
		organizationId: z.string().trim().min(1).max(255),
		policy: cataloguePolicySchema,
		adapter: executionAdapterSchema,
		environmentId: z.string().trim().min(1).max(255),
		placement: z.discriminatedUnion("type", [
			localPlacementSchema,
			remotePlacementSchema,
		]),
		templateId: z.string().trim().min(1).max(255),
		templateVersion: z.string().trim().min(1).max(255),
		baseUrl: z.url().nullable(),
	})
	.strict();

export type ExecutionTargetCatalogueEntry = z.infer<
	typeof executionTargetCatalogueEntrySchema
>;

export const validateExecutionTargetCatalogue = (
	entries: unknown[],
): ExecutionTargetCatalogueEntry[] => {
	const parsed = entries.map((entry) =>
		executionTargetCatalogueEntrySchema.parse(entry),
	);

	const identities = new Set<string>();

	for (const entry of parsed) {
		const identity = `${entry.organizationId}:${entry.policy}`;

		if (identities.has(identity)) {
			throw new TRPCError({
				code: "CONFLICT",
				message:
					`Execution target policy ${entry.policy} ` +
					"is duplicated for this organization",
			});
		}

		identities.add(identity);
	}

	return parsed;
};

export const toExecutionTargetDefinition = (
	entry: ExecutionTargetCatalogueEntry,
): ExecutionTargetDefinition => ({
	policy: entry.policy,
	adapter: entry.adapter,
	environmentId: entry.environmentId,
	...(entry.placement.type === "remote"
		? { serverId: entry.placement.serverId }
		: {}),
	templateId: entry.templateId,
	templateVersion: entry.templateVersion,
	...(entry.baseUrl ? { baseUrl: entry.baseUrl } : {}),
});
