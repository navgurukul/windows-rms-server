CREATE TABLE "NGOs" (
	"id" serial PRIMARY KEY NOT NULL,
	"NGO_name" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "device_wallpapers" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"wallpaper_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "device_wallpapers_device_id_wallpaper_id_key" UNIQUE("device_id","wallpaper_id")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"serial_number" varchar(50) NOT NULL,
	"mac_address" varchar(50) NOT NULL,
	"ngo_id" integer,
	"donor_id" integer,
	"rms_version" varchar(50) DEFAULT '0.0.0',
	"location" varchar(255) NOT NULL,
	"isactive" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "devices_serial_number_key" UNIQUE("serial_number")
);
--> statement-breakpoint
CREATE TABLE "donor_softwares" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_id" integer NOT NULL,
	"software_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "donor_softwares_donor_id_software_id_key" UNIQUE("donor_id","software_id")
);
--> statement-breakpoint
CREATE TABLE "donor_wallpapers" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_id" integer NOT NULL,
	"wallpaper_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "donor_wallpapers_donor_id_wallpaper_id_key" UNIQUE("donor_id","wallpaper_id")
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" serial PRIMARY KEY NOT NULL,
	"donor_name" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "laptop_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"total_active_time" integer NOT NULL,
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"location_name" varchar(255),
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ngo_softwares" (
	"id" serial PRIMARY KEY NOT NULL,
	"ngo_id" integer NOT NULL,
	"software_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ngo_softwares_ngo_id_software_id_key" UNIQUE("ngo_id","software_id")
);
--> statement-breakpoint
CREATE TABLE "ngo_wallpapers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ngo_id" integer NOT NULL,
	"wallpaper_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "ngo_wallpapers_ngo_id_wallpaper_id_key" UNIQUE("ngo_id","wallpaper_id")
);
--> statement-breakpoint
CREATE TABLE "softwares" (
	"id" serial PRIMARY KEY NOT NULL,
	"software_name" varchar(255) NOT NULL,
	"winget_id" varchar(255) NOT NULL,
	"is_global" boolean DEFAULT true,
	"isactive" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "softwares_installed" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"software_name" varchar(255) NOT NULL,
	"issuccessful" boolean,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "wallpapers" (
	"id" serial PRIMARY KEY NOT NULL,
	"wallpaper_url" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "device_wallpapers" ADD CONSTRAINT "device_wallpapers_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_wallpapers" ADD CONSTRAINT "device_wallpapers_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_softwares" ADD CONSTRAINT "donor_softwares_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_softwares" ADD CONSTRAINT "donor_softwares_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "public"."softwares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_wallpapers" ADD CONSTRAINT "donor_wallpapers_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_wallpapers" ADD CONSTRAINT "donor_wallpapers_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laptop_tracking" ADD CONSTRAINT "laptop_tracking_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_softwares" ADD CONSTRAINT "ngo_softwares_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_softwares" ADD CONSTRAINT "ngo_softwares_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "public"."softwares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_wallpapers" ADD CONSTRAINT "ngo_wallpapers_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_wallpapers" ADD CONSTRAINT "ngo_wallpapers_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "softwares_installed" ADD CONSTRAINT "softwares_installed_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE no action ON UPDATE no action;