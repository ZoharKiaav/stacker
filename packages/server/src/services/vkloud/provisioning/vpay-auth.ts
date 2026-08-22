export const VPAY_PROVISIONING_PURPOSE = "vpay_provisioning";

export interface ApiKeyAuthenticationContext {
	source: "api_key";
	apiKeyId: string;
	organizationId: string;
	purpose?: string;
}

export interface SessionAuthenticationContext {
	source: "session";
}

export type AuthenticationContext =
	| ApiKeyAuthenticationContext
	| SessionAuthenticationContext;

export const isVpayProvisioningAuthentication = (
	auth: AuthenticationContext | null,
	activeOrganizationId: string,
): auth is ApiKeyAuthenticationContext =>
	auth?.source === "api_key" &&
	auth.purpose === VPAY_PROVISIONING_PURPOSE &&
	auth.organizationId === activeOrganizationId;
