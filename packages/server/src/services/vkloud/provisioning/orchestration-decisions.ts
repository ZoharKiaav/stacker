import type { ProvisioningRequest } from "./contract";

export interface ProvisioningProductMapping {
	billingCustomerId: string;
	workloadType: string;
	productId: string;
	templateId: string;
	templateVersion: string;
	targetPolicy: string;
}

export const matchesProvisioningProduct = (
	mapping: ProvisioningProductMapping,
	request: ProvisioningRequest,
	targetPolicy: string,
): boolean =>
	mapping.billingCustomerId === request.billing.customerId &&
	mapping.workloadType === request.product.workloadType &&
	mapping.productId === request.product.productId &&
	mapping.templateId === request.product.templateId &&
	mapping.templateVersion === request.product.templateVersion &&
	mapping.targetPolicy === targetPolicy;
