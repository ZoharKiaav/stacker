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

const fetchedTemplateSchema = z
	.object({
		metadata: z
			.object({
				id: z.string().trim().min(1),
				version: z.string().trim().min(1),
			})
			.passthrough(),
		dockerCompose: z.string().trim().min(1),
	})
	.strict();

export const immutableTemplateArtifactSchema = z
	.object({
		templateId: z.string().min(1),
		templateVersion: z.string().min(1),
		baseUrl: z.url(),
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

	return immutableTemplateArtifactSchema.parse({
		...expected,
		dockerCompose: actual.dockerCompose,
		contentDigest: createHash("sha256")
			.update(actual.dockerCompose)
			.digest("hex"),
	});
};
