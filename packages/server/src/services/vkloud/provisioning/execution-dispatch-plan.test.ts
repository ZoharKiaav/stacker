import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { buildDryRunDispatchPlan } from "./execution-dispatch-plan";

const baseInput = {
	organizationId: "organization-7",
	operationId: "operation-42",
	billingServiceMappingId: "mapping-42",
	operation: "deploy" as const,
	operationState: "accepted" as const,
	workloadType: "vpstack" as const,
	productId: "clientops",
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	targetPolicy: "managed-default",
};

describe("provisioning dry-run dispatch", () => {
	it("builds a Compose plan for an accepted VPStack", () => {
		const plan = buildDryRunDispatchPlan(baseInput);

		assert.equal(plan.mode, "dry_run");
		assert.equal(plan.adapter, "compose");
		assert.equal(plan.operationId, "operation-42");
	});

	it("builds an Application plan for SaaS", () => {
		const plan = buildDryRunDispatchPlan({
			...baseInput,
			workloadType: "saas",
		});

		assert.equal(plan.adapter, "application");
	});

	it("rejects dispatch after the operation has started", () => {
		assert.throws(
			() =>
				buildDryRunDispatchPlan({
					...baseInput,
					operationState: "running",
				}),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
