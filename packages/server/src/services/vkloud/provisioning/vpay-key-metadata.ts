import { VPAY_PROVISIONING_PURPOSE } from "./vpay-auth";

export const buildVpayProvisioningApiKeyMetadata = (
	organizationId: string,
) => ({
	organizationId,
	purpose: VPAY_PROVISIONING_PURPOSE,
});
