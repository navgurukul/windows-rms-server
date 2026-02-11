CREATE TABLE "afe_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"ngo_id" integer,
	"device_id" integer,
	"student_uuid" varchar(255) NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"snapshot_date" varchar(10) NOT NULL,
	"modules_started" integer DEFAULT 0 NOT NULL,
	"modules_completed" integer DEFAULT 0 NOT NULL,
	"time_watched" integer DEFAULT 0 NOT NULL,
	"time_read" integer DEFAULT 0 NOT NULL,
	"avg_quiz_score" numeric(5, 2) DEFAULT '0',
	"learning_summary_text" text,
	"learning_summary_progress_note" text,
	"learning_summary_updated_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "afe_details_unique" UNIQUE("device_id","student_uuid","snapshot_date")
);
--> statement-breakpoint
ALTER TABLE "NGOs" ADD COLUMN "unique_key" varchar(30) DEFAULT 'D3F41T-K37' NOT NULL;--> statement-breakpoint
ALTER TABLE "afe_details" ADD CONSTRAINT "afe_details_ngo_id_NGOs_id_fk" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afe_details" ADD CONSTRAINT "afe_details_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afe_details" ADD CONSTRAINT "afe_details_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afe_details" ADD CONSTRAINT "afe_details_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "NGOs" ADD CONSTRAINT "NGOs_unique_key_unique" UNIQUE("unique_key");