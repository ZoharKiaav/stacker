import { z } from "zod";

export const PROVISIONING_ERROR_CATEGORIES = [
	"validation",
	"authentication",
	"authorization",
	"conflict",
	"capacity",
	"dependency",
	"execution",
	"health",
	"internal",
] as const;

export const provisioningErrorCategorySchema = z.enum(
	PROVISIONING_ERROR_CATEGORIES,
);

export const provisioningErrorSchema = z.object({
	code: z.string().min(1).max(100),
	category: provisioningErrorCategorySchema,
	retryable: z.boolean(),
	customerMessage: z.string().min(1).max(500),
	operationId: z.string().min(1).max(255).nullable(),
	supportReference: z.string().min(1).max(255),
});

export type ProvisioningErrorCategory = z.infer<
	typeof provisioningErrorCategorySchema
>;

export type CustomerSafeProvisioningError = z.infer<
	typeof provisioningErrorSchema
>;

export const createCustomerSafeProvisioningError = (
	input: CustomerSafeProvisioningError,
): CustomerSafeProvisioningError => provisioningErrorSchema.parse(input);
