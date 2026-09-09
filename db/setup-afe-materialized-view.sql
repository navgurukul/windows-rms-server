-- AFE Overview Materialized View Setup
-- This script sets up the materialized view for AFE overview data aggregation
-- Run this manually after applying migrations: psql -U <username> -d <database> -f db/setup-afe-materialized-view.sql

-- Create materialized view for AFE overview
CREATE MATERIALIZED VIEW IF NOT EXISTS afe_overview_view AS
SELECT
    d.ngo_id,
    COUNT(DISTINCT d.id) as total_laptops,
    COALESCE(
        SUM(
            ad.time_watched + ad.time_read
        ) / 3600.0,
        0
    ) as total_working_hours,
    COALESCE(AVG(ad.avg_quiz_score), 0) as avg_quiz_score,
    COALESCE(AVG(ad.time_watched), 0) as avg_time_watched,
    COALESCE(SUM(ad.time_watched), 0) as total_time_watched,
    COALESCE(AVG(ad.time_read), 0) as avg_time_read,
    COALESCE(SUM(ad.time_read), 0) as total_time_read,
    COUNT(DISTINCT ad.student_uuid) as total_students,
    NOW () as last_updated_at
FROM afe_details ad
    JOIN devices d ON ad.device_id = d.id
GROUP BY
    d.ngo_id;

-- Create unique index on ngo_id for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS afe_overview_ngo_idx ON afe_overview_view (ngo_id);

-- Enable pg_cron extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule refresh every 6 hours (at minutes 0, using cron format)
-- This uses CONCURRENTLY to avoid locking the view during refresh
SELECT cron.schedule(
    'refresh-afe-overview',
    '0 */6 * * *',  -- Every 6 hours at minute 0
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY afe_overview_view$$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'refresh-afe-overview';