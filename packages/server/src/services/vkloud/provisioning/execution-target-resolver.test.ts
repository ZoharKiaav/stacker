import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import type { ProvisioningExecutionPlan } from "./execution-contract";
import { ExecutionTargetResolver } from "./execution-target-resolver";

const plan: ProvisioningExecutionPlan = {
	mode: "dry_run",
	organizationId: "organization-7",
	operationId: "operation-42",
	billingServiceMappingId: "mapping-42",
	workloadType: "vpstack",
	operation: "deploy",
	adapter: "compose",
	productId: "clientops",
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	targetPolicy: "managed-default",
};

const definition = {
	policy: "managed-default",
	adapter: "compose" as const,
	environmentId: "environment-7",
	serverId: "server-7",
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
};

describe("provisioning execution target resolution", () => {
	it("resolves a server-controlled target", () => {
		const resolver = new ExecutionTargetResolver();
		resolver.register(definition);

		const target = resolver.resolve(plan);

		assert.equal(target.environmentId, "environment-7");
		assert.equal(target.serverId, "server-7");
		assert.equal(target.policy, "managed-default");
	});

	it("supports the local server when no server ID is configured", () => {
		const resolver = new ExecutionTargetResolver();

		resolver.register({
			...definition,
			serverId: undefined,
		});

		assert.equal(resolver.resolve(plan).serverId, null);
	});

	it("rejects an unconfigured policy", () => {
		const resolver = new ExecutionTargetResolver();

		assert.throws(
			() => resolver.resolve(plan),
			(error) => error instanceof TRPCError && error.code === "NOT_FOUND",
		);
	});

	it("rejects an incompatible adapter", () => {
		const resolver = new ExecutionTargetResolver();

		resolver.register({
			...definition,
			adapter: "application",
		});

		assert.throws(
			() => resolver.resolve(plan),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects a different template version", () => {
		const resolver = new ExecutionTargetResolver();

		resolver.register({
			...definition,
			templateVersion: "2.0.0",
		});

		assert.throws(
			() => resolver.resolve(plan),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects duplicate policy registration", () => {
		const resolver = new ExecutionTargetResolver();
		resolver.register(definition);

		assert.throws(
			() => resolver.register(definition),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
