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
	access: [
		{
			key: "support",
			serviceName: "support",
			port: 8080,
			path: "/support",
			internalPath: "/",
			suggestedSubdomain: "support",
			primary: false,
		},
		{
			key: "website",
			serviceName: "web",
			port: 80,
			path: "/",
			internalPath: "/",
			suggestedSubdomain: "www",
			primary: true,
		},
	],
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

	it("targets the declared primary Compose service and port", () => {
		const plan = buildCustomerAccessPlan(intent, "188.245.64.152");

		assert.equal(plan.domain.serviceName, "web");
		assert.equal(plan.domain.port, 80);
		assert.equal(plan.domain.path, "/");
		assert.equal(plan.domain.domainType, "compose");
		assert.equal(plan.domain.https, false);
		assert.equal(plan.domain.certificateType, "none");
	});

	it("does not select a non-primary endpoint", () => {
		const plan = buildCustomerAccessPlan(intent, "188.245.64.152");

		assert.notEqual(plan.domain.serviceName, "support");
		assert.notEqual(plan.domain.port, 8080);
	});

	it("rejects access without a primary endpoint", () => {
		assert.throws(
			() =>
				buildCustomerAccessPlan(
					{
						...intent,
						access: intent.access.map((endpoint) => ({
							...endpoint,
							primary: false,
						})),
					},
					"188.245.64.152",
				),
			/requires one primary endpoint/,
		);
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
						access: intent.access.map((endpoint) =>
							endpoint.primary
								? {
										...endpoint,
										path: "admin",
									}
								: endpoint,
						),
					},
					"188.245.64.152",
				),
			/must begin with \//,
		);
	});
});
