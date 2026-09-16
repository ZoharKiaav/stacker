import { TRPCError } from "@trpc/server";

const immutableTemplateVersionPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}$/;

export const deriveTrustedTemplateReleaseUrl = (
	configuredBaseUrl: string,
	requestedVersion: string,
): string => {
	if (!immutableTemplateVersionPattern.test(requestedVersion)) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Requested template version is invalid",
		});
	}

	let configured: URL;

	try {
		configured = new URL(configuredBaseUrl);
	} catch {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Execution target template registry URL is invalid",
		});
	}

	if (configured.username || configured.password) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Execution target template registry URL must not contain credentials",
		});
	}

	const pathname = configured.pathname.replace(/\/+$/, "");
	const releaseMatch = pathname.match(/^(.*\/releases)\/[^/]+$/);

	if (!releaseMatch) {
		throw new TRPCError({
			code: "CONFLICT",
			message:
				"Execution target template registry URL must identify an immutable release",
		});
	}

	configured.pathname = `${releaseMatch[1]}/${encodeURIComponent(requestedVersion)}`;
	configured.search = "";
	configured.hash = "";

	return configured.toString().replace(/\/$/, "");
};
