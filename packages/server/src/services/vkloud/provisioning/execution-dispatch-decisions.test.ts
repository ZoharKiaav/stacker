import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import {
	assertOperationReadyForDispatch,
	selectExecutionAdapter,
} from "./execution-dispatch-decisions";

describe("provisioning execution dispatch decisions", () => {
	it("routes VPStacks through the Compose adapter", () => {
		assert.equal(selectExecutionAdapter("vpstack"), "compose");
	});

	it("routes SaaS workloads through the Application adapter", () => {
		assert.equal(selectExecutionAdapter("saas"), "application");
	});

	it("accepts an executable operation in accepted state", () => {
		assert.equal(
			assertOperationReadyForDispatch("deploy", "accepted"),
			"deploy",
		);
	});

	it("rejects observational operations", () => {
		assert.throws(
			() => assertOperationReadyForDispatch("status", "accepted"),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects an operation that has already moved forward", () => {
		assert.throws(
			() => assertOperationReadyForDispatch("deploy", "running"),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
