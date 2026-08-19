/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in.
 */

// import { getServerAuthSession } from "@/server/auth";
import { db } from "@dokploy/server/db";
import type { AuthenticationContext } from "@dokploy/server/index";
import {
	hasValidLicense,
	isVpayProvisioningAuthentication,
} from "@dokploy/server/index";
import type { statements } from "@dokploy/server/lib/access-control";
import { validateRequest } from "@dokploy/server/lib/auth";
import { checkPermission } from "@dokploy/server/services/permission";
import type { OpenApiMeta } from "@dokploy/trpc-openapi";
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import type { Session, User } from "better-auth";
import superjson from "superjson";
import { ZodError } from "zod";

type Resource = keyof typeof statements;
type ActionOf<R extends Resource> = (typeof statements)[R][number];

interface CreateContextOptions {
	user:
		| (User & {
				role: "member" | "admin" | "owner";
				ownerId: string;
				enableEnterpriseFeatures: boolean;
				isValidEnterpriseLicense: boolean;
		  })
		| null;
	session:
		| (Session & {
				activeOrganizationId: string;
				impersonatedBy?: string;
		  })
		| null;
	authentication?: AuthenticationContext | null;
	req: CreateNextContextOptions["req"];
	res: CreateNextContextOptions["res"];
}

type InnerTRPCContext = {
	session: CreateContextOptions["session"];
	db: typeof db;
	req: CreateContextOptions["req"];
	res: CreateContextOptions["res"];
	user: CreateContextOptions["user"];
	authentication?: AuthenticationContext | null;
};

const createInnerTRPCContext = (
	opts: CreateContextOptions,
): InnerTRPCContext => ({
	session: opts.session,
	db,
	req: opts.req,
	res: opts.res,
	user: opts.user,
	...(opts.authentication !== undefined
		? { authentication: opts.authentication }
		: {}),
});

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
	const { req, res } = opts;

	const { session, user, authentication } = await validateRequest(req);

	return createInnerTRPCContext({
		req,
		res,
		authentication,
		// @ts-expect-error
		session: session
			? {
					...session,
					activeOrganizationId: session.activeOrganizationId || "",
				}
			: null,
		// @ts-expect-error
		user: user
			? {
					...user,
					email: user.email,
					role: user.role as "owner" | "member" | "admin",
					id: user.id,
					ownerId: user.ownerId,
				}
			: null,
	});
};

const t = initTRPC
	.meta<OpenApiMeta>()
	.context<typeof createTRPCContext>()
	.create({
		transformer: superjson,
		errorFormatter({ shape, error }) {
			return {
				...shape,
				data: {
					...shape.data,
					zodError:
						error.cause instanceof ZodError ? error.cause.flatten() : null,
				},
			};
		},
	});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session || !ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({
		ctx: {
			session: ctx.session,
			user: ctx.user,
		},
	});
});

export const vpayProcedure = t.procedure.use(({ ctx, next }) => {
	if (!ctx.session || !ctx.user) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	if (
		!isVpayProvisioningAuthentication(
			ctx.authentication ?? null,
			ctx.session.activeOrganizationId,
		)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Dedicated vPay provisioning API key required",
		});
	}

	return next({
		ctx: {
			session: ctx.session,
			user: ctx.user,
			authentication: ctx.authentication,
		},
	});
});

export const cliProcedure = t.procedure.use(({ ctx, next }) => {
	if (
		!ctx.session ||
		!ctx.user ||
		(ctx.user.role !== "owner" && ctx.user.role !== "admin")
	) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({
		ctx: {
			session: ctx.session,
			user: ctx.user,
		},
	});
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
	if (
		!ctx.session ||
		!ctx.user ||
		(ctx.user.role !== "owner" && ctx.user.role !== "admin")
	) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	return next({
		ctx: {
			session: ctx.session,
			user: ctx.user,
		},
	});
});

export const enterpriseProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (
		!ctx.session ||
		!ctx.user ||
		(ctx.user.role !== "owner" && ctx.user.role !== "admin")
	) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}

	const hasValidLicenseResult = await hasValidLicense(
		ctx.session.activeOrganizationId,
	);

	if (!hasValidLicenseResult) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Valid enterprise license required",
		});
	}

	return next({
		ctx: {
			session: ctx.session,
			user: ctx.user,
		},
	});
});

export const withPermission = <R extends Resource>(
	resource: R,
	action: ActionOf<R>,
) =>
	protectedProcedure.use(async ({ ctx, next }) => {
		await checkPermission(ctx, {
			[resource]: [action],
		} as any);

		return next();
	});
