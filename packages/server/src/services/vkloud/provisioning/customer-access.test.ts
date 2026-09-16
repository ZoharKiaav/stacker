import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCustomerAccessPlan } from "./customer-access";
import type { AuthorizedVpstackComposeIntent } from "./vpstack-compose-authorization";

const intent: AuthorizedVpstackComposeIntent = {
	mode: "authorized_intent",
	operationId: "operation-1",
	billingServiceMappingId: "mapping-1",
	contentDigest:
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	access: {
		serviceName: "web",
		port: 80,
		path: "/",
		internalPath: "/",
	},
	compose: {
		name: "clientops-starter",
		description: "Customer access test",
		environmentId: "environment-1",
		composeType: "docker-compose",
		sourceType: "raw",
		composeFile: "services:\n  web:\n    image: nginx:alpine\n",
		appName: "vpstack-0123456789abcdef",
	},
};

describe("VPStack customer access planning", () => {
	it("creates a deterministic HTTP hostname", () => {
		const first = buildCustomerAccessPlan(intent, "188.245.64.152");

		const second = buildCustomerAccessPlan(intent, "188.245.64.152");

		assert.deepEqual(first, second);
		assert.equal(
			first.host,
			"vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
		assert.equal(
			first.primaryUrl,
			"http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
	});

	it("targets the declared Compose service and port", () => {
		const plan = buildCustomerAccessPlan(intent, "188.245.64.152");

		assert.equal(plan.domain.serviceName, "web");
		assert.equal(plan.domain.port, 80);
		assert.equal(plan.domain.domainType, "compose");
		assert.equal(plan.domain.https, false);
		assert.equal(plan.domain.certificateType, "none");
	});

	it("rejects a missing server IP", () => {
		assert.throws(
			() => buildCustomerAccessPlan(intent, null),
			/configured public IPv4 address/,
		);
	});

	it("rejects an invalid server IP", () => {
		assert.throws(
			() => buildCustomerAccessPlan(intent, "not-an-ip"),
			/configured public IPv4 address/,
		);
	});

	it("rejects routing paths without a leading slash", () => {
		assert.throws(
			() =>
				buildCustomerAccessPlan(
					{
						...intent,
						access: {
							...intent.access,
							path: "admin",
						},
					},
					"188.245.64.152",
				),
			/must begin with \//,
		);
	});
});
