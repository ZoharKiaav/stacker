import { TRPCError } from "@trpc/server";
import type { WorkloadType } from "./contract";
import {
	type ExecutableProvisioningOperation,
	type ExecutionAdapter,
	type ProvisioningExecutionPlan,
	provisioningExecutionPlanSchema,
} from "./execution-contract";

export interface BuildExecutionPlanInput {
	organizationId: string;
	operationId: string;
	billingServiceMappingId: string;
	workloadType: WorkloadType;
	operation: ExecutableProvisioningOperation;
	adapter: ExecutionAdapter;
	productId: string;
	templateId: string;
	templateVersion: string;
	targetPolicy: string;
}

export interface ProvisioningExecutionPlanner {
	readonly adapter: ExecutionAdapter;
	supports(workloadType: WorkloadType): boolean;
	plan(input: BuildExecutionPlanInput): ProvisioningExecutionPlan;
}

export class ProvisioningExecutionPlannerRegistry {
	private readonly planners = new Map<
		ExecutionAdapter,
		ProvisioningExecutionPlanner
	>();

	register(planner: ProvisioningExecutionPlanner): void {
		if (this.planners.has(planner.adapter)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Execution planner ${planner.adapter} is already registered`,
			});
		}

		this.planners.set(planner.adapter, planner);
	}

	plan(input: BuildExecutionPlanInput): ProvisioningExecutionPlan {
		const planner = this.planners.get(input.adapter);

		if (!planner) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Execution planner ${input.adapter} is not registered`,
			});
		}

		if (!planner.supports(input.workloadType)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Execution planner ${input.adapter} does not support workload ${input.workloadType}`,
			});
		}

		return provisioningExecutionPlanSchema.parse(planner.plan(input));
	}
}

export const createDryRunPlanner = (
	adapter: ExecutionAdapter,
	supportedWorkloads: WorkloadType[],
): ProvisioningExecutionPlanner => ({
	adapter,

	supports: (workloadType) => supportedWorkloads.includes(workloadType),

	plan: (input) =>
		provisioningExecutionPlanSchema.parse({
			...input,
			mode: "dry_run",
		}),
});
