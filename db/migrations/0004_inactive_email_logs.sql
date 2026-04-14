CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "device_id" integer NOT NULL,
    "last_active_at" timestamp NOT NULL,
    "recipient_email" varchar(255) NOT NULL,
    "inactive_days" integer NOT NULL,
    "sent_at" timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_logs_device_last_active_recipient_key" ON "email_logs" (
    "device_id",
    "last_active_at",
    "recipient_email"
);

-- Optional: add FK to enforce device integrity.
-- This will require that every email log refers to an existing device.
-- ALTER TABLE "email_logs"
--     ADD CONSTRAINT "email_logs_device_id_fkey"
--     FOREIGN KEY ("device_id") REFERENCES "devices" ("id")
--     ON DELETE CASCADE;

-- Optional: add index to speed up the cron query.
-- This optimizes DISTINCT ON (device_id) ORDER BY timestamp DESC in laptop_tracking.
-- CREATE INDEX IF NOT EXISTS "laptop_tracking_device_timestamp_idx"
--     ON "laptop_tracking" ("device_id", "timestamp" DESC);