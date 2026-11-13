import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProvisioningStatusResponse } from "./status-response";

const mapping = {
	billingServiceId: "service-42",
	workloadType: "vpstack" as const,
	customerSafeProperties: {
		displayName: "Client Operations",
		primaryUrl: "http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		endpoints: [
			{
				key: "website",
				url: "http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
				primary: true,
			},
			{
				key: "support",
				url: "http://support-vpstack-0123456789abcdef-188-245-64-152.sslip.io",
				primary: false,
			},
		],
	},
	resources: [
		{
			resourceId: "compose-secondary",
			isPrimary: false,
		},
		{
			resourceId: "compose-primary",
			isPrimary: true,
		},
	],
};

describe("customer-safe provisioning status", () => {
	it("returns the primary resource without infrastructure details", () => {
		const response = buildProvisioningStatusResponse({
			operation: {
				id: "operation-1",
				operationState: "running",
				safeErrorCode: null,
				safeErrorCategory: null,
				retryable: false,
				supportReference: null,
			},
			mapping,
		});

		assert.equal(response.resource.resourceId, "compose-primary");
		assert.equal(response.error, null);
		assert.equal(
			response.customerSafe.primaryUrl,
			"http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
		assert.deepEqual(response.customerSafe.endpoints, [
			{
				key: "website",
				url: "http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
				primary: true,
			},
			{
				key: "support",
				url: "http://support-vpstack-0123456789abcdef-188-245-64-152.sslip.io",
				primary: false,
			},
		]);
	});

	it("returns a customer-safe failed operation", () => {
		const response = buildProvisioningStatusResponse({
			operation: {
				id: "operation-2",
				operationState: "failed",
				safeErrorCode: "DEPENDENCY_UNAVAILABLE",
				safeErrorCategory: "dependency",
				retryable: true,
				supportReference: "support-42",
			},
			mapping,
		});

		assert.equal(response.error?.code, "DEPENDENCY_UNAVAILABLE");
		assert.equal(response.error?.retryable, true);
		assert.equal(response.error?.supportReference, "support-42");
	});

	it("returns no resource before infrastructure is assigned", () => {
		const response = buildProvisioningStatusResponse({
			operation: {
				id: "operation-3",
				operationState: "accepted",
				safeErrorCode: null,
				safeErrorCategory: null,
				retryable: false,
				supportReference: null,
			},
			mapping: {
				...mapping,
				resources: [],
			},
		});

		assert.equal(response.resource.resourceId, null);
	});
});
