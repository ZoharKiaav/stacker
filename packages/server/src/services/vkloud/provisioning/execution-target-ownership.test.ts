import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRPCError } from "@trpc/server";
import { assertExecutionTargetOwnership } from "./execution-target-ownership";

const validInput = {
	organizationId: "organization-7",
	environmentProjectId: "project-7",
	projectId: "project-7",
	projectOrganizationId: "organization-7",
	serverId: "server-7",
	serverOrganizationId: "organization-7",
};

describe("execution target ownership", () => {
	it("accepts an environment, project and server in one organization", () => {
		assert.doesNotThrow(() => assertExecutionTargetOwnership(validInput));
	});

	it("accepts an explicitly configured local target", () => {
		assert.doesNotThrow(() =>
			assertExecutionTargetOwnership({
				...validInput,
				serverId: null,
				serverOrganizationId: null,
			}),
		);
	});

	it("rejects an environment from another project", () => {
		assert.throws(
			() =>
				assertExecutionTargetOwnership({
					...validInput,
					environmentProjectId: "project-8",
				}),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});

	it("rejects a project from another organization", () => {
		assert.throws(
			() =>
				assertExecutionTargetOwnership({
					...validInput,
					projectOrganizationId: "organization-8",
				}),
			(error) => error instanceof TRPCError && error.code === "FORBIDDEN",
		);
	});

	it("rejects a remote server from another organization", () => {
		assert.throws(
			() =>
				assertExecutionTargetOwnership({
					...validInput,
					serverOrganizationId: "organization-8",
				}),
			(error) => error instanceof TRPCError && error.code === "FORBIDDEN",
		);
	});

	it("rejects server ownership attached to a local target", () => {
		assert.throws(
			() =>
				assertExecutionTargetOwnership({
					...validInput,
					serverId: null,
				}),
			(error) => error instanceof TRPCError && error.code === "CONFLICT",
		);
	});
});
