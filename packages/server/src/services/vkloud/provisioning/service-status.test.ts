import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProvisioningServiceStatus } from "./service-status";

describe("customer-safe provisioning service status", () => {
	it("returns owned resources without infrastructure internals", () => {
		const response = buildProvisioningServiceStatus({
			billingServiceId: "service-42",
			workloadType: "vpstack",
			serviceState: "active",
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
					resourceId: "compose-1",
					resourceType: "compose",
					resourceName: "Primary workload",
					isPrimary: true,
				},
				{
					resourceId: "application-2",
					resourceType: "application",
					resourceName: null,
					isPrimary: false,
				},
			],
		});

		assert.equal(response.state, "active");
		assert.equal(response.resources.length, 2);
		assert.equal(response.resources[0]?.primary, true);
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

	it("rejects infrastructure fields in customer-safe endpoints", () => {
		assert.throws(
			() =>
				buildProvisioningServiceStatus({
					billingServiceId: "service-42",
					workloadType: "vpstack",
					serviceState: "active",
					customerSafeProperties: {
						endpoints: [
							{
								key: "website",
								url: "http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
								primary: true,
								host: "internal.example.invalid",
								port: 80,
								serviceName: "web",
								internalPath: "/",
							},
						],
					},
					resources: [],
				}),
			/Unrecognized keys/,
		);
	});

	it("supports a service before resources are assigned", () => {
		const response = buildProvisioningServiceStatus({
			billingServiceId: "service-42",
			workloadType: "saas",
			serviceState: "pending",
			customerSafeProperties: {},
			resources: [],
		});

		assert.deepEqual(response.resources, []);
	});
});
