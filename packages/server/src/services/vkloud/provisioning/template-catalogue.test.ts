import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExecutionTargetDefinition } from "./execution-target";
import {
	buildTemplateCatalogueResponse,
	templateCatalogueResponseSchema,
} from "./template-catalogue";

const target = (
	overrides: Partial<ExecutionTargetDefinition> = {},
): ExecutionTargetDefinition => ({
	policy: "managed-default",
	adapter: "compose",
	environmentId: "environment-7",
	templateId: "clientops-starter",
	templateVersion: "1.0.3",
	baseUrl: "https://templates.vkloud.example/releases/1.0.3",
	...overrides,
});

describe("template catalogue response", () => {
	it("returns an approved execution target as active", () => {
		const catalogue = buildTemplateCatalogueResponse([target()]);

		assert.deepEqual(catalogue, {
			templates: [
				{
					id: "clientops-starter",
					versions: [
						{
							version: "1.0.3",
							active: true,
						},
					],
				},
			],
		});
	});

	it("groups versions under their template ID", () => {
		const catalogue = buildTemplateCatalogueResponse([
			target({
				policy: "clientops-stable",
				templateVersion: "1.0.2",
			}),
			target({
				policy: "clientops-current",
				templateVersion: "1.0.3",
			}),
		]);

		assert.deepEqual(catalogue.templates[0]?.versions, [
			{
				version: "1.0.2",
				active: true,
			},
			{
				version: "1.0.3",
				active: true,
			},
		]);
	});

	it("deduplicates repeated approved versions", () => {
		const catalogue = buildTemplateCatalogueResponse([
			target({
				policy: "managed-default",
			}),
			target({
				policy: "managed-secondary",
				environmentId: "environment-8",
			}),
		]);

		assert.equal(catalogue.templates[0]?.versions.length, 1);
	});

	it("sorts templates and versions deterministically", () => {
		const catalogue = buildTemplateCatalogueResponse([
			target({
				policy: "zeta-current",
				templateId: "zeta-suite",
				templateVersion: "1.0.10",
			}),
			target({
				policy: "clientops-current",
				templateVersion: "1.0.10",
			}),
			target({
				policy: "clientops-previous",
				templateVersion: "1.0.2",
			}),
		]);

		assert.deepEqual(
			catalogue.templates.map((entry) => entry.id),
			["clientops-starter", "zeta-suite"],
		);

		assert.deepEqual(
			catalogue.templates[0]?.versions.map((entry) => entry.version),
			["1.0.2", "1.0.10"],
		);
	});

	it("returns empty when no target is approved", () => {
		assert.deepEqual(buildTemplateCatalogueResponse([]), {
			templates: [],
		});
	});

	it("exposes only customer-safe fields", () => {
		const catalogue = buildTemplateCatalogueResponse([
			target({
				serverId: "server-7",
			}),
		]);

		const serialized = JSON.stringify(catalogue);

		assert.equal(serialized.includes("policy"), false);

		assert.equal(serialized.includes("environmentId"), false);

		assert.equal(serialized.includes("serverId"), false);

		assert.equal(serialized.includes("baseUrl"), false);

		assert.doesNotThrow(() => templateCatalogueResponseSchema.parse(catalogue));
	});
});
