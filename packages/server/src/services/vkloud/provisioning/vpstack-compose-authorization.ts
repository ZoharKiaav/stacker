import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { OperationState } from "./contract";
import type { ExecutionReadiness } from "./execution-readiness";
import type { ImmutableTemplateArtifact } from "./immutable-template-artifact";

export const DISPOSABLE_EXECUTION_AUTHORIZATION =
	"authorize-local-disposable-compose";

export interface VpstackComposeAuthorizationInput {
	readiness: ExecutionReadiness;
	artifact: ImmutableTemplateArtifact;
	operationState: OperationState;
	existingResourceCount: number;
	authorization: string;
}

export interface AuthorizedVpstackComposeIntent {
	mode: "authorized_intent";
	operationId: string;
	billingServiceMappingId: string;
	contentDigest: string;
	compose: {
		name: string;
		description: string;
		environmentId: string;
		serverId?: string;
		composeType: "docker-compose";
		sourceType: "raw";
		composeFile: string;
		appName: string;
	};
}

const deterministicAppName = (readiness: ExecutionReadiness): string => {
	const identity = [
		readiness.plan.organizationId,
		readiness.plan.billingServiceMappingId,
		readiness.plan.operationId,
		readiness.target.environmentId,
		readiness.target.templateSource.templateId,
		readiness.target.templateSource.templateVersion,
	].join(":");

	return `vpstack-${createHash("sha256")
		.update(identity)
		.digest("hex")
		.slice(0, 16)}`;
};

export const authorizeVpstackComposeIntent = ({
	readiness,
	artifact,
	operationState,
	existingResourceCount,
	authorization,
}: VpstackComposeAuthorizationInput): AuthorizedVpstackComposeIntent => {
	if (authorization !== DISPOSABLE_EXECUTION_AUTHORIZATION) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Disposable Compose execution is not explicitly authorized",
		});
	}

	if (!readiness.ready) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Provisioning execution is not ready",
		});
	}

	if (readiness.plan.operation !== "deploy" || operationState !== "accepted") {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Only an accepted deploy operation may create a VPStack",
		});
	}

	if (
		readiness.plan.workloadType !== "vpstack" ||
		readiness.plan.adapter !== "compose" ||
		readiness.target.adapter !== "compose"
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "VPStack creation requires the Compose adapter",
		});
	}

	if (
		readiness.plan.organizationId.length === 0 ||
		readiness.target.environmentId.length === 0
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Execution ownership is incomplete",
		});
	}

	if (existingResourceCount !== 0) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "The billing service already owns provisioning resources",
		});
	}

	if (
		artifact.templateId !== readiness.target.templateSource.templateId ||
		artifact.templateVersion !==
			readiness.target.templateSource.templateVersion ||
		artifact.baseUrl !== readiness.target.templateSource.baseUrl
	) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Verified template artifact does not match readiness",
		});
	}

	const appName = deterministicAppName(readiness);

	return {
		mode: "authorized_intent",
		operationId: readiness.plan.operationId,
		billingServiceMappingId: readiness.plan.billingServiceMappingId,
		contentDigest: artifact.contentDigest,
		compose: {
			name: readiness.plan.templateId,
			description: "Disposable local VPStack provisioning test",
			environmentId: readiness.target.environmentId,
			...(readiness.target.serverId
				? { serverId: readiness.target.serverId }
				: {}),
			composeType: "docker-compose",
			sourceType: "raw",
			composeFile: artifact.dockerCompose,
			appName,
		},
	};
};
