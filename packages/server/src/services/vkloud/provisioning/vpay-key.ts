import { db } from "@dokploy/server/db";
import { apikey } from "@dokploy/server/db/schema";
import { auth } from "@dokploy/server/lib/auth";
import { eq } from "drizzle-orm";
import { buildVpayProvisioningApiKeyMetadata } from "./vpay-key-metadata";

export interface CreateVpayProvisioningApiKeyInput {
	userId: string;
	organizationId: string;
	name: string;
	prefix?: string;
	expiresIn?: number;
	rateLimitEnabled?: boolean;
	rateLimitTimeWindow?: number;
	rateLimitMax?: number;
}

export const createVpayProvisioningApiKey = async (
	input: CreateVpayProvisioningApiKeyInput,
) => {
	const result = await auth.createApiKey({
		body: {
			name: input.name,
			userId: input.userId,
			prefix: input.prefix,
			expiresIn: input.expiresIn,
			rateLimitEnabled: input.rateLimitEnabled,
			rateLimitTimeWindow: input.rateLimitTimeWindow,
			rateLimitMax: input.rateLimitMax,
		},
	});

	try {
		const updated = await db
			.update(apikey)
			.set({
				metadata: JSON.stringify(
					buildVpayProvisioningApiKeyMetadata(input.organizationId),
				),
			})
			.where(eq(apikey.id, result.id))
			.returning({ id: apikey.id })
			.then((rows) => rows[0]);

		if (!updated) {
			throw new Error("Failed to scope vPay provisioning API key");
		}

		return result;
	} catch (error) {
		await db.delete(apikey).where(eq(apikey.id, result.id));
		throw error;
	}
};
