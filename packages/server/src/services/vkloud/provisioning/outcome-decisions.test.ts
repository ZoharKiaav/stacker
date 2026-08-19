import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	canCompleteProvisioningOperation,
	isCompletionErrorValid,
	terminalServiceState,
} from "./outcome-decisions";

describe("provisioning outcome decisions", () => {
	it("allows accepted and running operations to complete", () => {
		assert.equal(
			canCompleteProvisioningOperation("accepted", "succeeded"),
			true,
		);
		assert.equal(canCompleteProvisioningOperation("running", "failed"), true);
	});

	it("treats the same terminal outcome as an idempotent retry", () => {
		assert.equal(
			canCompleteProvisioningOperation("succeeded", "succeeded"),
			true,
		);
	});

	it("rejects changing one terminal outcome into another", () => {
		assert.equal(
			canCompleteProvisioningOperation("succeeded", "failed"),
			false,
		);
	});

	it("requires error details only for failed outcomes", () => {
		assert.equal(isCompletionErrorValid("failed", true), true);
		assert.equal(isCompletionErrorValid("failed", false), false);
	});

	it("rejects error details for successful or cancelled outcomes", () => {
		assert.equal(isCompletionErrorValid("succeeded", true), false);
		assert.equal(isCompletionErrorValid("cancelled", true), false);
	});

	it("maps successful lifecycle outcomes", () => {
		assert.equal(
			terminalServiceState("deploy", "succeeded", "provisioning"),
			"active",
		);
		assert.equal(
			terminalServiceState("terminate", "succeeded", "terminating"),
			"terminated",
		);
	});

	it("maps failed and cancelled lifecycle outcomes safely", () => {
		assert.equal(
			terminalServiceState("suspend", "failed", "suspending"),
			"failed",
		);
		assert.equal(
			terminalServiceState("unsuspend", "cancelled", "unsuspending"),
			"reconciling",
		);
	});

	it("preserves service state for observational operations", () => {
		assert.equal(
			terminalServiceState("health_check", "failed", "active"),
			"active",
		);
	});
});
