import { db } from "@dokploy/server/db";
import { vkloudExecutionTarget } from "@dokploy/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { ExecutionTargetDefinition } from "./execution-target";
import {
	toExecutionTargetDefinition,
	validateExecutionTargetCatalogue,
} from "./execution-target-catalogue";
import { mapExecutionTargetCatalogueRow } from "./execution-target-catalogue-row";

export const loadExecutionTargetCatalogue = async (
	organizationId: string,
): Promise<ExecutionTargetDefinition[]> => {
	const rows = await db.query.vkloudExecutionTarget.findMany({
		where: and(
			eq(vkloudExecutionTarget.organizationId, organizationId),
			eq(vkloudExecutionTarget.enabled, true),
		),
	});

	const entries = validateExecutionTargetCatalogue(
		rows.map(mapExecutionTargetCatalogueRow),
	);

	return entries.map(toExecutionTargetDefinition);
};
