CREATE TABLE "afe_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" varchar(255),
	"mac_address" varchar(50),
	"device_id" integer,
	"ngo_id" integer,
	"partner_name" varchar(100),
	"school_name" varchar(255),
	"school_udise" varchar(20),
	"state" varchar(100),
	"city" varchar(100),
	"district" varchar(100),
	"district_code" varchar(50),
	"school_type" varchar(100),
	"platform_os" varchar(50),
	"has_rms" boolean DEFAULT false,
	"historical_sync" boolean DEFAULT false,
	"last_synced_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "afe_devices" ADD CONSTRAINT "afe_devices_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "afe_devices" ADD CONSTRAINT "afe_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;