CREATE TABLE "NGOs" (
	"id" serial PRIMARY KEY NOT NULL,
	"NGO_name" varchar(500) NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
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
ALTER TABLE "devices" ADD COLUMN "ngo_id" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "donor_id" integer;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "rms_version" varchar(50) DEFAULT '0.0.0';--> statement-breakpoint
ALTER TABLE "softwares" ADD COLUMN "is_global" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "donor_softwares" ADD CONSTRAINT "donor_softwares_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_softwares" ADD CONSTRAINT "donor_softwares_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "public"."softwares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_wallpapers" ADD CONSTRAINT "donor_wallpapers_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donor_wallpapers" ADD CONSTRAINT "donor_wallpapers_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_softwares" ADD CONSTRAINT "ngo_softwares_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_softwares" ADD CONSTRAINT "ngo_softwares_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "public"."softwares"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_wallpapers" ADD CONSTRAINT "ngo_wallpapers_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ngo_wallpapers" ADD CONSTRAINT "ngo_wallpapers_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "public"."wallpapers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "public"."NGOs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_donor_id_fkey" FOREIGN KEY ("donor_id") REFERENCES "public"."donors"("id") ON DELETE no action ON UPDATE no action;