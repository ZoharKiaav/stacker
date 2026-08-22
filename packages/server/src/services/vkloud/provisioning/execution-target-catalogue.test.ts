import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	executionTargetCatalogueEntrySchema,
	toExecutionTargetDefinition,
	validateExecutionTargetCatalogue,
} from "./execution-target-catalogue";

const entry = {
	organizationId: "organization-7",
	policy: "managed-default",
	adapter: "compose" as const,
	environmentId: "environment-7",
	placement: {
		type: "local" as const,
	},
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	baseUrl: null,
};

describe("execution target catalogue contract", () => {
	it("accepts an explicit local target", () => {
		const parsed = executionTargetCatalogueEntrySchema.parse(entry);

		assert.equal(parsed.placement.type, "local");

		const definition = toExecutionTargetDefinition(parsed);

		assert.equal(definition.policy, "managed-default");
		assert.equal(definition.environmentId, "environment-7");
		assert.equal(definition.serverId, undefined);
	});

	it("accepts an explicit remote target", () => {
		const parsed = executionTargetCatalogueEntrySchema.parse({
			...entry,
			placement: {
				type: "remote",
				serverId: "server-7",
			},
		});

		const definition = toExecutionTargetDefinition(parsed);

		assert.equal(definition.serverId, "server-7");
	});

	it("rejects a remote target without a server ID", () => {
		assert.throws(() =>
			executionTargetCatalogueEntrySchema.parse({
				...entry,
				placement: {
					type: "remote",
				},
			}),
		);
	});

	it("rejects an implicit placement", () => {
		assert.throws(() =>
			executionTargetCatalogueEntrySchema.parse({
				...entry,
				placement: undefined,
			}),
		);
	});

	it("rejects duplicate policies in one organization", () => {
		assert.throws(
			() => validateExecutionTargetCatalogue([entry, { ...entry }]),
			/duplicated for this organization/,
		);
	});

	it("allows the same policy in another organization", () => {
		const catalogue = validateExecutionTargetCatalogue([
			entry,
			{
				...entry,
				organizationId: "organization-8",
			},
		]);

		assert.equal(catalogue.length, 2);
	});
});
