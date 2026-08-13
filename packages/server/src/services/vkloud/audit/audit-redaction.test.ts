import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { redactAuditMetadata } from "./audit-redaction";

describe("redactAuditMetadata", () => {
	it("preserves ordinary metadata", () => {
		const result = redactAuditMetadata({
			operationId: "operation-123",
			status: "completed",
			attempt: 1,
		});

		assert.deepEqual(result, {
			operationId: "operation-123",
			status: "completed",
			attempt: 1,
		});
	});

	it("redacts sensitive values by key", () => {
		const result = redactAuditMetadata({
			password: "super-secret",
			apiKey: "api-key-value",
			access_token: "token-value",
			authorization: "Bearer token",
			username: "customer",
		});

		assert.deepEqual(result, {
			password: "[REDACTED]",
			apiKey: "[REDACTED]",
			access_token: "[REDACTED]",
			authorization: "[REDACTED]",
			username: "customer",
		});
	});

	it("redacts sensitive values inside nested objects and arrays", () => {
		const result = redactAuditMetadata({
			deployment: {
				domain: "customer.example.com",
				environment: {
					DATABASE_PASSWORD: "database-password",
					PUBLIC_URL: "https://customer.example.com",
				},
			},
			credentials: [
				{
					username: "admin",
					secret: "initial-password",
				},
			],
		});

		assert.deepEqual(result, {
			deployment: {
				domain: "customer.example.com",
				environment: {
					DATABASE_PASSWORD: "[REDACTED]",
					PUBLIC_URL: "https://customer.example.com",
				},
			},
			credentials: "[REDACTED]",
		});
	});

	it("replaces circular references safely", () => {
		const metadata: Record<string, unknown> = {
			operationId: "operation-123",
		};

		metadata.self = metadata;

		assert.deepEqual(redactAuditMetadata(metadata), {
			operationId: "operation-123",
			self: "[CIRCULAR]",
		});
	});

	it("stops traversing metadata beyond the maximum depth", () => {
		const metadata: Record<string, unknown> = {};
		let current = metadata;

		for (let index = 0; index < 12; index += 1) {
			const next: Record<string, unknown> = {};
			current.next = next;
			current = next;
		}

		const result = redactAuditMetadata(metadata);
		let inspected = result as Record<string, unknown>;

		for (let index = 0; index < 10; index += 1) {
			inspected = inspected.next as Record<string, unknown>;
		}

		assert.equal(inspected.next, "[MAX_DEPTH]");
	});

	it("returns undefined when no metadata is supplied", () => {
		assert.equal(redactAuditMetadata(), undefined);
	});
});
