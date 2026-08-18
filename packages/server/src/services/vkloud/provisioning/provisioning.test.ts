import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getProvisioningAuditMapping } from "./audit";
import { provisioningRequestSchema } from "./contract";
import { createProvisioningRequestFingerprint } from "./idempotency";
import {
	canBeginLifecycleOperation,
	startingStateForOperation,
	successfulStateForOperation,
} from "./lifecycle";

const validRequest = {
	contractVersion: "v1",
	operation: "deploy",
	idempotencyKey: "vpay:service-42:deploy:1",
	billing: {
		customerId: "customer-7",
		serviceId: "service-42",
	},
	product: {
		workloadType: "vpstack",
		productId: "clientops",
		templateId: "clientops-starter",
		templateVersion: "1.0.0",
	},
	requestedConfiguration: {
		domain: "customer.example.com",
	},
	context: {
		requestedBy: "vpay",
		reason: "payment_confirmed",
	},
} as const;

describe("provisioning contract", () => {
	it("accepts a valid deployment request", () => {
		assert.equal(
			provisioningRequestSchema.safeParse(validRequest).success,
			true,
		);
	});

	it("rejects unsupported workload types", () => {
		const result = provisioningRequestSchema.safeParse({
			...validRequest,
			product: {
				...validRequest.product,
				workloadType: "traditional-hosting",
			},
		});

		assert.equal(result.success, false);
	});

	it("creates deterministic fingerprints independent of object key order", () => {
		const first = provisioningRequestSchema.parse(validRequest);
		const second = provisioningRequestSchema.parse({
			...validRequest,
			requestedConfiguration: {
				domain: "customer.example.com",
			},
		});

		assert.equal(
			createProvisioningRequestFingerprint(first),
			createProvisioningRequestFingerprint(second),
		);
	});

	it("does not include the idempotency key in the request fingerprint", () => {
		const first = provisioningRequestSchema.parse(validRequest);
		const second = provisioningRequestSchema.parse({
			...validRequest,
			idempotencyKey: "different-key",
		});

		assert.equal(
			createProvisioningRequestFingerprint(first),
			createProvisioningRequestFingerprint(second),
		);
	});

	it("enforces lifecycle entry rules", () => {
		assert.equal(canBeginLifecycleOperation("pending", "deploy"), true);
		assert.equal(canBeginLifecycleOperation("active", "suspend"), true);
		assert.equal(canBeginLifecycleOperation("active", "deploy"), false);
		assert.equal(
			canBeginLifecycleOperation("terminated", "health_check"),
			false,
		);
	});

	it("maps lifecycle operations to transitional and successful states", () => {
		assert.equal(startingStateForOperation("deploy"), "provisioning");
		assert.equal(successfulStateForOperation("deploy"), "active");
		assert.equal(startingStateForOperation("suspend"), "suspending");
		assert.equal(successfulStateForOperation("suspend"), "suspended");
	});

	it("maps lifecycle actions to vKloud audit vocabulary", () => {
		assert.deepEqual(getProvisioningAuditMapping("deploy"), {
			action: "provision",
			resourceType: "provisioningOperation",
		});

		assert.deepEqual(getProvisioningAuditMapping("terminate"), {
			action: "terminate",
			resourceType: "billingService",
		});
	});
});
