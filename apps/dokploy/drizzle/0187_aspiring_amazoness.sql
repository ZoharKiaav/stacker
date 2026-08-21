CREATE TYPE "public"."vkloudExecutionAdapter" AS ENUM('compose', 'application');--> statement-breakpoint
CREATE TYPE "public"."vkloudExecutionPlacement" AS ENUM('local', 'remote');--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "vkloud_execution_target" ADD CONSTRAINT "vkloud_execution_target_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_execution_target" ADD CONSTRAINT "vkloud_execution_target_environment_id_environment_environmentId_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environment"("environmentId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vkloud_execution_target" ADD CONSTRAINT "vkloud_execution_target_server_id_server_serverId_fk" FOREIGN KEY ("server_id") REFERENCES "public"."server"("serverId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vkloud_execution_target_org_policy_uidx" ON "vkloud_execution_target" USING btree ("organization_id","policy");--> statement-breakpoint
CREATE INDEX "vkloud_execution_target_organization_idx" ON "vkloud_execution_target" USING btree ("organization_id");