ALTER TABLE "afe_details" ALTER COLUMN "school_type" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "afe_details" ALTER COLUMN "school_type" SET DEFAULT 'Government School';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "district_code" varchar(50);