import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type ExecutionTargetCatalogueRow,
	mapExecutionTargetCatalogueRow,
} from "./execution-target-catalogue-row";

const row = {
	organizationId: "organization-7",
	policy: "managed-default",
	adapter: "compose",
	environmentId: "environment-7",
	placement: "local",
	serverId: null,
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	baseUrl: null,
} satisfies ExecutionTargetCatalogueRow;

describe("execution target catalogue row mapping", () => {
	it("maps an explicit local database row", () => {
		const entry = mapExecutionTargetCatalogueRow(row);

		assert.deepEqual(entry.placement, {
			type: "local",
		});
		assert.equal(entry.policy, "managed-default");
	});

	it("maps an explicit remote database row", () => {
		const entry = mapExecutionTargetCatalogueRow({
			...row,
			placement: "remote",
			serverId: "server-7",
		});

		assert.deepEqual(entry.placement, {
			type: "remote",
			serverId: "server-7",
		});
	});

	it("preserves immutable template matching", () => {
		const entry = mapExecutionTargetCatalogueRow(row);

		assert.equal(entry.templateId, "clientops-starter");
		assert.equal(entry.templateVersion, "1.0.0");
	});

	it("maps an invalid remote row to fail-closed input", () => {
		const entry = mapExecutionTargetCatalogueRow({
			...row,
			placement: "remote",
			serverId: null,
		});

		assert.deepEqual(entry.placement, {
			type: "remote",
			serverId: "",
		});
	});
});
