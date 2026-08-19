import { z } from "zod";
import {
	type ExecutionAdapter,
	executionAdapterSchema,
} from "./execution-contract";

export const executionTargetSchema = z.object({
	policy: z.string().min(1).max(100),
	adapter: executionAdapterSchema,
	environmentId: z.string().min(1).max(255),
	serverId: z.string().min(1).max(255).nullable(),
	templateSource: z.object({
		templateId: z.string().min(1).max(255),
		templateVersion: z.string().min(1).max(255),
		baseUrl: z.url().nullable(),
	}),
});

export type ExecutionTarget = z.infer<typeof executionTargetSchema>;

export interface ExecutionTargetDefinition {
	policy: string;
	adapter: ExecutionAdapter;
	environmentId: string;
	serverId?: string;
	templateId: string;
	templateVersion: string;
	baseUrl?: string;
}
