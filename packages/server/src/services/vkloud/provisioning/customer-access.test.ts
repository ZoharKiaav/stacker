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

const serverIp = "188.245.64.152";

describe("VPStack customer access planning", () => {
	it("creates a deterministic multi-endpoint plan", () => {
		const first = buildCustomerAccessPlan(intent, serverIp);
		const second = buildCustomerAccessPlan(intent, serverIp);

		assert.deepEqual(first, second);
		assert.equal(first.endpoints.length, 2);
	});

	it("retains the primary hostname and URL compatibility aliases", () => {
		const plan = buildCustomerAccessPlan(intent, serverIp);

		assert.equal(plan.host, "vpstack-0123456789abcdef-188-245-64-152.sslip.io");
		assert.equal(
			plan.primaryUrl,
			"http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
		assert.equal(plan.domain.serviceName, "web");
		assert.equal(plan.domain.port, 80);
		assert.equal(plan.domain.path, "/");
	});

	it("creates a named hostname for a secondary endpoint", () => {
		const plan = buildCustomerAccessPlan(intent, serverIp);
		const support = plan.endpoints.find(
			(endpoint) => endpoint.key === "support",
		);

		assert.ok(support);
		assert.equal(
			support.host,
			"support-vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
		assert.equal(
			support.url,
			"http://support-vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
		assert.equal(support.domain.serviceName, "support");
		assert.equal(support.domain.port, 8080);
		assert.equal(support.domain.path, "/support");
		assert.equal(support.primary, false);
	});

	it("keeps exactly one planned endpoint marked primary", () => {
		const plan = buildCustomerAccessPlan(intent, serverIp);
		const primaryEndpoints = plan.endpoints.filter(
			(endpoint) => endpoint.primary,
		);

		assert.equal(primaryEndpoints.length, 1);
		assert.equal(primaryEndpoints[0]?.key, "website");
		assert.equal(primaryEndpoints[0]?.url, plan.primaryUrl);
	});

	it("uses the endpoint key when no suggested subdomain exists", () => {
		const plan = buildCustomerAccessPlan(
			{
				...intent,
				access: intent.access.map((endpoint) =>
					endpoint.key === "support"
						? {
								...endpoint,
								suggestedSubdomain: undefined,
							}
						: endpoint,
				),
			},
			serverIp,
		);

		const support = plan.endpoints.find(
			(endpoint) => endpoint.key === "support",
		);

		assert.ok(support);
		assert.equal(
			support.host,
			"support-vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
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
					serverIp,
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

	it("rejects an invalid path on any endpoint", () => {
		assert.throws(
			() =>
				buildCustomerAccessPlan(
					{
						...intent,
						access: intent.access.map((endpoint) =>
							endpoint.key === "support"
								? {
										...endpoint,
										path: "support",
									}
								: endpoint,
						),
					},
					serverIp,
				),
			/must begin with \//,
		);
	});

	it("rejects endpoint declarations that produce duplicate hosts", () => {
		assert.throws(
			() =>
				buildCustomerAccessPlan(
					{
						...intent,
						access: [
							...intent.access,
							{
								key: "help",
								serviceName: "help",
								port: 80,
								path: "/",
								internalPath: "/",
								suggestedSubdomain: "support",
								primary: false,
							},
						],
					},
					serverIp,
				),
			/is duplicated/,
		);
	});
});
