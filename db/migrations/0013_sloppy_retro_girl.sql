CREATE TYPE "public"."feedback_status" AS ENUM('RECEIVED', 'IN PROGRESS', 'RESOLVED');--> statement-breakpoint
CREATE TABLE "afe-feedbacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer,
	"serial_number" varchar(255),
	"school_udise" varchar(50),
	"school_name" varchar(255),
	"message" text,
	"feedback_type" varchar(50) DEFAULT 'USER_FEEDBACK',
	"screenshot_url" varchar(500),
	"log_file_url" varchar(500),
	"status" "feedback_status" DEFAULT 'RECEIVED' NOT NULL,
	"is_dev_mode" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "afe-feedbacks" ADD CONSTRAINT "afe_feedbacks_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;