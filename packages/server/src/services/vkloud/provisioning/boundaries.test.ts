import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { provisioningRequestSchema } from "./contract";
import { createProvisioningRequestFingerprint } from "./idempotency";
import { provisioningResponseSchema } from "./response";

describe("provisioning contract boundaries", () => {
	it("creates the same fingerprint when nested object keys are reordered", () => {
		const first = provisioningRequestSchema.parse({
			contractVersion: "v1",
			operation: "deploy",
			idempotencyKey: "key-one",
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
				nested: {
					alpha: 1,
					beta: 2,
				},
			},
			context: {
				requestedBy: "vpay",
				reason: "payment_confirmed",
			},
		});

		const second = provisioningRequestSchema.parse({
			contractVersion: "v1",
			operation: "deploy",
			idempotencyKey: "key-two",
			billing: {
				serviceId: "service-42",
				customerId: "customer-7",
			},
			product: {
				templateVersion: "1.0.0",
				templateId: "clientops-starter",
				productId: "clientops",
				workloadType: "vpstack",
			},
			requestedConfiguration: {
				nested: {
					beta: 2,
					alpha: 1,
				},
				domain: "customer.example.com",
			},
			context: {
				reason: "payment_confirmed",
				requestedBy: "vpay",
			},
		});

		assert.equal(
			createProvisioningRequestFingerprint(first),
			createProvisioningRequestFingerprint(second),
		);
	});

	it("accepts a customer-safe asynchronous response", () => {
		const result = provisioningResponseSchema.safeParse({
			contractVersion: "v1",
			operationId: "operation-123",
			billingServiceId: "service-42",
			state: "accepted",
			duplicate: false,
			resource: {
				resourceId: null,
				workloadType: "vpstack",
			},
			customerSafe: {
				displayName: "ClientOps Starter",
			},
			error: null,
		});

		assert.equal(result.success, true);
	});

	it("rejects unsupported fields from strict customer-safe properties", () => {
		const result = provisioningResponseSchema.strict().safeParse({
			contractVersion: "v1",
			operationId: "operation-123",
			billingServiceId: "service-42",
			state: "failed",
			duplicate: false,
			resource: {
				resourceId: null,
				workloadType: "saas",
			},
			customerSafe: {
				displayName: "Example SaaS",
			},
			error: {
				code: "DEPLOYMENT_FAILED",
				category: "execution",
				retryable: true,
				customerMessage: "We could not activate this service yet.",
				operationId: "operation-123",
				supportReference: "support-456",
			},
			internalLogs: "must not cross the contract boundary",
		});

		assert.equal(result.success, false);
	});
});
