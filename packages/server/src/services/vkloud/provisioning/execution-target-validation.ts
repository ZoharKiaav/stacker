import { db } from "@dokploy/server/db";
import { environments, projects, server } from "@dokploy/server/db/schema";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { ExecutionTarget } from "./execution-target";
import { assertExecutionTargetOwnership } from "./execution-target-ownership";

export const validateExecutionTargetOwnership = async (
	organizationId: string,
	target: ExecutionTarget,
): Promise<ExecutionTarget> => {
	const environment = await db.query.environments.findFirst({
		where: eq(environments.environmentId, target.environmentId),
		columns: {
			environmentId: true,
			projectId: true,
		},
	});

	if (!environment) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Execution environment not found",
		});
	}

	const project = await db.query.projects.findFirst({
		where: eq(projects.projectId, environment.projectId),
		columns: {
			projectId: true,
			organizationId: true,
		},
	});

	if (!project) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Execution project not found",
		});
	}

	const remoteServer = target.serverId
		? await db.query.server.findFirst({
				where: eq(server.serverId, target.serverId),
				columns: {
					serverId: true,
					organizationId: true,
				},
			})
		: null;

	if (target.serverId && !remoteServer) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Execution server not found",
		});
	}

	assertExecutionTargetOwnership({
		organizationId,
		environmentProjectId: environment.projectId,
		projectId: project.projectId,
		projectOrganizationId: project.organizationId,
		serverId: target.serverId,
		serverOrganizationId: remoteServer?.organizationId ?? null,
	});

	return target;
};
