import type {
	VkloudAuditAction,
	VkloudAuditResourceType,
} from "@dokploy/server/services/vkloud/audit";
import { ClipboardList, RefreshCw, X } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

const ACTION_OPTIONS: Array<{
	value: VkloudAuditAction;
	label: string;
}> = [
	{ value: "create", label: "Created" },
	{ value: "update", label: "Updated" },
	{ value: "delete", label: "Deleted" },
	{ value: "deploy", label: "Deployed" },
	{ value: "redeploy", label: "Redeployed" },
	{ value: "login", label: "Login" },
	{ value: "logout", label: "Logout" },
	{ value: "provision", label: "Provisioned" },
	{ value: "suspend", label: "Suspended" },
	{ value: "unsuspend", label: "Unsuspended" },
	{ value: "terminate", label: "Terminated" },
	{ value: "rotateCredentials", label: "Credentials rotated" },
	{ value: "healthCheck", label: "Health checked" },
];

const RESOURCE_OPTIONS: Array<{
	value: VkloudAuditResourceType;
	label: string;
}> = [
	{ value: "application", label: "Applications" },
	{ value: "billingService", label: "Billing services" },
	{ value: "deployment", label: "Deployments" },
	{ value: "organization", label: "Organizations" },
	{ value: "dnsProvider", label: "DNS providers" },
	{ value: "network", label: "Networks" },
	{ value: "vaultProvider", label: "Vault providers" },
	{ value: "product", label: "Products" },
	{ value: "provisioningOperation", label: "Provisioning operations" },
	{ value: "service", label: "Services" },
	{ value: "session", label: "Sessions" },
	{ value: "template", label: "Templates" },
];

const PAGE_SIZE = 25;

const displayValue = (value: string | null) => value || "Not specified";

const formatTimestamp = (value: Date) =>
	new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));

const formatMetadata = (metadata: string | null) => {
	if (!metadata) {
		return "None";
	}

	try {
		return JSON.stringify(JSON.parse(metadata), null, 2);
	} catch {
		return metadata;
	}
};

export function ShowAuditLogs() {
	const [pageIndex, setPageIndex] = React.useState(0);
	const [userEmail, setUserEmail] = React.useState("");
	const [resourceName, setResourceName] = React.useState("");
	const [action, setAction] = React.useState<VkloudAuditAction | "">("");
	const [resourceType, setResourceType] = React.useState<
		VkloudAuditResourceType | ""
	>("");

	const [debouncedSearch, setDebouncedSearch] = React.useState({
		userEmail: "",
		resourceName: "",
	});

	React.useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedSearch({ userEmail, resourceName });
			setPageIndex(0);
		}, 400);

		return () => clearTimeout(timeout);
	}, [resourceName, userEmail]);

	const query = api.auditLog.all.useQuery(
		{
			userEmail: debouncedSearch.userEmail || undefined,
			resourceName: debouncedSearch.resourceName || undefined,
			action: action || undefined,
			resourceType: resourceType || undefined,
			limit: PAGE_SIZE,
			offset: pageIndex * PAGE_SIZE,
		},
		{
			refetchOnWindowFocus: false,
		},
	);

	const logs = query.data?.logs ?? [];
	const total = query.data?.total ?? 0;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const hasFilters = Boolean(
		userEmail || resourceName || action || resourceType,
	);

	const clearFilters = () => {
		setUserEmail("");
		setResourceName("");
		setAction("");
		setResourceType("");
		setPageIndex(0);
	};

	return (
		<Card className="mx-auto w-full max-w-7xl rounded-xl bg-sidebar p-2.5">
			<div className="rounded-xl bg-background shadow-md">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div>
							<CardTitle className="flex items-center gap-2 text-xl">
								<ClipboardList className="h-5 w-5 text-muted-foreground" />
								vKloud Audit Logs
							</CardTitle>
							<CardDescription>
								Track operator, authentication, deployment, and provisioning
								activity across your organization.
							</CardDescription>
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={() => query.refetch()}
							disabled={query.isFetching}
						>
							<RefreshCw
								className={`mr-2 h-4 w-4 ${
									query.isFetching ? "animate-spin" : ""
								}`}
							/>
							Refresh
						</Button>
					</div>
				</CardHeader>

				<CardContent className="space-y-4 border-t py-6">
					<div className="flex flex-wrap items-center gap-2">
						<Input
							value={userEmail}
							onChange={(event) => setUserEmail(event.target.value)}
							placeholder="Filter by user email"
							className="max-w-xs"
						/>

						<Input
							value={resourceName}
							onChange={(event) => setResourceName(event.target.value)}
							placeholder="Filter by resource name"
							className="max-w-xs"
						/>

						<Select
							value={action || "__all__"}
							onValueChange={(value) => {
								setAction(
									value === "__all__" ? "" : (value as VkloudAuditAction),
								);
								setPageIndex(0);
							}}
						>
							<SelectTrigger className="w-[190px]">
								<SelectValue placeholder="All actions" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All actions</SelectItem>
								{ACTION_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={resourceType || "__all__"}
							onValueChange={(value) => {
								setResourceType(
									value === "__all__" ? "" : (value as VkloudAuditResourceType),
								);
								setPageIndex(0);
							}}
						>
							<SelectTrigger className="w-[220px]">
								<SelectValue placeholder="All resources" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All resources</SelectItem>
								{RESOURCE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						{hasFilters && (
							<Button variant="ghost" size="sm" onClick={clearFilters}>
								<X className="mr-1 h-4 w-4" />
								Clear
							</Button>
						)}
					</div>

					<div className="overflow-auto rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Resource</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Metadata</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{query.isLoading ? (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											Loading audit events...
										</TableCell>
									</TableRow>
								) : logs.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="h-24 text-center">
											No audit events found.
										</TableCell>
									</TableRow>
								) : (
									logs.map((log) => (
										<TableRow key={log.id}>
											<TableCell className="whitespace-nowrap">
												{formatTimestamp(log.createdAt)}
											</TableCell>
											<TableCell>{log.userEmail}</TableCell>
											<TableCell className="font-medium">
												{log.action}
											</TableCell>
											<TableCell>{log.resourceType}</TableCell>
											<TableCell>{displayValue(log.resourceName)}</TableCell>
											<TableCell className="capitalize">
												{log.userRole}
											</TableCell>
											<TableCell>
												<details className="max-w-sm">
													<summary className="cursor-pointer text-sm text-muted-foreground">
														View
													</summary>
													<pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
														{formatMetadata(log.metadata)}
													</pre>
												</details>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>
							{total} {total === 1 ? "event" : "events"}
						</span>

						<div className="flex items-center gap-3">
							<span>
								Page {pageIndex + 1} of {pageCount}
							</span>

							<Button
								variant="outline"
								size="sm"
								disabled={pageIndex === 0}
								onClick={() => setPageIndex((current) => current - 1)}
							>
								Previous
							</Button>

							<Button
								variant="outline"
								size="sm"
								disabled={pageIndex + 1 >= pageCount}
								onClick={() => setPageIndex((current) => current + 1)}
							>
								Next
							</Button>
						</div>
					</div>
				</CardContent>
			</div>
		</Card>
	);
}
