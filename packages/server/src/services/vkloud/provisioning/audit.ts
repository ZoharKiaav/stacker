import type {
	VkloudAuditAction,
	VkloudAuditResourceType,
} from "../audit/audit-types";
import type { ProvisioningOperation } from "./contract";

export interface ProvisioningAuditMapping {
	action: VkloudAuditAction;
	resourceType: VkloudAuditResourceType;
}

export const getProvisioningAuditMapping = (
	operation: ProvisioningOperation,
): ProvisioningAuditMapping | undefined => {
	switch (operation) {
		case "deploy":
			return {
				action: "provision",
				resourceType: "provisioningOperation",
			};
		case "suspend":
			return {
				action: "suspend",
				resourceType: "billingService",
			};
		case "unsuspend":
			return {
				action: "unsuspend",
				resourceType: "billingService",
			};
		case "terminate":
			return {
				action: "terminate",
				resourceType: "billingService",
			};
		case "rotate_credentials":
			return {
				action: "rotateCredentials",
				resourceType: "credential",
			};
		case "health_check":
			return {
				action: "healthCheck",
				resourceType: "billingService",
			};
		default:
			return undefined;
	}
};
