import { createHash } from "node:crypto";
import type { ProvisioningRequest } from "./contract";

const canonicalize = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map(canonicalize);
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, item]) => [key, canonicalize(item)]),
		);
	}

	return value;
};

export const createProvisioningRequestFingerprint = (
	request: ProvisioningRequest,
): string => {
	const { idempotencyKey: _idempotencyKey, ...fingerprintInput } = request;
	const canonical = JSON.stringify(canonicalize(fingerprintInput));

	return createHash("sha256").update(canonical).digest("hex");
};

export const isMatchingIdempotentRequest = (
	existingFingerprint: string,
	request: ProvisioningRequest,
): boolean =>
	existingFingerprint === createProvisioningRequestFingerprint(request);
