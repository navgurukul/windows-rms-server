ALTER TABLE "afe_details" ALTER COLUMN "partner_name" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "afe_details" ALTER COLUMN "partner_name" SET DEFAULT 'Sama Digital Foundation – 1';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "country_code" varchar(10) DEFAULT 'IN';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "distribution_channel_host_id" varchar(100) DEFAULT 'Sama Platform 1';