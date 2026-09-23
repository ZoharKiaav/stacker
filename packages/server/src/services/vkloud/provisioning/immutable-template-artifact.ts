import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const templateIdentitySchema = z
	.object({
		templateId: z.string().trim().min(1).max(255),
		templateVersion: z.string().trim().min(1).max(255),
		baseUrl: z.url(),
	})
	.strict();

const endpointKeySchema = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.regex(
		/^[a-z0-9][a-z0-9-]*$/,
		"Access endpoint key must use lowercase letters, numbers and dashes",
	);

const suggestedSubdomainSchema = z
	.string()
	.trim()
	.min(1)
	.max(63)
	.regex(
		/^[a-z0-9][a-z0-9-]*$/,
		"Suggested subdomain must use lowercase letters, numbers and dashes",
	);

export const templateAccessEndpointSchema = z
	.object({
		key: endpointKeySchema,
		serviceName: z.string().trim().min(1).max(255),
		port: z.number().int().min(1).max(65535),
		path: z.string().trim().min(1).default("/"),
		internalPath: z.string().trim().min(1).default("/"),
		suggestedSubdomain: suggestedSubdomainSchema.optional(),
		primary: z.boolean().default(false),
	})
	.strict();

const legacyTemplateAccessSchema = z
	.object({
		serviceName: z.string().trim().min(1).max(255),
		port: z.number().int().min(1).max(65535),
		path: z.string().trim().min(1).default("/"),
		internalPath: z.string().trim().min(1).default("/"),
	})
	.strict();

export type TemplateAccessEndpoint = z.infer<
	typeof templateAccessEndpointSchema
>;

const normaliseTemplateAccess = (value: unknown): TemplateAccessEndpoint[] => {
	const legacy = legacyTemplateAccessSchema.safeParse(value);

	if (legacy.success) {
		return [
			templateAccessEndpointSchema.parse({
				key: "primary",
				...legacy.data,
				primary: true,
			}),
		];
	}

	const endpoints = z
		.array(templateAccessEndpointSchema)
		.min(1)
		.max(20)
		.parse(value);

	const keys = new Set<string>();
	const routeIdentities = new Set<string>();
	let primaryCount = 0;

	for (const endpoint of endpoints) {
		if (keys.has(endpoint.key)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Template access endpoint key ${endpoint.key} is duplicated`,
			});
		}

		keys.add(endpoint.key);

		const routeIdentity = [
			endpoint.serviceName,
			endpoint.port,
			endpoint.path,
			endpoint.internalPath,
		].join(":");

		if (routeIdentities.has(routeIdentity)) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Template access endpoint ${endpoint.key} duplicates another route`,
			});
		}

		routeIdentities.add(routeIdentity);

		if (endpoint.primary) {
			primaryCount += 1;
		}
	}

	if (primaryCount !== 1) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Template access must declare exactly one primary endpoint",
		});
	}

	return [...endpoints].sort((left, right) =>
		left.key.localeCompare(right.key),
	);
};

const fetchedTemplateSchema = z
	.object({
		metadata: z
			.object({
				id: z.string().trim().min(1),
				version: z.string().trim().min(1),
			})
			.passthrough(),
		access: z.unknown(),
		dockerCompose: z.string().trim().min(1),
	})
	.strict();

export const immutableTemplateArtifactSchema = z
	.object({
		templateId: z.string().min(1),
		templateVersion: z.string().min(1),
		baseUrl: z.url(),
		access: z.array(templateAccessEndpointSchema).min(1).max(20),
		dockerCompose: z.string().min(1),
		contentDigest: z.string().regex(/^[a-f0-9]{64}$/),
	})
	.strict();

export type ImmutableTemplateArtifact = z.infer<
	typeof immutableTemplateArtifactSchema
>;

export const verifyImmutableTemplateArtifact = (
	identity: unknown,
	fetched: unknown,
): ImmutableTemplateArtifact => {
	const expected = templateIdentitySchema.parse(identity);
	const actual = fetchedTemplateSchema.parse(fetched);

	if (actual.metadata.id !== expected.templateId) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Fetched template ID does not match the approved target",
		});
	}

	if (actual.metadata.version !== expected.templateVersion) {
		throw new TRPCError({
			code: "CONFLICT",
			message: "Fetched template version does not match the approved target",
		});
	}

	const access = normaliseTemplateAccess(actual.access);

	const digestInput = JSON.stringify({
		dockerCompose: actual.dockerCompose,
		access,
	});

	return immutableTemplateArtifactSchema.parse({
		...expected,
		access,
		dockerCompose: actual.dockerCompose,
		contentDigest: createHash("sha256").update(digestInput).digest("hex"),
	});
};
