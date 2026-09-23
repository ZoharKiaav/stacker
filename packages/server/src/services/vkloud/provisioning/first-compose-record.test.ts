import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type FirstComposeRecordStore,
	persistFirstComposeRecord,
} from "./first-compose-record";
import type { AuthorizedVpstackComposeIntent } from "./vpstack-compose-authorization";

const intent: AuthorizedVpstackComposeIntent = {
	mode: "authorized_intent",
	operationId: "operation-1",
	billingServiceMappingId: "mapping-1",
	contentDigest:
		"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	access: [
		{
			key: "website",
			serviceName: "web",
			port: 80,
			path: "/",
			internalPath: "/",
			suggestedSubdomain: "www",
			primary: true,
		},
		{
			key: "support",
			serviceName: "support",
			port: 80,
			path: "/",
			internalPath: "/",
			suggestedSubdomain: "support",
			primary: false,
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

const createStore = ({
	existing = false,
	accessDuplicate = false,
}: {
	existing?: boolean;
	accessDuplicate?: boolean;
} = {}) => {
	const calls: string[] = [];

	const store: FirstComposeRecordStore = {
		async lockBillingService() {
			calls.push("lock");
		},

		async findExistingComposeResource() {
			calls.push("find");

			return existing
				? {
						resourceId: "compose-existing",
						resourceName: "Existing VPStack",
					}
				: null;
		},

		async createCompose() {
			calls.push("create-compose");

			return {
				composeId: "compose-created",
				name: "ClientOps Starter",
			};
		},

		async ensureCustomerAccess({ composeId }) {
			calls.push(`ensure-access:${composeId}`);

			return {
				primaryUrl: "http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
				duplicate: accessDuplicate,
			};
		},

		async registerPrimaryResource() {
			calls.push("register-primary");
		},
	};

	return {
		store,
		calls,
	};
};

describe("first Compose persistence", () => {
	it("creates Compose, registers ownership, then ensures access", async () => {
		const { store, calls } = createStore();

		const result = await persistFirstComposeRecord(store, {
			organizationId: "organization-1",
			intent,
		});

		assert.deepEqual(calls, [
			"lock",
			"find",
			"create-compose",
			"register-primary",
			"ensure-access:compose-created",
		]);

		assert.equal(result.composeId, "compose-created");
		assert.equal(result.duplicate, false);
		assert.equal(result.accessDuplicate, false);
		assert.equal(
			result.primaryUrl,
			"http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
	});

	it("repairs or reuses access for an existing Compose", async () => {
		const { store, calls } = createStore({
			existing: true,
			accessDuplicate: true,
		});

		const result = await persistFirstComposeRecord(store, {
			organizationId: "organization-1",
			intent,
		});

		assert.deepEqual(calls, ["lock", "find", "ensure-access:compose-existing"]);

		assert.equal(result.composeId, "compose-existing");
		assert.equal(result.duplicate, true);
		assert.equal(result.accessDuplicate, true);
		assert.equal(
			result.primaryUrl,
			"http://vpstack-0123456789abcdef-188-245-64-152.sslip.io",
		);
	});
	it("does not register or ensure access when Compose creation fails", async () => {
		const { store, calls } = createStore();

		store.createCompose = async () => {
			calls.push("create-compose");

			throw new Error("Compose creation failed");
		};

		await assert.rejects(
			() =>
				persistFirstComposeRecord(store, {
					organizationId: "organization-1",
					intent,
				}),
			/Compose creation failed/,
		);

		assert.deepEqual(calls, ["lock", "find", "create-compose"]);
	});

	it("contains no deployment or startup operation", async () => {
		const { store } = createStore();

		const result = await persistFirstComposeRecord(store, {
			organizationId: "organization-1",
			intent,
		});

		const serialized = JSON.stringify(result);

		assert.equal(serialized.includes("deployCompose"), false);
		assert.equal(serialized.includes("startCompose"), false);
	});
});
