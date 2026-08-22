import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import {
	createDryRunPlanner,
	ProvisioningExecutionPlannerRegistry,
} from "./execution-planner";

const input = {
	organizationId: "organization-7",
	operationId: "operation-42",
	billingServiceMappingId: "mapping-42",
	workloadType: "vpstack" as const,
	operation: "deploy" as const,
	adapter: "compose" as const,
	productId: "clientops",
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	targetPolicy: "managed-default",
};

describe("provisioning execution planning", () => {
	it("creates an inert dry-run plan", () => {
		const registry = new ProvisioningExecutionPlannerRegistry();

		registry.register(createDryRunPlanner("compose", ["vpstack"]));

		const plan = registry.plan(input);

		assert.equal(plan.mode, "dry_run");
		assert.equal(plan.adapter, "compose");
		assert.equal(plan.operation, "deploy");
		assert.equal(plan.targetPolicy, "managed-default");
	});

	it("rejects an unregistered execution adapter", () => {
		const registry = new ProvisioningExecutionPlannerRegistry();

		assert.throws(
			() => registry.plan(input),
			(error) => error instanceof TRPCError && error.code === "NOT_FOUND",
		);
	});

	it("rejects an unsupported workload", () => {
		const registry = new ProvisioningExecutionPlannerRegistry();

		registry.register(createDryRunPlanner("compose", ["saas"]));

		assert.throws(
			() => registry.plan(input),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects duplicate planner registration", () => {
		const registry = new ProvisioningExecutionPlannerRegistry();

		registry.register(createDryRunPlanner("compose", ["vpstack"]));

		assert.throws(
			() => registry.register(createDryRunPlanner("compose", ["vpstack"])),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
