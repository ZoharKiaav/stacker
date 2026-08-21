import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type FirstComposeRecordStore,
	persistFirstComposeRecord,
} from "./first-compose-record";
import type { AuthorizedVpstackComposeIntent } from "./vpstack-compose-authorization";

const intent: AuthorizedVpstackComposeIntent = {
	mode: "authorized_intent",
	operationId: "-3M6dFwnmgyM5-pIN_63l",
	billingServiceMappingId: "y7Hd5welUMIp1TULx8kWL",
	contentDigest:
		"58f44c4f77525ce2c481e00556a5d292d823ebef18a7eee7c02a5d3dd21fc5e6",
	compose: {
		name: "clientops-starter",
		description: "Disposable local VPStack provisioning test",
		environmentId: "wyUymmRoaRR4fM35YQLNC",
		composeType: "docker-compose",
		sourceType: "raw",
		composeFile: "services:\n  e4-placeholder:\n    image: busybox:1.36\n",
		appName: "vpstack-deterministic",
	},
};

const makeStore = (
	existing: Awaited<
		ReturnType<FirstComposeRecordStore["findExistingComposeResource"]>
	> = null,
) => {
	const calls: string[] = [];

	const store: FirstComposeRecordStore = {
		async lockBillingService() {
			calls.push("lock");
		},
		async findExistingComposeResource() {
			calls.push("find");
			return existing;
		},
		async createCompose(input) {
			calls.push("create");
			assert.equal(input.sourceType, "raw");
			assert.equal(input.composeType, "docker-compose");

			return {
				composeId: "compose-7",
				name: input.name,
			};
		},
		async registerPrimaryResource(input) {
			calls.push("register");
			assert.equal(input.resourceId, "compose-7");
			assert.equal(input.operationId, "-3M6dFwnmgyM5-pIN_63l");
		},
	};

	return { calls, store };
};

describe("first Compose record persistence", () => {
	it("locks, creates and registers in order", async () => {
		const { calls, store } = makeStore();

		const result = await persistFirstComposeRecord(store, {
			organizationId: "TGjxG21mBbRRCX4MtHiSx",
			intent,
		});

		assert.deepEqual(calls, ["lock", "find", "create", "register"]);
		assert.equal(result.composeId, "compose-7");
		assert.equal(result.duplicate, false);
	});

	it("returns the existing resource on retry", async () => {
		const { calls, store } = makeStore({
			resourceId: "compose-existing",
			resourceName: "clientops-starter",
		});

		const result = await persistFirstComposeRecord(store, {
			organizationId: "TGjxG21mBbRRCX4MtHiSx",
			intent,
		});

		assert.deepEqual(calls, ["lock", "find"]);
		assert.equal(result.composeId, "compose-existing");
		assert.equal(result.duplicate, true);
	});

	it("does not register when Compose creation fails", async () => {
		const { calls, store } = makeStore();

		store.createCompose = async () => {
			calls.push("create");
			return {
				composeId: "",
				name: "clientops-starter",
			};
		};

		await assert.rejects(() =>
			persistFirstComposeRecord(store, {
				organizationId: "TGjxG21mBbRRCX4MtHiSx",
				intent,
			}),
		);

		assert.deepEqual(calls, ["lock", "find", "create"]);
	});

	it("contains no deployment or startup operation", async () => {
		const { store } = makeStore();

		const result = await persistFirstComposeRecord(store, {
			organizationId: "TGjxG21mBbRRCX4MtHiSx",
			intent,
		});

		const serialized = JSON.stringify(result);

		assert.equal(serialized.includes("deployCompose"), false);
		assert.equal(serialized.includes("startCompose"), false);
	});
});
