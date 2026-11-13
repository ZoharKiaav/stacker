import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type DeployAndFinalizeProvisioningComposeDependencies,
	deployAndFinalizeProvisioningCompose,
} from "./compose-deployment-finalization";

const input = {
	composeId: "compose-42",
	operationId: "operation-42",
};

const createDependencies = () => {
	const calls: string[] = [];

	const dependencies: DeployAndFinalizeProvisioningComposeDependencies = {
		async deploy(deployment) {
			calls.push(`deploy:${deployment.composeId}`);
		},
		async completeOutcome(outcome) {
			calls.push(
				`complete:${outcome.composeId}:${outcome.outcome}:${outcome.supportReference}`,
			);

			return {
				linked: true,
				duplicate: false,
				operationId: input.operationId,
				operationState:
					outcome.outcome === "succeeded" ? "succeeded" : "failed",
				serviceState: outcome.outcome === "succeeded" ? "active" : "failed",
			};
		},
		reportFinalizationFailure(message) {
			calls.push(`report:${message}`);
		},
	};

	return {
		calls,
		dependencies,
	};
};

describe("vKloud Compose deployment outcome finalisation", () => {
	it("records success after deployment completes", async () => {
		const { calls, dependencies } = createDependencies();

		const result = await deployAndFinalizeProvisioningCompose(
			input,
			dependencies,
		);

		assert.deepEqual(calls, [
			"deploy:compose-42",
			"complete:compose-42:succeeded:vkloud-compose-operation-42",
		]);
		assert.equal(result.linked, true);
		assert.equal(result.operationState, "succeeded");
		assert.equal(result.serviceState, "active");
	});

	it("records a retryable failure against the created Compose resource", async () => {
		const { calls, dependencies } = createDependencies();
		const deploymentError = new Error("Compose deployment failed");

		dependencies.deploy = async (deployment) => {
			calls.push(`deploy:${deployment.composeId}`);
			throw deploymentError;
		};

		await assert.rejects(
			() => deployAndFinalizeProvisioningCompose(input, dependencies),
			(error) => error === deploymentError,
		);

		assert.deepEqual(calls, [
			"deploy:compose-42",
			"complete:compose-42:failed:vkloud-compose-operation-42",
		]);
	});

	it("preserves the deployment error if failure finalisation also fails", async () => {
		const { calls, dependencies } = createDependencies();
		const deploymentError = new Error("Compose deployment failed");

		dependencies.deploy = async () => {
			calls.push("deploy:compose-42");
			throw deploymentError;
		};

		dependencies.completeOutcome = async (outcome) => {
			calls.push(`complete:${outcome.composeId}:${outcome.outcome}`);
			throw new Error("Outcome persistence failed");
		};

		await assert.rejects(
			() => deployAndFinalizeProvisioningCompose(input, dependencies),
			(error) => error === deploymentError,
		);

		assert.deepEqual(calls, [
			"deploy:compose-42",
			"complete:compose-42:failed",
			"report:Unable to persist failed vKloud Compose deployment outcome",
		]);
	});

	it("does not mark failure when success finalisation fails", async () => {
		const { calls, dependencies } = createDependencies();
		const finalizationError = new Error("Success persistence failed");

		dependencies.completeOutcome = async (outcome) => {
			calls.push(`complete:${outcome.composeId}:${outcome.outcome}`);
			throw finalizationError;
		};

		await assert.rejects(
			() => deployAndFinalizeProvisioningCompose(input, dependencies),
			(error) => error === finalizationError,
		);

		assert.deepEqual(calls, [
			"deploy:compose-42",
			"complete:compose-42:succeeded",
		]);
	});

	it("allows an idempotent duplicate completion result", async () => {
		const { calls, dependencies } = createDependencies();

		dependencies.completeOutcome = async (outcome) => {
			calls.push(`complete:${outcome.composeId}:${outcome.outcome}`);

			return {
				linked: true,
				duplicate: true,
				operationId: input.operationId,
				operationState: "succeeded",
				serviceState: "active",
			};
		};

		const result = await deployAndFinalizeProvisioningCompose(
			input,
			dependencies,
		);

		assert.equal(result.duplicate, true);
		assert.deepEqual(calls, [
			"deploy:compose-42",
			"complete:compose-42:succeeded",
		]);
	});
});
