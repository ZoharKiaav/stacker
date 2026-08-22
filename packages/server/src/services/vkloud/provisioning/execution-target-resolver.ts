import { TRPCError } from "@trpc/server";
import type { ProvisioningExecutionPlan } from "./execution-contract";
import {
	type ExecutionTarget,
	type ExecutionTargetDefinition,
	executionTargetSchema,
} from "./execution-target";

export class ExecutionTargetResolver {
	private readonly targets = new Map<string, ExecutionTargetDefinition>();

	register(definition: ExecutionTargetDefinition): void {
		if (this.targets.has(definition.policy)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Execution target policy ${definition.policy} is already registered`,
			});
		}

		this.targets.set(definition.policy, definition);
	}

	resolve(plan: ProvisioningExecutionPlan): ExecutionTarget {
		const definition = this.targets.get(plan.targetPolicy);

		if (!definition) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Execution target policy ${plan.targetPolicy} is not configured`,
			});
		}

		if (definition.adapter !== plan.adapter) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Execution target policy ${plan.targetPolicy} does not support adapter ${plan.adapter}`,
			});
		}

		if (
			definition.templateId !== plan.templateId ||
			definition.templateVersion !== plan.templateVersion
		) {
			throw new TRPCError({
				code: "CONFLICT",
				message:
					"Execution target does not match the requested template version",
			});
		}

		return executionTargetSchema.parse({
			policy: definition.policy,
			adapter: definition.adapter,
			environmentId: definition.environmentId,
			serverId: definition.serverId ?? null,
			templateSource: {
				templateId: definition.templateId,
				templateVersion: definition.templateVersion,
				baseUrl: definition.baseUrl ?? null,
			},
		});
	}
}
