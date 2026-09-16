import { TRPCError } from "@trpc/server";
import type { AuthorizedVpstackComposeIntent } from "./vpstack-compose-authorization";

export interface ExistingComposeResource {
	resourceId: string;
	resourceName: string | null;
}

export interface CreatedComposeRecord {
	composeId: string;
	name: string;
}

export interface EnsuredCustomerAccess {
	primaryUrl: string;
	duplicate: boolean;
}

export interface FirstComposeRecordStore {
	lockBillingService(
		organizationId: string,
		billingServiceMappingId: string,
	): Promise<void>;

	findExistingComposeResource(
		organizationId: string,
		billingServiceMappingId: string,
	): Promise<ExistingComposeResource | null>;

	createCompose(
		input: AuthorizedVpstackComposeIntent["compose"],
	): Promise<CreatedComposeRecord>;

	ensureCustomerAccess(input: {
		composeId: string;
		intent: AuthorizedVpstackComposeIntent;
	}): Promise<EnsuredCustomerAccess>;

	registerPrimaryResource(input: {
		organizationId: string;
		billingServiceMappingId: string;
		operationId: string;
		resourceId: string;
		resourceName: string;
	}): Promise<void>;
}

export interface PersistFirstComposeRecordInput {
	organizationId: string;
	intent: AuthorizedVpstackComposeIntent;
}

export interface PersistFirstComposeRecordResult {
	composeId: string;
	resourceName: string;
	duplicate: boolean;
	primaryUrl: string;
	accessDuplicate: boolean;
}

export const persistFirstComposeRecord = async (
	store: FirstComposeRecordStore,
	input: PersistFirstComposeRecordInput,
): Promise<PersistFirstComposeRecordResult> => {
	await store.lockBillingService(
		input.organizationId,
		input.intent.billingServiceMappingId,
	);

	const existing = await store.findExistingComposeResource(
		input.organizationId,
		input.intent.billingServiceMappingId,
	);

	if (existing) {
		const access = await store.ensureCustomerAccess({
			composeId: existing.resourceId,
			intent: input.intent,
		});

		return {
			composeId: existing.resourceId,
			resourceName: existing.resourceName ?? input.intent.compose.name,
			duplicate: true,
			primaryUrl: access.primaryUrl,
			accessDuplicate: access.duplicate,
		};
	}

	const compose = await store.createCompose(input.intent.compose);

	if (!compose.composeId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Compose record was not created",
		});
	}

	await store.registerPrimaryResource({
		organizationId: input.organizationId,
		billingServiceMappingId: input.intent.billingServiceMappingId,
		operationId: input.intent.operationId,
		resourceId: compose.composeId,
		resourceName: compose.name,
	});

	const access = await store.ensureCustomerAccess({
		composeId: compose.composeId,
		intent: input.intent,
	});

	return {
		composeId: compose.composeId,
		resourceName: compose.name,
		duplicate: false,
		primaryUrl: access.primaryUrl,
		accessDuplicate: access.duplicate,
	};
};
