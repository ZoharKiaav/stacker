import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	findMany: vi.fn(),
	count: vi.fn(),
	and: vi.fn((...conditions: unknown[]) => ({
		operator: "and",
		conditions,
	})),
	desc: vi.fn((column: unknown) => ({
		operator: "desc",
		column,
	})),
	eq: vi.fn((column: unknown, value: unknown) => ({
		operator: "eq",
		column,
		value,
	})),
	gte: vi.fn((column: unknown, value: unknown) => ({
		operator: "gte",
		column,
		value,
	})),
	ilike: vi.fn((column: unknown, value: unknown) => ({
		operator: "ilike",
		column,
		value,
	})),
	lte: vi.fn((column: unknown, value: unknown) => ({
		operator: "lte",
		column,
		value,
	})),
}));

vi.mock("@dokploy/server/db", () => ({
	db: {
		query: {
			auditLog: {
				findMany: mocks.findMany,
			},
		},
		$count: mocks.count,
	},
}));

vi.mock("@dokploy/server/db/schema", () => ({
	auditLog: {
		organizationId: "organizationId",
		userId: "userId",
		userEmail: "userEmail",
		resourceName: "resourceName",
		action: "action",
		resourceType: "resourceType",
		createdAt: "createdAt",
	},
}));

vi.mock("drizzle-orm", () => ({
	and: mocks.and,
	desc: mocks.desc,
	eq: mocks.eq,
	gte: mocks.gte,
	ilike: mocks.ilike,
	lte: mocks.lte,
}));

import { getVkloudAuditEvents } from "@dokploy/server/services/vkloud/audit/audit-query";

describe("getVkloudAuditEvents", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.findMany.mockResolvedValue([]);
		mocks.count.mockResolvedValue(0);
	});

	it("always scopes queries to the requested organization", async () => {
		await getVkloudAuditEvents({
			organizationId: "organization-one",
		});

		expect(mocks.eq).toHaveBeenCalledWith("organizationId", "organization-one");

		expect(mocks.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				limit: 50,
				offset: 0,
			}),
		);
	});

	it("applies all supported filters", async () => {
		const from = new Date("2026-08-01T00:00:00.000Z");
		const to = new Date("2026-08-31T23:59:59.999Z");

		await getVkloudAuditEvents({
			organizationId: "organization-one",
			userId: "user-one",
			userEmail: "owner@example.com",
			resourceName: "customer-app",
			action: "provision",
			resourceType: "provisioningOperation",
			from,
			to,
		});

		expect(mocks.eq).toHaveBeenCalledWith("organizationId", "organization-one");
		expect(mocks.eq).toHaveBeenCalledWith("userId", "user-one");
		expect(mocks.eq).toHaveBeenCalledWith("action", "provision");
		expect(mocks.eq).toHaveBeenCalledWith(
			"resourceType",
			"provisioningOperation",
		);
		expect(mocks.ilike).toHaveBeenCalledWith(
			"userEmail",
			"%owner@example.com%",
		);
		expect(mocks.ilike).toHaveBeenCalledWith("resourceName", "%customer-app%");
		expect(mocks.gte).toHaveBeenCalledWith("createdAt", from);
		expect(mocks.lte).toHaveBeenCalledWith("createdAt", to);
	});

	it("passes pagination and newest-first ordering to the database", async () => {
		await getVkloudAuditEvents({
			organizationId: "organization-one",
			limit: 25,
			offset: 50,
		});

		expect(mocks.desc).toHaveBeenCalledWith("createdAt");
		expect(mocks.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				limit: 25,
				offset: 50,
				orderBy: [
					{
						operator: "desc",
						column: "createdAt",
					},
				],
			}),
		);
	});

	it("returns logs, total count and pagination information", async () => {
		const logs = [
			{
				id: "audit-one",
				action: "login",
				resourceType: "session",
			},
		];

		mocks.findMany.mockResolvedValue(logs);
		mocks.count.mockResolvedValue(1);

		const result = await getVkloudAuditEvents({
			organizationId: "organization-one",
			limit: 25,
			offset: 0,
		});

		expect(result).toEqual({
			logs,
			total: 1,
			limit: 25,
			offset: 0,
		});
	});

	it("uses the same organization-scoped condition for rows and count", async () => {
		await getVkloudAuditEvents({
			organizationId: "organization-two",
		});

		const findManyInput = mocks.findMany.mock.calls[0]?.[0];
		const countWhere = mocks.count.mock.calls[0]?.[1];

		expect(findManyInput.where).toBe(countWhere);
		expect(findManyInput.where).toEqual(
			expect.objectContaining({
				operator: "and",
			}),
		);
	});
});
