import type { ProvisioningOperation, ServiceState } from "./contract";

const permittedStates: Record<ProvisioningOperation, readonly ServiceState[]> =
	{
		deploy: ["pending", "failed"],
		status: [
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
		],
		suspend: ["active"],
		unsuspend: ["suspended"],
		terminate: ["pending", "active", "suspended", "failed"],
		rotate_credentials: ["active"],
		health_check: ["active", "suspended"],
	};

export const canBeginLifecycleOperation = (
	state: ServiceState,
	operation: ProvisioningOperation,
): boolean => permittedStates[operation].includes(state);

export const startingStateForOperation = (
	operation: ProvisioningOperation,
): ServiceState | undefined => {
	switch (operation) {
		case "deploy":
			return "provisioning";
		case "suspend":
			return "suspending";
		case "unsuspend":
			return "unsuspending";
		case "terminate":
			return "terminating";
		default:
			return undefined;
	}
};

export const successfulStateForOperation = (
	operation: ProvisioningOperation,
): ServiceState | undefined => {
	switch (operation) {
		case "deploy":
		case "unsuspend":
			return "active";
		case "suspend":
			return "suspended";
		case "terminate":
			return "terminated";
		default:
			return undefined;
	}
};
