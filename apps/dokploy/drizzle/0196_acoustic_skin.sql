-- Legacy vKloud migration-lineage compatibility gate.
--
-- Older vKloud deployments created this complete schema through the former
-- local migrations 0186_romantic_betty_brant and 0187_aspiring_amazoness.
-- After upstream reconciliation, the equivalent schema moved to migration
-- 0196_acoustic_skin.
--
-- Behaviour:
-- 1. Fresh database: create the complete vKloud schema below.
-- 2. Complete legacy schema: preserve it and treat this migration as satisfied.
-- 3. Partial legacy schema: fail explicitly instead of guessing or modifying it.

DO $vkloud_lineage$
DECLARE
    existing_object_count integer;
BEGIN
    SELECT count(*)
    INTO existing_object_count
    FROM (
        SELECT to_regclass('public.vkloud_execution_target') IS NOT NULL AS present
        UNION ALL
        SELECT to_regclass('public.vkloud_billing_service') IS NOT NULL
        UNION ALL
        SELECT to_regclass('public.vkloud_provisioning_operation') IS NOT NULL
        UNION ALL
        SELECT to_regclass('public.vkloud_provisioning_resource') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudExecutionAdapter"') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudExecutionPlacement"') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudProvisioningErrorCategory"') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudProvisioningOperationState"') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudProvisioningOperationType"') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudServiceState"') IS NOT NULL
        UNION ALL
        SELECT to_regtype('public."vkloudWorkloadType"') IS NOT NULL
    ) AS expected_objects
    WHERE present;

    IF existing_object_count = 11 THEN
        RAISE NOTICE
            'Complete legacy vKloud schema detected; preserving existing objects.';
        RETURN;
    END IF;

    IF existing_object_count <> 0 THEN
        RAISE EXCEPTION
            'Partial legacy vKloud schema detected: % of 11 expected objects exist. Manual inspection required.',
            existing_object_count;
    END IF;
CREATE TYPE "public"."vkloudExecutionAdapter" AS ENUM('compose', 'application');
CREATE TYPE "public"."vkloudExecutionPlacement" AS ENUM('local', 'remote');
CREATE TYPE "public"."vkloudProvisioningErrorCategory" AS ENUM('validation', 'authentication', 'authorization', 'conflict', 'capacity', 'dependency', 'execution', 'health', 'internal');
CREATE TYPE "public"."vkloudProvisioningOperationState" AS ENUM('accepted', 'running', 'succeeded', 'failed', 'cancelled');
CREATE TYPE "public"."vkloudProvisioningOperationType" AS ENUM('deploy', 'status', 'suspend', 'unsuspend', 'terminate', 'rotate_credentials', 'health_check');
CREATE TYPE "public"."vkloudServiceState" AS ENUM('pending', 'provisioning', 'active', 'suspending', 'suspended', 'unsuspending', 'terminating', 'terminated', 'failed', 'reconciling');
CREATE TYPE "public"."vkloudWorkloadType" AS ENUM('saas', 'vpstack');
CREATE TABLE "vkloud_execution_target" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"policy" text NOT NULL,
	"adapter" "vkloudExecutionAdapter" NOT NULL,
	"environment_id" text NOT NULL,
	"placement" "vkloudExecutionPlacement" NOT NULL,
	"server_id" text,
	"template_id" text NOT NULL,
	"template_version" text NOT NULL,
	"base_url" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vkloud_execution_target_placement_check" CHECK (
                (
                    "vkloud_execution_target"."placement" = 'local'
                    AND "vkloud_execution_target"."server_id" IS NULL
                )
                OR
                (
                    "vkloud_execution_target"."placement" = 'remote'
                    AND "vkloud_execution_target"."server_id" IS NOT NULL
                )
            )
);

CREATE TABLE "vkloud_billing_service" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"billing_source" text DEFAULT 'vpay' NOT NULL,
	"billing_customer_id" text NOT NULL,
	"billing_service_id" text NOT NULL,
	"workload_type" "vkloudWorkloadType" NOT NULL,
	"product_id" text NOT NULL,
	"template_id" text NOT NULL,
	"template_version" text NOT NULL,
	"target_policy" text NOT NULL,
	"service_state" "vkloudServiceState" DEFAULT 'pending' NOT NULL,
	"customer_safe_properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_reconciled_at" timestamp,
	"terminated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "vkloud_provisioning_operation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"billing_service_mapping_id" text NOT NULL,
	"operation" "vkloudProvisioningOperationType" NOT NULL,
	"operation_state" "vkloudProvisioningOperationState" DEFAULT 'accepted' NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"safe_error_code" text,
	"safe_error_category" "vkloudProvisioningErrorCategory",
	"retryable" boolean DEFAULT false NOT NULL,
	"support_reference" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "vkloud_provisioning_resource" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"billing_service_mapping_id" text NOT NULL,
	"created_by_operation_id" text,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"resource_name" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "vkloud_execution_target" ADD CONSTRAINT "vkloud_execution_target_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vkloud_execution_target" ADD CONSTRAINT "vkloud_execution_target_environment_id_environment_environmentId_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("environmentId") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "vkloud_execution_target" ADD CONSTRAINT "vkloud_execution_target_server_id_server_serverId_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("serverId") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "vkloud_billing_service" ADD CONSTRAINT "vkloud_billing_service_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vkloud_provisioning_operation" ADD CONSTRAINT "vkloud_provisioning_operation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vkloud_provisioning_operation" ADD CONSTRAINT "vkloud_provisioning_operation_billing_service_mapping_id_vkloud_billing_service_id_fk" FOREIGN KEY ("billing_service_mapping_id") REFERENCES "public"."vkloud_billing_service"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "vkloud_provisioning_resource" ADD CONSTRAINT "vkloud_provisioning_resource_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vkloud_provisioning_resource" ADD CONSTRAINT "vkloud_provisioning_resource_billing_service_mapping_id_vkloud_billing_service_id_fk" FOREIGN KEY ("billing_service_mapping_id") REFERENCES "public"."vkloud_billing_service"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "vkloud_provisioning_resource" ADD CONSTRAINT "vkloud_provisioning_resource_created_by_operation_id_vkloud_provisioning_operation_id_fk" FOREIGN KEY ("created_by_operation_id") REFERENCES "public"."vkloud_provisioning_operation"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "vkloud_execution_target_org_policy_uidx" ON "vkloud_execution_target" USING btree ("organization_id","policy");
CREATE INDEX "vkloud_execution_target_organization_idx" ON "vkloud_execution_target" USING btree ("organization_id");
CREATE UNIQUE INDEX "vkloud_billing_service_identity_uidx" ON "vkloud_billing_service" USING btree ("organization_id","billing_source","billing_service_id");
CREATE INDEX "vkloud_billing_service_organization_idx" ON "vkloud_billing_service" USING btree ("organization_id");
CREATE INDEX "vkloud_billing_service_state_idx" ON "vkloud_billing_service" USING btree ("service_state");
CREATE UNIQUE INDEX "vkloud_provisioning_operation_idempotency_uidx" ON "vkloud_provisioning_operation" USING btree ("organization_id","idempotency_key");
CREATE INDEX "vkloud_provisioning_operation_service_idx" ON "vkloud_provisioning_operation" USING btree ("billing_service_mapping_id");
CREATE INDEX "vkloud_provisioning_operation_state_idx" ON "vkloud_provisioning_operation" USING btree ("operation_state");
CREATE UNIQUE INDEX "vkloud_provisioning_resource_identity_uidx" ON "vkloud_provisioning_resource" USING btree ("organization_id","resource_type","resource_id");
CREATE INDEX "vkloud_provisioning_resource_service_idx" ON "vkloud_provisioning_resource" USING btree ("billing_service_mapping_id");
CREATE INDEX "vkloud_provisioning_resource_organization_idx" ON "vkloud_provisioning_resource" USING btree ("organization_id");
CREATE INDEX "vkloud_provisioning_resource_operation_idx" ON "vkloud_provisioning_resource" USING btree ("created_by_operation_id");
END;
$vkloud_lineage$;