import { TRPCError } from "@trpc/server";
import type { AuthorizedVpstackComposeIntent } from "./vpstack-compose-authorization";

export interface CustomerAccessDomain {
	host: string;
	https: false;
	certificateType: "none";
	path: string;
	port: number;
	serviceName: string;
	domainType: "compose";
	internalPath: string;
	stripPath: false;
}

export interface CustomerAccessEndpointPlan {
	key: string;
	host: string;
	url: string;
	primary: boolean;
	domain: CustomerAccessDomain;
}

export interface CustomerAccessPlan {
	primaryUrl: string;
	endpoints: CustomerAccessEndpointPlan[];

	/**
	 * Primary-endpoint aliases retained while persistence migrates from
	 * one domain to the endpoint collection.
	 */
	host: string;
	domain: CustomerAccessDomain;
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

const buildEndpointHost = (
	appName: string,
	ipLabel: string,
	key: string,
	suggestedSubdomain: string | undefined,
	primary: boolean,
): string => {
	if (primary) {
		return `${appName}-${ipLabel}.sslip.io`;
	}

	const endpointLabel = suggestedSubdomain ?? key;

	return `${endpointLabel}-${appName}-${ipLabel}.sslip.io`;
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

	const primaryAccess = intent.access.find((endpoint) => endpoint.primary);

	if (!primaryAccess) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Customer access requires one primary endpoint",
		});
	}

	const ipLabel = ip.replaceAll(".", "-");

	const endpoints = intent.access.map(
		(endpoint): CustomerAccessEndpointPlan => {
			const host = buildEndpointHost(
				intent.compose.appName,
				ipLabel,
				endpoint.key,
				endpoint.suggestedSubdomain,
				endpoint.primary,
			);

			return {
				key: endpoint.key,
				host,
				url: `http://${host}`,
				primary: endpoint.primary,
				domain: {
					host,
					https: false,
					certificateType: "none",
					path: normalisePath(
						endpoint.path,
						`Access path for endpoint ${endpoint.key}`,
					),
					port: endpoint.port,
					serviceName: endpoint.serviceName,
					domainType: "compose",
					internalPath: normalisePath(
						endpoint.internalPath,
						`Internal access path for endpoint ${endpoint.key}`,
					),
					stripPath: false,
				},
			};
		},
	);

	const primaryEndpoint = endpoints.find((endpoint) => endpoint.primary);

	if (!primaryEndpoint) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Customer access primary endpoint was not planned",
		});
	}

	const hosts = new Set<string>();

	for (const endpoint of endpoints) {
		if (hosts.has(endpoint.host)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Customer access host ${endpoint.host} is duplicated`,
			});
		}

		hosts.add(endpoint.host);
	}

	return {
		primaryUrl: primaryEndpoint.url,
		endpoints,
		host: primaryEndpoint.host,
		domain: primaryEndpoint.domain,
	};
};
