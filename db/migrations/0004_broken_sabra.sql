ALTER TABLE "afe_details" DROP CONSTRAINT "afe_details_unique";--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "session_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "data_collection_method" varchar(100) DEFAULT 'Method 2 - Individual Tracking';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "partner_name" varchar(100) DEFAULT 'sama';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "session_date" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "academic_year" varchar(15);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "month_name" varchar(20);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "school_udise" varchar(20);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "school_name" varchar(255);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "school_type" varchar(50) DEFAULT 'NGO';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "grade" integer;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "student_count" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "student_dummy_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "class_section" varchar(50);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "unit_type" varchar(100) DEFAULT 'Modular AFE';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "tour_type" varchar(50) DEFAULT 'Virtual';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "language" varchar(50) DEFAULT 'English';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "delivery_model" varchar(100) DEFAULT 'Self-paced';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "session_duration_minutes" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "csat_avg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "itp_avg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "nps_score" integer;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "response_rate_percentage" numeric(5, 2) DEFAULT '100.00';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "video_completion_rate" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "quiz_accuracy_percentage" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "avg_watch_time_seconds" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "videos_completed_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "quizzes_completed_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "total_questions_answered" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "correct_answers_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "session_completed_flag" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "completion_percentage" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "total_watch_time_seconds" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "avg_playback_speed" numeric(5, 2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "pause_count_total" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "seek_count_total" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "facilitator_name" varchar(255);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "teacher_confidence_rating" integer;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "teacher_feedback_text" text;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "implementation_challenges" text;--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "device_type" varchar(50) DEFAULT 'Laptop';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "platform_os" varchar(50);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "platform_version" varchar(50);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "app_version" varchar(50);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "network_type" varchar(50);--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "data_source" varchar(50) DEFAULT 'Local DB';--> statement-breakpoint
ALTER TABLE "afe_details" ADD COLUMN "submission_date" varchar(10);--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "student_uuid";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "student_name";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "snapshot_date";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "modules_started";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "modules_completed";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "time_watched";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "time_read";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "avg_quiz_score";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "learning_summary_text";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "learning_summary_progress_note";--> statement-breakpoint
ALTER TABLE "afe_details" DROP COLUMN "learning_summary_updated_at";--> statement-breakpoint
ALTER TABLE "afe_details" ADD CONSTRAINT "afe_details_session_id_key" UNIQUE("session_id");