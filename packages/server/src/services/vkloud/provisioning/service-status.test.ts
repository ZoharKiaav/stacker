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
