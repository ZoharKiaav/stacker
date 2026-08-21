import type { ExecutionAdapter } from "./execution-contract";
import type { ExecutionTargetCatalogueEntry } from "./execution-target-catalogue";

export interface ExecutionTargetCatalogueRow {
	organizationId: string;
	policy: string;
	adapter: ExecutionAdapter;
	environmentId: string;
	placement: "local" | "remote";
	serverId: string | null;
	templateId: string;
	templateVersion: string;
	baseUrl: string | null;
}

export const mapExecutionTargetCatalogueRow = (
	row: ExecutionTargetCatalogueRow,
): ExecutionTargetCatalogueEntry => ({
	organizationId: row.organizationId,
	policy: row.policy,
	adapter: row.adapter,
	environmentId: row.environmentId,
	placement:
		row.placement === "remote"
			? {
					type: "remote",
					serverId: row.serverId ?? "",
				}
			: {
					type: "local",
				},
	templateId: row.templateId,
	templateVersion: row.templateVersion,
	baseUrl: row.baseUrl,
});
