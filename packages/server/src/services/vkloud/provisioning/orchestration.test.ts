import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { provisioningRequestSchema } from "./contract";
import { matchesProvisioningProduct } from "./orchestration-decisions";

const request = provisioningRequestSchema.parse({
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
	requestedConfiguration: {},
	context: {
		requestedBy: "vpay",
		reason: "payment_confirmed",
	},
});

const mapping = {
	billingCustomerId: "customer-7",
	workloadType: "vpstack",
	productId: "clientops",
	templateId: "clientops-starter",
	templateVersion: "1.0.0",
	targetPolicy: "managed-default",
};

describe("provisioning orchestration decisions", () => {
	it("accepts an exact billing and product mapping", () => {
		assert.equal(
			matchesProvisioningProduct(mapping, request, "managed-default"),
			true,
		);
	});

	it("rejects a different billing customer", () => {
		assert.equal(
			matchesProvisioningProduct(
				{
					...mapping,
					billingCustomerId: "another-customer",
				},
				request,
				"managed-default",
			),
			false,
		);
	});

	it("rejects a changed template version", () => {
		assert.equal(
			matchesProvisioningProduct(
				{
					...mapping,
					templateVersion: "2.0.0",
				},
				request,
				"managed-default",
			),
			false,
		);
	});

	it("rejects a different target policy", () => {
		assert.equal(
			matchesProvisioningProduct(mapping, request, "another-policy"),
			false,
		);
	});
});
