import { z } from "zod";
import { serviceStateSchema, workloadTypeSchema } from "./contract";
import { customerSafePropertiesSchema } from "./response";

export const provisioningServiceStatusSchema = z.object({
	contractVersion: z.literal("v1"),
	billingServiceId: z.string().min(1).max(255),
	workloadType: workloadTypeSchema,
	state: serviceStateSchema,
	resources: z.array(
		z.object({
			resourceId: z.string().min(1).max(255),
			resourceType: z.string().min(1).max(100),
			displayName: z.string().min(1).max(255).nullable(),
			primary: z.boolean(),
		}),
	),
	customerSafe: customerSafePropertiesSchema,
});

export type ProvisioningServiceStatus = z.infer<
	typeof provisioningServiceStatusSchema
>;

export interface BuildProvisioningServiceStatusInput {
	billingServiceId: string;
	workloadType: "saas" | "vpstack";
	serviceState:
		| "pending"
		| "provisioning"
		| "active"
		| "suspending"
		| "suspended"
		| "unsuspending"
		| "terminating"
		| "terminated"
		| "failed"
		| "reconciling";
	customerSafeProperties: Record<string, unknown>;
	resources: Array<{
		resourceId: string;
		resourceType: string;
		resourceName: string | null;
		isPrimary: boolean;
	}>;
}

export const buildProvisioningServiceStatus = (
	mapping: BuildProvisioningServiceStatusInput,
): ProvisioningServiceStatus =>
	provisioningServiceStatusSchema.parse({
		contractVersion: "v1",
		billingServiceId: mapping.billingServiceId,
		workloadType: mapping.workloadType,
		state: mapping.serviceState,
		resources: mapping.resources.map((resource) => ({
			resourceId: resource.resourceId,
			resourceType: resource.resourceType,
			displayName: resource.resourceName,
			primary: resource.isPrimary,
		})),
		customerSafe: mapping.customerSafeProperties,
	});
