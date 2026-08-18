CREATE TYPE "public"."vkloudProvisioningErrorCategory" AS ENUM('validation', 'authentication', 'authorization', 'conflict', 'capacity', 'dependency', 'execution', 'health', 'internal');--> statement-breakpoint
CREATE TYPE "public"."vkloudProvisioningOperationState" AS ENUM('accepted', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."vkloudProvisioningOperationType" AS ENUM('deploy', 'status', 'suspend', 'unsuspend', 'terminate', 'rotate_credentials', 'health_check');--> statement-breakpoint
CREATE TYPE "public"."vkloudServiceState" AS ENUM('pending', 'provisioning', 'active', 'suspending', 'suspended', 'unsuspending', 'terminating', 'terminated', 'failed', 'reconciling');--> statement-breakpoint
CREATE TYPE "public"."vkloudWorkloadType" AS ENUM('saas', 'vpstack');--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "vkloud_billing_service" ADD CONSTRAINT "vkloud_billing_service_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_provisioning_operation" ADD CONSTRAINT "vkloud_provisioning_operation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_provisioning_operation" ADD CONSTRAINT "vkloud_provisioning_operation_billing_service_mapping_id_vkloud_billing_service_id_fk" FOREIGN KEY ("billing_service_mapping_id") REFERENCES "public"."vkloud_billing_service"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_provisioning_resource" ADD CONSTRAINT "vkloud_provisioning_resource_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_provisioning_resource" ADD CONSTRAINT "vkloud_provisioning_resource_billing_service_mapping_id_vkloud_billing_service_id_fk" FOREIGN KEY ("billing_service_mapping_id") REFERENCES "public"."vkloud_billing_service"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_provisioning_resource" ADD CONSTRAINT "vkloud_provisioning_resource_created_by_operation_id_vkloud_provisioning_operation_id_fk" FOREIGN KEY ("created_by_operation_id") REFERENCES "public"."vkloud_provisioning_operation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vkloud_billing_service_identity_uidx" ON "vkloud_billing_service" USING btree ("organization_id","billing_source","billing_service_id");--> statement-breakpoint
CREATE INDEX "vkloud_billing_service_organization_idx" ON "vkloud_billing_service" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "vkloud_billing_service_state_idx" ON "vkloud_billing_service" USING btree ("service_state");--> statement-breakpoint
CREATE UNIQUE INDEX "vkloud_provisioning_operation_idempotency_uidx" ON "vkloud_provisioning_operation" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "vkloud_provisioning_operation_service_idx" ON "vkloud_provisioning_operation" USING btree ("billing_service_mapping_id");--> statement-breakpoint
CREATE INDEX "vkloud_provisioning_operation_state_idx" ON "vkloud_provisioning_operation" USING btree ("operation_state");--> statement-breakpoint
CREATE UNIQUE INDEX "vkloud_provisioning_resource_identity_uidx" ON "vkloud_provisioning_resource" USING btree ("organization_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "vkloud_provisioning_resource_service_idx" ON "vkloud_provisioning_resource" USING btree ("billing_service_mapping_id");--> statement-breakpoint
CREATE INDEX "vkloud_provisioning_resource_organization_idx" ON "vkloud_provisioning_resource" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "vkloud_provisioning_resource_operation_idx" ON "vkloud_provisioning_resource" USING btree ("created_by_operation_id");