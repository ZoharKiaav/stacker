import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	isVpayProvisioningAuthentication,
	VPAY_PROVISIONING_PURPOSE,
} from "./vpay-auth";

describe("vPay provisioning authentication", () => {
	it("accepts a dedicated vPay API key for the active organization", () => {
		assert.equal(
			isVpayProvisioningAuthentication(
				{
					source: "api_key",
					apiKeyId: "key-123",
					organizationId: "organization-7",
					purpose: VPAY_PROVISIONING_PURPOSE,
				},
				"organization-7",
			),
			true,
		);
	});

	it("rejects browser-session authentication", () => {
		assert.equal(
			isVpayProvisioningAuthentication(
				{
					source: "session",
				},
				"organization-7",
			),
			false,
		);
	});

	it("rejects a generic API key", () => {
		assert.equal(
			isVpayProvisioningAuthentication(
				{
					source: "api_key",
					apiKeyId: "key-123",
					organizationId: "organization-7",
				},
				"organization-7",
			),
			false,
		);
	});

	it("rejects an API key with another purpose", () => {
		assert.equal(
			isVpayProvisioningAuthentication(
				{
					source: "api_key",
					apiKeyId: "key-123",
					organizationId: "organization-7",
					purpose: "another_integration",
				},
				"organization-7",
			),
			false,
		);
	});

	it("rejects an API key scoped to another organization", () => {
		assert.equal(
			isVpayProvisioningAuthentication(
				{
					source: "api_key",
					apiKeyId: "key-123",
					organizationId: "organization-8",
					purpose: VPAY_PROVISIONING_PURPOSE,
				},
				"organization-7",
			),
			false,
		);
	});

	it("rejects missing authentication context", () => {
		assert.equal(
			isVpayProvisioningAuthentication(null, "organization-7"),
			false,
		);
	});
});
