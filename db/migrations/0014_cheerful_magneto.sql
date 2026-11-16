ALTER TABLE "softwares" ADD COLUMN "installer_type" varchar(50) DEFAULT 'winget';--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "silent_args" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "run_as" varchar(30) DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "elevation" varchar(30) DEFAULT 'highest';--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "pre_install_script" text;--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "post_install_script" text;--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "custom_install_script" text;--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "process_name_to_wait" varchar(100);--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "timeout_seconds" integer DEFAULT 600;--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "success_exit_codes" varchar(50) DEFAULT '0,3010';