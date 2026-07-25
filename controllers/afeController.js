const { pool } = require('../config/database');
const DeviceModel = require('../models/deviceModel');
const { Parser } = require('json2csv');

const AFEController = {
    /**
     * Validate NGO key
     * POST /api/afe/validate-key
     */
    validateNGOKey: async (req, res) => {
        try {
            const { ngoKey } = req.body;

            if (!ngoKey) {
                return res.status(400).json({ error: 'ngoKey is required' });
            }

            const result = await pool.query(
                'SELECT id, "NGO_name" FROM "NGOs" WHERE unique_key = $1',
                [ngoKey]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ valid: false, error: 'Invalid NGO key' });
            }

            return res.status(200).json({
                valid: true,
                ngoId: result.rows[0].id,
                ngoName: result.rows[0].NGO_name
            });
        } catch (error) {
            console.error('[AFE] Error validating NGO key:', error);
            res.status(500).json({ error: 'Failed to validate NGO key' });
        }
    },

    /**
     * Sync AFE learning data from client
     * POST /api/afe/sync
     * Body: { ngoKey, serialNumber, macAddress, snapshots: [...] }
     */
    syncAfeData: async (req, res) => {
        const client = await pool.connect();

        // Listen for client errors to prevent unhandled exceptions from crashing the server
        client.on('error', (err) => {
            console.error('Postgres client unexpected error in syncAfeData:', err);
        });

        try {
            const { ngoKey, serialNumber, macAddress, sessions } = req.body;

            // Validate request
            if (!Array.isArray(sessions)) {
                return res.status(400).json({
                    error: 'Missing required field: sessions[]'
                });
            }

            // 0. Get or create device BEFORE starting transaction
            // This reduces the time the transaction remains open
            let deviceId = null;
            if (serialNumber) {
                deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(serialNumber);
            }

            await client.query('BEGIN');

            // 1. Validate NGO key (nullable for non-Sama devices)
            let ngoId = null;
            if (ngoKey) {
                const ngoResult = await client.query(
                    'SELECT id FROM "NGOs" WHERE unique_key = $1',
                    [ngoKey]
                );
                if (ngoResult.rows.length > 0) {
                    ngoId = ngoResult.rows[0].id;
                }
            }

            if (!deviceId && serialNumber) {
                // Auto-create device within transaction if it still doesn't exist
                try {
                    const deviceResult = await client.query(
                        `INSERT INTO devices (username, serial_number, mac_address, location, ngo_id, rms_version)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (serial_number) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
                         RETURNING id`,
                        ['AFE-User', serialNumber, macAddress || 'UNKNOWN-MAC', 'Unknown', ngoId, '0.0.0']
                    );
                    deviceId = deviceResult.rows[0].id;
                    console.log(`[AFE] Auto-created device ${deviceId} for serial ${serialNumber}`);
                } catch (deviceError) {
                    console.error(`[AFE] Failed to auto-create device for serial ${serialNumber}:`, deviceError);
                    // Continue with deviceId = null
                }
            }

            // 3. Upsert sessions (idempotent via unique constraint)
            const syncedIds = [];

            for (const session of sessions) {
                const result = await client.query(
                    `INSERT INTO afe_details
                    (ngo_id, device_id, session_id, data_collection_method, partner_name, session_date,
                     academic_year, month_name, state, district, school_udise, school_name, school_type,
                     grade, student_count, student_dummy_id, class_section, unit_type, tour_type, language,
                     delivery_model, session_duration_minutes, csat_avg, itp_avg, nps_score, response_rate_percentage,
                     video_completion_rate, quiz_accuracy_percentage, avg_watch_time_seconds, videos_completed_count,
                     quizzes_completed_count, total_questions_answered, correct_answers_count, session_completed_flag,
                     completion_percentage, total_watch_time_seconds, avg_playback_speed, pause_count_total, seek_count_total,
                     facilitator_name, teacher_confidence_rating, teacher_feedback_text, implementation_challenges,
                     device_type, platform_os, platform_version, app_version, network_type, data_source, submission_date, avatar_name,
                     overall_rating, explore_career_rating, see_more_tours_rating)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39,
                            $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54)
                    ON CONFLICT (session_id)
                    DO UPDATE SET
                        ngo_id = EXCLUDED.ngo_id,
                        device_id = EXCLUDED.device_id,
                        data_collection_method = EXCLUDED.data_collection_method,
                        partner_name = EXCLUDED.partner_name,
                        session_date = EXCLUDED.session_date,
                        academic_year = EXCLUDED.academic_year,
                        month_name = EXCLUDED.month_name,
                        state = EXCLUDED.state,
                        district = EXCLUDED.district,
                        school_udise = EXCLUDED.school_udise,
                        school_name = EXCLUDED.school_name,
                        school_type = EXCLUDED.school_type,
                        grade = EXCLUDED.grade,
                        student_count = EXCLUDED.student_count,
                        student_dummy_id = EXCLUDED.student_dummy_id,
                        class_section = EXCLUDED.class_section,
                        unit_type = EXCLUDED.unit_type,
                        tour_type = EXCLUDED.tour_type,
                        language = EXCLUDED.language,
                        delivery_model = EXCLUDED.delivery_model,
                        session_duration_minutes = EXCLUDED.session_duration_minutes,
                        csat_avg = EXCLUDED.csat_avg,
                        itp_avg = EXCLUDED.itp_avg,
                        nps_score = EXCLUDED.nps_score,
                        response_rate_percentage = EXCLUDED.response_rate_percentage,
                        video_completion_rate = EXCLUDED.video_completion_rate,
                        quiz_accuracy_percentage = EXCLUDED.quiz_accuracy_percentage,
                        avg_watch_time_seconds = EXCLUDED.avg_watch_time_seconds,
                        videos_completed_count = EXCLUDED.videos_completed_count,
                        quizzes_completed_count = EXCLUDED.quizzes_completed_count,
                        total_questions_answered = EXCLUDED.total_questions_answered,
                        correct_answers_count = EXCLUDED.correct_answers_count,
                        session_completed_flag = EXCLUDED.session_completed_flag,
                        completion_percentage = EXCLUDED.completion_percentage,
                        total_watch_time_seconds = EXCLUDED.total_watch_time_seconds,
                        avg_playback_speed = EXCLUDED.avg_playback_speed,
                        pause_count_total = EXCLUDED.pause_count_total,
                        seek_count_total = EXCLUDED.seek_count_total,
                        facilitator_name = EXCLUDED.facilitator_name,
                        teacher_confidence_rating = EXCLUDED.teacher_confidence_rating,
                        teacher_feedback_text = EXCLUDED.teacher_feedback_text,
                        implementation_challenges = EXCLUDED.implementation_challenges,
                        device_type = EXCLUDED.device_type,
                        platform_os = EXCLUDED.platform_os,
                        platform_version = EXCLUDED.platform_version,
                        app_version = EXCLUDED.app_version,
                        network_type = EXCLUDED.network_type,
                        data_source = EXCLUDED.data_source,
                        submission_date = EXCLUDED.submission_date,
                        avatar_name = EXCLUDED.avatar_name,
                        overall_rating = EXCLUDED.overall_rating,
                        explore_career_rating = EXCLUDED.explore_career_rating,
                        see_more_tours_rating = EXCLUDED.see_more_tours_rating,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id`,
                    [
                        ngoId,
                        deviceId,
                        session.sessionId,
                        session.dataCollectionMethod || 'Method 2 - Individual Tracking',
                        session.partnerName || 'sama',
                        session.sessionDate,
                        session.academicYear,
                        session.monthName,
                        session.state,
                        session.district,
                        session.schoolUdise || null,
                        session.schoolName,
                        session.schoolType || 'NGO',
                        session.grade,
                        session.studentCount || 1,
                        session.studentDummyId,
                        session.classSection || null,
                        session.unitType || 'Modular AFE',
                        session.tourType || 'Virtual',
                        session.language || 'English',
                        session.deliveryModel || 'Self-paced',
                        session.sessionDurationMinutes || 0,
                        session.csatAvg,
                        session.itpAvg,
                        session.npsScore,
                        session.responseRatePercentage,
                        session.videoCompletionRate,
                        session.quizAccuracyPercentage,
                        session.avgWatchTimeSeconds,
                        session.videosCompletedCount,
                        session.quizzesCompletedCount,
                        session.totalQuestionsAnswered,
                        session.correctAnswersCount,
                        session.sessionCompletedFlag,
                        session.completionPercentage,
                        session.totalWatchTimeSeconds,
                        session.avgPlaybackSpeed,
                        session.pauseCountTotal,
                        session.seekCountTotal,
                        session.facilitatorName || null,
                        session.teacherConfidenceRating,
                        session.teacherFeedbackText || null,
                        session.implementationChallenges || null,
                        session.deviceType || 'Laptop',
                        session.platformOs,
                        session.platformVersion,
                        session.appVersion,
                        session.networkType,
                        session.dataSource || 'Local DB',
                        session.submissionDate,
                        session.avatarName || null,
                        session.overallRating ?? null,
                        session.exploreCareerRating ?? null,
                        session.seeMoreToursRating ?? null
                    ]
                );
                syncedIds.push(result.rows[0].id);
            }

            await client.query('COMMIT');

            console.log(`[AFE] Successfully synced ${syncedIds.length} sessions for device ${deviceId}`);

            return res.status(200).json({
                success: true,
                synced: syncedIds.length,
                ids: syncedIds
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[AFE] Error syncing data:', error);
            res.status(500).json({ error: 'Failed to sync AFE data' });
        } finally {
            client.release();
        }
    },

    /**
     * Get aggregated overview data dynamically from afe_details
     * GET /api/afe/overview?ngoId=<id>
     */
    getOverview: async (req, res) => {
        try {
            const { ngoId } = req.query;

            let query = `
                SELECT
                    ad.ngo_id,
                    COUNT(DISTINCT ad.device_id) as total_laptops,
                    COALESCE(SUM(ad.session_duration_minutes) / 60.0, 0) as total_working_hours,
                    COALESCE(AVG(ad.quiz_accuracy_percentage), 0) as avg_quiz_score,
                    COALESCE(AVG(ad.total_watch_time_seconds), 0) as avg_time_watched,
                    COALESCE(SUM(ad.total_watch_time_seconds), 0) as total_time_watched,
                    0 as avg_time_read,
                    0 as total_time_read,
                    COUNT(DISTINCT ad.student_dummy_id) as total_students,
                    NOW() as last_updated_at
                FROM afe_details ad
            `;
            const params = [];

            if (ngoId) {
                query += ' WHERE ad.ngo_id = $1';
                params.push(ngoId);
            }

            query += ' GROUP BY ad.ngo_id';

            const result = await pool.query(query, params);
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('[AFE] Error fetching overview:', error);
            res.status(500).json({ error: 'Failed to fetch AFE overview' });
        }
    },

    /**
     * Get detailed AFE data with pagination and filters
     * GET /api/afe/details?ngoId=<id>&deviceId=<id>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>&page=1&limit=100
     */
    getDetails: async (req, res) => {
        try {
            const { ngoId, deviceId, startDate, endDate, page = 1, limit = 100 } = req.query;

            let query = 'SELECT * FROM afe_details WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (ngoId) {
                query += ` AND ngo_id = $${paramIndex++}`;
                params.push(ngoId);
            }

            if (deviceId) {
                query += ` AND device_id = $${paramIndex++}`;
                params.push(deviceId);
            }

            if (startDate) {
                query += ` AND session_date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND session_date <= $${paramIndex++}`;
                params.push(endDate);
            }

            query += ` ORDER BY session_date DESC, student_dummy_id`;
            query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, (page - 1) * limit);

            const result = await pool.query(query, params);
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('[AFE] Error fetching details:', error);
            res.status(500).json({ error: 'Failed to fetch AFE details' });
        }
    },

    /**
     * Export AFE details as CSV
     * GET /api/afe/export-csv?ngoId=<id>&deviceId=<id>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>
     */
    exportCsv: async (req, res) => {
        try {
            const { ngoId, deviceId, startDate, endDate } = req.query;

            let query = 'SELECT * FROM afe_details WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (ngoId) {
                query += ` AND ngo_id = $${paramIndex++}`;
                params.push(ngoId);
            }

            if (deviceId) {
                query += ` AND device_id = $${paramIndex++}`;
                params.push(deviceId);
            }

            if (startDate) {
                query += ` AND session_date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND session_date <= $${paramIndex++}`;
                params.push(endDate);
            }

            query += ` ORDER BY session_date DESC, student_dummy_id`;

            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No data found to export' });
            }

            const json2csvParser = new Parser();
            const csvData = json2csvParser.parse(result.rows);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=afe_export.csv');
            res.status(200).send(csvData);

        } catch (error) {
            console.error('[AFE] Error exporting CSV:', error);
            res.status(500).json({ error: 'Failed to export CSV' });
        }
    }
};

module.exports = AFEController;
