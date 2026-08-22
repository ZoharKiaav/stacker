import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExecutionReadiness } from "./execution-readiness";
import type { ImmutableTemplateArtifact } from "./immutable-template-artifact";
import {
	authorizeVpstackComposeIntent,
	DISPOSABLE_EXECUTION_AUTHORIZATION,
} from "./vpstack-compose-authorization";

const readiness: ExecutionReadiness = {
	ready: true,
	plan: {
		mode: "dry_run",
		organizationId: "TGjxG21mBbRRCX4MtHiSx",
		operationId: "-3M6dFwnmgyM5-pIN_63l",
		billingServiceMappingId: "y7Hd5welUMIp1TULx8kWL",
		workloadType: "vpstack",
		operation: "deploy",
		adapter: "compose",
		productId: "clientops",
		templateId: "clientops-starter",
		templateVersion: "1.0.0",
		targetPolicy: "managed-default",
	},
	target: {
		policy: "managed-default",
		adapter: "compose",
		environmentId: "wyUymmRoaRR4fM35YQLNC",
		serverId: null,
		templateSource: {
			templateId: "clientops-starter",
			templateVersion: "1.0.0",
			baseUrl: "https://templates.vkloud.example/releases/1.0.0",
		},
	},
};

const artifact: ImmutableTemplateArtifact = {
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	baseUrl: "https://templates.vkloud.example/releases/1.0.0",
	dockerCompose: "services:\n  app:\n    image: example/app:1.0.0\n",
	contentDigest:
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
};

const authorize = (
	overrides: Partial<Parameters<typeof authorizeVpstackComposeIntent>[0]> = {},
) =>
	authorizeVpstackComposeIntent({
		readiness,
		artifact,
		operationState: "accepted",
		existingResourceCount: 0,
		authorization: DISPOSABLE_EXECUTION_AUTHORIZATION,
		...overrides,
	});

describe("VPStack Compose execution authorization", () => {
	it("builds an apiCreateCompose-compatible inert intent", () => {
		const intent = authorize();

		assert.equal(intent.mode, "authorized_intent");
		assert.equal(intent.compose.sourceType, "raw");
		assert.equal(intent.compose.composeType, "docker-compose");
		assert.equal(intent.compose.environmentId, "wyUymmRoaRR4fM35YQLNC");
		assert.equal(intent.compose.serverId, undefined);
	});

	it("creates a deterministic application name", () => {
		assert.equal(authorize().compose.appName, authorize().compose.appName);
	});

	it("rejects missing explicit authorization", () => {
		assert.throws(
			() => authorize({ authorization: "" }),
			/not explicitly authorized/,
		);
	});

	it("rejects a non-accepted operation", () => {
		assert.throws(
			() => authorize({ operationState: "running" }),
			/accepted deploy/,
		);
	});

	it("rejects existing provisioning resources", () => {
		assert.throws(
			() => authorize({ existingResourceCount: 1 }),
			/already owns provisioning resources/,
		);
	});

	it("rejects another template version", () => {
		assert.throws(() =>
			authorize({
				artifact: {
					...artifact,
					templateVersion: "2.0.0",
				},
			}),
		);
	});

	it("rejects another registry URL", () => {
		assert.throws(() =>
			authorize({
				artifact: {
					...artifact,
					baseUrl: "https://templates.vkloud.example/releases/other",
				},
			}),
		);
	});

	it("contains no deployment instruction", () => {
		const serialized = JSON.stringify(authorize());

		assert.equal(serialized.includes("deployCompose"), false);
		assert.equal(serialized.includes("startCompose"), false);
	});
});
