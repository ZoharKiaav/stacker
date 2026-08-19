import { TRPCError } from "@trpc/server";

export interface ExecutionTargetOwnershipInput {
	organizationId: string;
	environmentProjectId: string;
	projectId: string;
	projectOrganizationId: string;
	serverId: string | null;
	serverOrganizationId: string | null;
}

export const assertExecutionTargetOwnership = (
	input: ExecutionTargetOwnershipInput,
): void => {
	if (input.environmentProjectId !== input.projectId) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Execution environment does not belong to the resolved project",
		});
	}

	if (input.projectOrganizationId !== input.organizationId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Execution project does not belong to the provisioning organization",
		});
	}

	if (
		input.serverId !== null &&
		input.serverOrganizationId !== input.organizationId
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Execution server does not belong to the provisioning organization",
		});
	}

	if (input.serverId === null && input.serverOrganizationId !== null) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Local execution target contains unexpected server ownership",
		});
	}
};
