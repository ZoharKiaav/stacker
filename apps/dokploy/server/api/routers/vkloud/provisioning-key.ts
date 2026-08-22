import {
	createVpayProvisioningApiKey,
	VPAY_PROVISIONING_PURPOSE,
} from "@dokploy/server";
import { db } from "@dokploy/server/db";
import { apikey } from "@dokploy/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiKeyNameSchema } from "@/lib/api-keys";
import { audit } from "@/server/api/utils/audit";
import { createTRPCRouter, sessionAdminProcedure } from "../../trpc";

const createVpayProvisioningKeyInput = z.object({
	name: apiKeyNameSchema,
	prefix: z.string().optional(),
	expiresIn: z.number().positive().optional(),
	rateLimitEnabled: z.boolean().optional(),
	rateLimitTimeWindow: z.number().positive().optional(),
	rateLimitMax: z.number().positive().optional(),
});

export const vkloudProvisioningKeyRouter = createTRPCRouter({
	create: sessionAdminProcedure
		.input(createVpayProvisioningKeyInput)
		.mutation(async ({ input, ctx }) => {
			const apiKey = await createVpayProvisioningApiKey({
				userId: ctx.user.id,
				organizationId: ctx.session.activeOrganizationId,
				name: input.name,
				prefix: input.prefix,
				expiresIn: input.expiresIn,
				rateLimitEnabled: input.rateLimitEnabled,
				rateLimitTimeWindow: input.rateLimitTimeWindow,
				rateLimitMax: input.rateLimitMax,
			});

			try {
				await audit(ctx, {
					action: "create",
					resourceType: "user",
					resourceId: apiKey.id,
					resourceName: input.name,
					metadata: {
						purpose: VPAY_PROVISIONING_PURPOSE,
					},
				});

				return apiKey;
			} catch (error) {
				await db.delete(apikey).where(eq(apikey.id, apiKey.id));

				throw error;
			}
		}),
});
