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

export const templateAccessSchema = z
	.object({
		serviceName: z.string().trim().min(1).max(255),
		port: z.number().int().min(1).max(65535),
		path: z.string().trim().min(1).default("/"),
		internalPath: z.string().trim().min(1).default("/"),
	})
	.strict();

export type TemplateAccess = z.infer<typeof templateAccessSchema>;

const fetchedTemplateSchema = z
	.object({
		metadata: z
			.object({
				id: z.string().trim().min(1),
				version: z.string().trim().min(1),
			})
			.passthrough(),
		access: templateAccessSchema,
		dockerCompose: z.string().trim().min(1),
	})
	.strict();

export const immutableTemplateArtifactSchema = z
	.object({
		templateId: z.string().min(1),
		templateVersion: z.string().min(1),
		baseUrl: z.url(),
		access: templateAccessSchema,
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

	const access = templateAccessSchema.parse(actual.access);

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
