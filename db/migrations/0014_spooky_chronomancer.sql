CREATE TYPE "public"."feedback_type" AS ENUM('BUG', 'SUGGESTION', 'DEV_MODE_LOG');--> statement-breakpoint
ALTER TABLE "afe-feedbacks" ALTER COLUMN "feedback_type" SET DEFAULT 'BUG'::"public"."feedback_type";--> statement-breakpoint
ALTER TABLE "afe-feedbacks" ALTER COLUMN "feedback_type" SET DATA TYPE "public"."feedback_type" USING "feedback_type"::"public"."feedback_type";--> statement-breakpoint
ALTER TABLE "afe-feedbacks" ALTER COLUMN "feedback_type" SET NOT NULL;