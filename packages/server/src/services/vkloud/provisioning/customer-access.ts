import { TRPCError } from "@trpc/server";
import type { AuthorizedVpstackComposeIntent } from "./vpstack-compose-authorization";

export interface CustomerAccessPlan {
	host: string;
	primaryUrl: string;
	domain: {
		host: string;
		https: false;
		certificateType: "none";
		path: string;
		port: number;
		serviceName: string;
		domainType: "compose";
		internalPath: string;
		stripPath: false;
	};
}

const ipv4Schema =
	/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

const normalisePath = (value: string, field: string): string => {
	const path = value.trim();

	if (!path.startsWith("/")) {
		throw new TRPCError({
			code: "CONFLICT",
			message: `${field} must begin with /`,
		});
	}

	return path;
};

export const buildCustomerAccessPlan = (
	intent: AuthorizedVpstackComposeIntent,
	serverIp: string | null | undefined,
): CustomerAccessPlan => {
	const ip = serverIp?.trim();

	if (!ip || !ipv4Schema.test(ip)) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Customer access requires a configured public IPv4 address",
		});
	}

	const ipLabel = ip.replaceAll(".", "-");
	const host = `${intent.compose.appName}-${ipLabel}.sslip.io`;

	return {
		host,
		primaryUrl: `http://${host}`,
		domain: {
			host,
			https: false,
			certificateType: "none",
			path: normalisePath(intent.access.path, "Access path"),
			port: intent.access.port,
			serviceName: intent.access.serviceName,
			domainType: "compose",
			internalPath: normalisePath(
				intent.access.internalPath,
				"Internal access path",
			),
			stripPath: false,
		},
	};
};
