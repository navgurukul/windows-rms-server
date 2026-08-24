const { pool } = require('../config/database');
const DeviceModel = require('../models/deviceModel');
const { Parser } = require('json2csv');

const AFEController = {
    
    /**
     * Validate NGO registration key
     * POST /api/afe/validate-key
     * Body: { ngoKey }
     */
    validateNGOKey: async (req, res) => {
        try {
            const { ngoKey } = req.body;

            if (!ngoKey) {
                return res.status(400).json({ error: 'Missing ngoKey' });
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
     * One-time historical backfill endpoint
     * POST /api/afe/backfill-historical
     * Body: { macAddress, serialNumber, sessionIds: [...] }
     */
    backfillHistoricalData: async (req, res) => {
        const client = await pool.connect();
        client.on('error', (err) => {
            console.error('Postgres client error in backfillHistoricalData:', err);
        });

        try {
            const { macAddress, serialNumber, sessionIds, schoolName, schoolUdise, state, city, district, districtCode, schoolType, platformOs } = req.body;

            if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
                return res.status(400).json({ error: 'Missing or empty sessionIds[]' });
            }

            // 1. Resolve device via MAC address first, then serial number
            const matchedDevice = await DeviceModel.fetchDeviceByIdentifiers(macAddress, serialNumber);
            const deviceId = matchedDevice ? matchedDevice.id : null;
            const ngoId = matchedDevice ? matchedDevice.ngo_id : null;
            const partnerName = matchedDevice && matchedDevice.ngo_name ? matchedDevice.ngo_name : 'sama';
            const hasRms = !!matchedDevice;

            await client.query('BEGIN');

            // 2. Upsert into afe_devices registry
            const normalizedMac = macAddress ? macAddress.replace(/-/g, ':').toLowerCase() : null;
            const existingAfeDev = await client.query(
                `SELECT id FROM afe_devices 
                 WHERE (mac_address IS NOT NULL AND LOWER(REPLACE(mac_address, '-', ':')) = $1)
                    OR (serial_number IS NOT NULL AND serial_number = $2)
                 LIMIT 1`,
                [normalizedMac, serialNumber || '']
            );

            if (existingAfeDev.rows.length > 0) {
                await client.query(
                    `UPDATE afe_devices SET
                        serial_number = COALESCE($1, serial_number),
                        mac_address = COALESCE($2, mac_address),
                        device_id = COALESCE($3, device_id),
                        ngo_id = COALESCE($4, ngo_id),
                        partner_name = COALESCE($5, partner_name),
                        school_name = COALESCE($6, school_name),
                        school_udise = COALESCE($7, school_udise),
                        state = COALESCE($8, state),
                        city = COALESCE($9, city),
                        district = COALESCE($10, district),
                        district_code = COALESCE($11, district_code),
                        school_type = COALESCE($12, school_type),
                        platform_os = COALESCE($13, platform_os),
                        has_rms = $14,
                        historical_sync = true,
                        last_synced_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $15`,
                    [serialNumber, macAddress, deviceId, ngoId, partnerName, schoolName, schoolUdise, state, city, district, districtCode, schoolType, platformOs, hasRms, existingAfeDev.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO afe_devices
                    (serial_number, mac_address, device_id, ngo_id, partner_name, school_name, school_udise, state, city, district, district_code, school_type, platform_os, has_rms, historical_sync, last_synced_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, CURRENT_TIMESTAMP)`,
                    [serialNumber, macAddress, deviceId, ngoId, partnerName, schoolName, schoolUdise, state, city, district, districtCode, schoolType, platformOs, hasRms]
                );
            }

            // 3. Update existing records in afe_details if RMS device was matched
            let updatedCount = 0;
            if (deviceId) {
                const updateRes = await client.query(
                    `UPDATE afe_details
                     SET device_id = $1,
                         ngo_id = COALESCE($2, ngo_id),
                         partner_name = COALESCE($3, partner_name),
                         updated_at = CURRENT_TIMESTAMP
                     WHERE session_id = ANY($4)`,
                    [deviceId, ngoId, partnerName, sessionIds]
                );
                updatedCount = updateRes.rowCount;
            }

            await client.query('COMMIT');
            console.log(`[AFE Backfill] Successfully processed backfill for ${sessionIds.length} sessions, updated ${updatedCount} rows (device_id: ${deviceId})`);

            return res.status(200).json({
                success: true,
                totalSessions: sessionIds.length,
                updatedCount,
                deviceId,
                hasRms,
                ngoName: partnerName
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[AFE Backfill] Error in backfill:', error);
            res.status(500).json({ error: 'Failed to process historical backfill' });
        } finally {
            client.release();
        }
    },

    /**
     * Sync AFE learning data from client
     * POST /api/afe/sync
     * Body: { ngoKey, serialNumber, macAddress, sessions: [...] }
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

            // 0. Resolve RMS device using MAC Address (Primary) and Serial Number (Fallback)
            const matchedDevice = await DeviceModel.fetchDeviceByIdentifiers(macAddress, serialNumber);
            let deviceId = matchedDevice ? matchedDevice.id : null;
            let ngoId = matchedDevice ? matchedDevice.ngo_id : null;
            let partnerName = matchedDevice && matchedDevice.ngo_name ? matchedDevice.ngo_name : null;
            const hasRms = !!matchedDevice;

            await client.query('BEGIN');

            // 1. If NGO key is provided and valid, it can supplement or validate NGO
            if (ngoKey && !ngoId) {
                const ngoResult = await client.query(
                    'SELECT id, "NGO_name" FROM "NGOs" WHERE unique_key = $1',
                    [ngoKey]
                );
                if (ngoResult.rows.length > 0) {
                    ngoId = ngoResult.rows[0].id;
                    if (!partnerName) partnerName = ngoResult.rows[0].NGO_name;
                }
            }

            // Fallback partner name from first session if still not set
            if (!partnerName && sessions.length > 0 && sessions[0].partnerName) {
                partnerName = sessions[0].partnerName;
            }

            // 2. Upsert into afe_devices registry
            const normalizedMac = macAddress ? macAddress.replace(/-/g, ':').toLowerCase() : null;
            const firstSession = sessions[0] || {};
            const existingAfeDev = await client.query(
                `SELECT id FROM afe_devices 
                 WHERE (mac_address IS NOT NULL AND LOWER(REPLACE(mac_address, '-', ':')) = $1)
                    OR (serial_number IS NOT NULL AND serial_number = $2)
                 LIMIT 1`,
                [normalizedMac, serialNumber || '']
            );

            if (existingAfeDev.rows.length > 0) {
                await client.query(
                    `UPDATE afe_devices SET
                        serial_number = COALESCE($1, serial_number),
                        mac_address = COALESCE($2, mac_address),
                        device_id = COALESCE($3, device_id),
                        ngo_id = COALESCE($4, ngo_id),
                        partner_name = COALESCE($5, partner_name),
                        school_name = COALESCE($6, school_name),
                        school_udise = COALESCE($7, school_udise),
                        state = COALESCE($8, state),
                        city = COALESCE($9, city),
                        district = COALESCE($10, district),
                        district_code = COALESCE($11, district_code),
                        school_type = COALESCE($12, school_type),
                        platform_os = COALESCE($13, platform_os),
                        has_rms = $14,
                        last_synced_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $15`,
                    [serialNumber, macAddress, deviceId, ngoId, partnerName, firstSession.schoolName, firstSession.schoolUdise, firstSession.state, firstSession.city, firstSession.district, firstSession.districtCode, firstSession.schoolType, firstSession.platformOs, hasRms, existingAfeDev.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO afe_devices
                    (serial_number, mac_address, device_id, ngo_id, partner_name, school_name, school_udise, state, city, district, district_code, school_type, platform_os, has_rms, last_synced_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)`,
                    [serialNumber, macAddress, deviceId, ngoId, partnerName, firstSession.schoolName, firstSession.schoolUdise, firstSession.state, firstSession.city, firstSession.district, firstSession.districtCode, firstSession.schoolType, firstSession.platformOs, hasRms]
                );
            }

            // 3. Upsert sessions (idempotent via unique constraint on session_id)
            const syncedIds = [];

            for (const session of sessions) {
                const sessionPartnerName = partnerName || session.partnerName || 'sama';
                const result = await client.query(
                    `INSERT INTO afe_details
                    (ngo_id, device_id, session_id, data_collection_method, partner_name, session_date,
                     academic_year, month_name, state, city, district, district_code, school_udise, school_name, school_type,
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
                            $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56)
                    ON CONFLICT (session_id)
                    DO UPDATE SET
                        ngo_id = COALESCE(EXCLUDED.ngo_id, afe_details.ngo_id),
                        device_id = COALESCE(EXCLUDED.device_id, afe_details.device_id),
                        data_collection_method = EXCLUDED.data_collection_method,
                        partner_name = COALESCE(EXCLUDED.partner_name, afe_details.partner_name),
                        session_date = EXCLUDED.session_date,
                        academic_year = EXCLUDED.academic_year,
                        month_name = EXCLUDED.month_name,
                        state = EXCLUDED.state,
                        city = EXCLUDED.city,
                        district = EXCLUDED.district,
                        district_code = EXCLUDED.district_code,
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
                        sessionPartnerName,
                        session.sessionDate,
                        session.academicYear,
                        session.monthName,
                        session.state,
                        session.city || null,
                        session.district,
                        session.districtCode || null,
                        session.schoolUdise || null,
                        session.schoolName,
                        session.schoolType || 'Government School',
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
                ids: syncedIds,
                deviceId,
                hasRms
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
            const { ngoId, state, city, district, schoolType, schoolName } = req.query;

            let query = `
                SELECT
                    ad.ngo_id,
                    COUNT(DISTINCT ad.device_id) as total_laptops,
                    COUNT(DISTINCT ad.school_name) as total_schools,
                    COUNT(DISTINCT ad.city) as total_cities,
                    COUNT(DISTINCT ad.district) as total_districts,
                    COALESCE(SUM(ad.session_duration_minutes) / 60.0, 0) as total_working_hours,
                    COALESCE(AVG(ad.quiz_accuracy_percentage), 0) as avg_quiz_score,
                    COALESCE(AVG(ad.total_watch_time_seconds), 0) as avg_time_watched,
                    COALESCE(SUM(ad.total_watch_time_seconds), 0) as total_time_watched,
                    0 as avg_time_read,
                    0 as total_time_read,
                    COUNT(DISTINCT ad.student_dummy_id) as total_students,
                    NOW() as last_updated_at
                FROM afe_details ad
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (ngoId) {
                query += ` AND ad.ngo_id = $${paramIndex++}`;
                params.push(ngoId);
            }

            if (state) {
                query += ` AND ad.state ILIKE $${paramIndex++}`;
                params.push(`%${state}%`);
            }

            if (city) {
                query += ` AND ad.city ILIKE $${paramIndex++}`;
                params.push(`%${city}%`);
            }

            if (district) {
                query += ` AND ad.district ILIKE $${paramIndex++}`;
                params.push(`%${district}%`);
            }

            if (schoolType) {
                query += ` AND ad.school_type ILIKE $${paramIndex++}`;
                params.push(`%${schoolType}%`);
            }

            if (schoolName) {
                query += ` AND ad.school_name ILIKE $${paramIndex++}`;
                params.push(`%${schoolName}%`);
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
     * Get detailed AFE session data with pagination, metadata joins, and filters
     * GET /api/afe/details
     */
    getDetails: async (req, res) => {
        try {
            const {
                ngoId,
                deviceId,
                serialNumber,
                studentDummyId,
                schoolUdise,
                schoolName,
                grade,
                sessionCompleted,
                startDate,
                endDate,
                search,
                sortBy = 'session_date',
                sortOrder = 'DESC',
                page = 1,
                limit = 100,
                includeMeta
            } = req.query;

            let baseQuery = `
                FROM afe_details ad
                LEFT JOIN devices d ON ad.device_id = d.id
                LEFT JOIN "NGOs" n ON ad.ngo_id = n.id
                LEFT JOIN "NGOs" dn ON d.ngo_id = dn.id
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (ngoId) {
                baseQuery += ` AND ad.ngo_id = $${paramIndex++}`;
                params.push(ngoId);
            }

            if (deviceId) {
                baseQuery += ` AND ad.device_id = $${paramIndex++}`;
                params.push(deviceId);
            }

            if (serialNumber) {
                baseQuery += ` AND d.serial_number = $${paramIndex++}`;
                params.push(serialNumber);
            }

            if (studentDummyId) {
                baseQuery += ` AND ad.student_dummy_id = $${paramIndex++}`;
                params.push(studentDummyId);
            }

            if (schoolUdise) {
                baseQuery += ` AND ad.school_udise = $${paramIndex++}`;
                params.push(schoolUdise);
            }

            if (schoolName) {
                baseQuery += ` AND ad.school_name ILIKE $${paramIndex++}`;
                params.push(`%${schoolName}%`);
            }

            if (grade) {
                baseQuery += ` AND ad.grade = $${paramIndex++}`;
                params.push(grade);
            }

            if (sessionCompleted !== undefined && sessionCompleted !== '') {
                const isCompleted = sessionCompleted === 'true' || sessionCompleted === true || sessionCompleted === '1';
                baseQuery += ` AND ad.session_completed_flag = $${paramIndex++}`;
                params.push(isCompleted);
            }

            if (startDate) {
                baseQuery += ` AND ad.session_date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                baseQuery += ` AND ad.session_date <= $${paramIndex++}`;
                params.push(endDate);
            }

            if (search) {
                baseQuery += ` AND (
                    ad.session_id ILIKE $${paramIndex} OR
                    ad.student_dummy_id ILIKE $${paramIndex} OR
                    ad.school_name ILIKE $${paramIndex} OR
                    ad.city ILIKE $${paramIndex} OR
                    ad.district ILIKE $${paramIndex} OR
                    ad.state ILIKE $${paramIndex} OR
                    ad.district_code ILIKE $${paramIndex} OR
                    ad.school_type ILIKE $${paramIndex} OR
                    ad.avatar_name ILIKE $${paramIndex} OR
                    ad.facilitator_name ILIKE $${paramIndex} OR
                    d.serial_number ILIKE $${paramIndex}
                )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total, 10);

            // Allowed sort columns to prevent SQL injection
            const allowedSortColumns = {
                session_date: 'ad.session_date',
                created_at: 'ad.created_at',
                completion_percentage: 'ad.completion_percentage',
                session_duration_minutes: 'ad.session_duration_minutes',
                student_dummy_id: 'ad.student_dummy_id',
                school_name: 'ad.school_name',
                grade: 'ad.grade'
            };

            const sortColumn = allowedSortColumns[sortBy] || 'ad.session_date';
            const order = (sortOrder && String(sortOrder).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

            const parsedPage = Math.max(1, parseInt(page, 10) || 1);
            const parsedLimit = Math.max(1, Math.min(500, parseInt(limit, 10) || 100));
            const offset = (parsedPage - 1) * parsedLimit;

            const selectQuery = `
                SELECT 
                    ad.*,
                    d.serial_number,
                    d.mac_address,
                    COALESCE(n."NGO_name", dn."NGO_name", ad.partner_name) as ngo_name, COALESCE(dn."NGO_name", ad.school_name) as school_name
                ${baseQuery}
                ORDER BY ${sortColumn} ${order}, ad.id DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            params.push(parsedLimit, offset);

            const result = await pool.query(selectQuery, params);

            res.setHeader('X-Total-Count', total);

            if (includeMeta === 'true' || includeMeta === true) {
                return res.status(200).json({
                    success: true,
                    pagination: {
                        total,
                        page: parsedPage,
                        limit: parsedLimit,
                        totalPages: Math.ceil(total / parsedLimit) || 1
                    },
                    data: result.rows
                });
            }

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
            const { ngoId, deviceId, serialNumber, startDate, endDate, search } = req.query;

            let baseQuery = `
                FROM afe_details ad
                LEFT JOIN devices d ON ad.device_id = d.id
                LEFT JOIN "NGOs" n ON ad.ngo_id = n.id
                LEFT JOIN "NGOs" dn ON d.ngo_id = dn.id
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (ngoId) {
                baseQuery += ` AND ad.ngo_id = $${paramIndex++}`;
                params.push(ngoId);
            }

            if (deviceId) {
                baseQuery += ` AND ad.device_id = $${paramIndex++}`;
                params.push(deviceId);
            }

            if (serialNumber) {
                baseQuery += ` AND d.serial_number = $${paramIndex++}`;
                params.push(serialNumber);
            }

            if (startDate) {
                baseQuery += ` AND ad.session_date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                baseQuery += ` AND ad.session_date <= $${paramIndex++}`;
                params.push(endDate);
            }

            if (search) {
                baseQuery += ` AND (
                    ad.session_id ILIKE $${paramIndex} OR
                    ad.student_dummy_id ILIKE $${paramIndex} OR
                    ad.school_name ILIKE $${paramIndex} OR
                    ad.city ILIKE $${paramIndex} OR
                    ad.district ILIKE $${paramIndex} OR
                    ad.state ILIKE $${paramIndex} OR
                    ad.district_code ILIKE $${paramIndex} OR
                    ad.school_type ILIKE $${paramIndex} OR
                    ad.avatar_name ILIKE $${paramIndex} OR
                    ad.facilitator_name ILIKE $${paramIndex} OR
                    d.serial_number ILIKE $${paramIndex}
                )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            const query = `
                SELECT 
                    ad.*,
                    d.serial_number,
                    d.mac_address,
                    COALESCE(n."NGO_name", dn."NGO_name", ad.partner_name) as ngo_name, COALESCE(dn."NGO_name", ad.school_name) as school_name
                ${baseQuery}
                ORDER BY ad.session_date DESC, ad.student_dummy_id
            `;

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
