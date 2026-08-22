import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import type { ProvisioningExecutionPlan } from "./execution-contract";
import { buildExecutionReadiness } from "./execution-readiness-builder";

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

const target = {
	policy: "managed-default",
	adapter: "compose" as const,
	environmentId: "environment-7",
	serverId: "server-7",
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
};

describe("provisioning execution readiness", () => {
	it("combines a dry-run plan with its resolved target", () => {
		const readiness = buildExecutionReadiness(plan, [target]);

		assert.equal(readiness.ready, true);
		assert.equal(readiness.target.environmentId, "environment-7");
		assert.equal(readiness.target.serverId, "server-7");
		assert.equal(readiness.plan.mode, "dry_run");
	});

	it("rejects readiness when the target policy is absent", () => {
		assert.throws(
			() => buildExecutionReadiness(plan, []),
			(error) => error instanceof TRPCError && error.code === "NOT_FOUND",
		);
	});

	it("rejects readiness for an incompatible adapter", () => {
		assert.throws(
			() =>
				buildExecutionReadiness(plan, [
					{
						...target,
						adapter: "application",
					},
				]),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects readiness for another template version", () => {
		assert.throws(
			() =>
				buildExecutionReadiness(plan, [
					{
						...target,
						templateVersion: "2.0.0",
					},
				]),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
