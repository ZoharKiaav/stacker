import { z } from "zod";
import { operationStateSchema, workloadTypeSchema } from "./contract";
import { provisioningErrorSchema } from "./errors";

export const customerSafeEndpointSchema = z
	.object({
		key: z.string().min(1).max(100),
		url: z.url(),
		primary: z.boolean(),
	})
	.strict();

export const customerSafePropertiesSchema = z.object({
	primaryUrl: z.url().optional(),
	endpoints: z.array(customerSafeEndpointSchema).max(100).optional(),
	displayName: z.string().min(1).max(255).optional(),
	healthStatus: z.string().min(1).max(100).optional(),
	supportReference: z.string().min(1).max(255).optional(),
});

export const provisioningResponseSchema = z.object({
	contractVersion: z.literal("v1"),
	operationId: z.string().min(1).max(255),
	billingServiceId: z.string().min(1).max(255),
	state: operationStateSchema,
	duplicate: z.boolean(),
	resource: z.object({
		resourceId: z.string().min(1).max(255).nullable(),
		workloadType: workloadTypeSchema,
	}),
	customerSafe: customerSafePropertiesSchema,
	error: provisioningErrorSchema.nullable(),
});

export type CustomerSafeProperties = z.infer<
	typeof customerSafePropertiesSchema
>;
export type ProvisioningResponse = z.infer<typeof provisioningResponseSchema>;
