import { z } from "zod";

export const workloadTypeSchema = z.enum(["saas", "vpstack"]);

export const provisioningOperationSchema = z.enum([
	"deploy",
	"status",
	"suspend",
	"unsuspend",
	"terminate",
	"rotate_credentials",
	"health_check",
]);

export const provisioningReasonSchema = z.enum([
	"payment_confirmed",
	"admin_action",
	"overdue",
	"payment_restored",
	"cancellation",
	"customer_action",
]);

export const provisioningRequestSchema = z.object({
	contractVersion: z.literal("v1"),
	operation: provisioningOperationSchema,
	idempotencyKey: z.string().min(1).max(255),
	billing: z.object({
		customerId: z.string().min(1).max(255),
		serviceId: z.string().min(1).max(255),
	}),
	product: z.object({
		workloadType: workloadTypeSchema,
		productId: z.string().min(1).max(255),
		templateId: z.string().min(1).max(255),
		templateVersion: z.string().min(1).max(255),
	}),
	requestedConfiguration: z.record(z.string(), z.unknown()).default({}),
	context: z.object({
		requestedBy: z.literal("vpay"),
		reason: provisioningReasonSchema,
	}),
});

export const operationStateSchema = z.enum([
	"accepted",
	"running",
	"succeeded",
	"failed",
	"cancelled",
]);

export const serviceStateSchema = z.enum([
	"pending",
	"provisioning",
	"active",
	"suspending",
	"suspended",
	"unsuspending",
	"terminating",
	"terminated",
	"failed",
	"reconciling",
]);

export type WorkloadType = z.infer<typeof workloadTypeSchema>;
export type ProvisioningOperation = z.infer<typeof provisioningOperationSchema>;
export type ProvisioningRequest = z.infer<typeof provisioningRequestSchema>;
export type OperationState = z.infer<typeof operationStateSchema>;
export type ServiceState = z.infer<typeof serviceStateSchema>;
