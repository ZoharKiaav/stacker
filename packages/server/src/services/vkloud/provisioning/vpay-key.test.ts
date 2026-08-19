import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VPAY_PROVISIONING_PURPOSE } from "./vpay-auth";
import { buildVpayProvisioningApiKeyMetadata } from "./vpay-key-metadata";

describe("vPay provisioning API-key metadata", () => {
	it("locks the key to the requested organization", () => {
		const metadata = buildVpayProvisioningApiKeyMetadata("organization-7");

		assert.equal(metadata.organizationId, "organization-7");
	});

	it("always assigns the dedicated provisioning purpose", () => {
		const metadata = buildVpayProvisioningApiKeyMetadata("organization-7");

		assert.equal(metadata.purpose, VPAY_PROVISIONING_PURPOSE);
	});
});
