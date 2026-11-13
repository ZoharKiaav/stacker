import { z } from "zod";
import type { ExecutionTargetDefinition } from "./execution-target";

const templateCatalogueVersionSchema = z
	.object({
		version: z.string().trim().min(1).max(255),
		active: z.boolean(),
	})
	.strict();

const templateCatalogueTemplateSchema = z
	.object({
		id: z.string().trim().min(1).max(255),
		versions: z.array(templateCatalogueVersionSchema).min(1),
	})
	.strict();

export const templateCatalogueResponseSchema = z
	.object({
		templates: z.array(templateCatalogueTemplateSchema),
	})
	.strict();

export type TemplateCatalogueResponse = z.infer<
	typeof templateCatalogueResponseSchema
>;

const compareIdentifiers = (left: string, right: string): number =>
	left.localeCompare(right, "en", {
		numeric: true,
		sensitivity: "base",
	});

export const buildTemplateCatalogueResponse = (
	targets: ExecutionTargetDefinition[],
): TemplateCatalogueResponse => {
	const templates = new Map<string, Set<string>>();

	for (const target of targets) {
		const versions = templates.get(target.templateId) ?? new Set<string>();

		versions.add(target.templateVersion);

		templates.set(target.templateId, versions);
	}

	return templateCatalogueResponseSchema.parse({
		templates: [...templates.entries()]
			.sort(([left], [right]) => compareIdentifiers(left, right))
			.map(([id, versions]) => ({
				id,
				versions: [...versions].sort(compareIdentifiers).map((version) => ({
					version,
					active: true,
				})),
			})),
	});
};
