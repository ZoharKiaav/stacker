const SENSITIVE_KEY_PATTERN =
	/password|passwd|secret|token|authorization|cookie|api[-_]?key|private[-_]?key|credential/i;

const MAX_DEPTH = 10;

const redactValue = (
	value: unknown,
	depth: number,
	seen: WeakSet<object>,
): unknown => {
	if (depth > MAX_DEPTH) {
		return "[MAX_DEPTH]";
	}

	if (value === null || typeof value !== "object") {
		return value;
	}

	if (seen.has(value)) {
		return "[CIRCULAR]";
	}

	seen.add(value);

	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item, depth + 1, seen));
	}

	const redacted: Record<string, unknown> = {};

	for (const [key, item] of Object.entries(value)) {
		redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
			? "[REDACTED]"
			: redactValue(item, depth + 1, seen);
	}

	return redacted;
};

export const redactAuditMetadata = (
	metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
	if (!metadata) {
		return undefined;
	}

	return redactValue(metadata, 0, new WeakSet()) as Record<string, unknown>;
};
