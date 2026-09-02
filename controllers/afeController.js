const { pool } = require('../config/database');
const DeviceModel = require('../models/deviceModel');
const { Parser } = require('json2csv');

const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }
    return str;
};

const formatDateToMMDDYYYY = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) return str;
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[2]}-${match[3]}-${match[1]}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}-${day}-${year}`;
    }
    return str;
};

// Exact 73 fields in snake_case required for Amazon Dashboard CSV format
const AFE_73_FIELDS = [
    'id',
    'created_at',
    'updated_at',
    'device_id',
    'mobile_created_at',
    'mobile_updated_at',
    'location',
    'time_taken',
    'parent_response_id',
    'district_code',
    'distribution_channel_host_id',
    'product_name',
    'unique_student_id',
    'cc',
    'zipcode_postal_code',
    'completion_date',
    'completion_rate',
    'student_csat',
    'underserved_reach',
    'grade_of_students',
    'educator_id',
    'educator_nps',
    'distribution_channel_host',
    'session_id',
    'session_start_date',
    'session_end_date',
    'session_start_time',
    'session_stop_time',
    'school_year',
    'latitude',
    'longitude',
    'state',
    'city',
    'district',
    'tour_id',
    'data_collection_method',
    'partner_name',
    'academic_year',
    'month_name',
    'school_udise',
    'school_name',
    'school_type',
    'class_section',
    'language',
    'unit_type',
    'student_count',
    'itp_avg',
    'session_duration_minutes',
    'response_rate_percentage',
    'video_completion_rate',
    'quiz_accuracy_percentage',
    'avg_watch_time_seconds',
    'videos_completed_count',
    'quizzes_completed_count',
    'total_questions_answered',
    'correct_answers_count',
    'session_completed_flag',
    'completion_percentage',
    'total_watch_time_seconds',
    'avg_playback_speed',
    'pause_count_total',
    'seek_count_total',
    'facilitator_name',
    'teacher_confidence_rating',
    'teacher_feedback_text',
    'implementation_challenges',
    'device_type',
    'platform_os',
    'platform_version',
    'app_version',
    'network_type',
    'data_source',
    'submission_date'
];

// Option code mappings for CSV export
// Tour ID / Product Name Codes:
// 1: CT-L-AWS-01 (AWS Data Center Tour)
// 2: CT-L-FC-01 (Amazon Fulfillment Center / Robotics Tour)
// 3: CT-L-AM-01 (Alexa Music / Your Voice Is Power Tour)
const mapTourAndProductCode = (moduleName, moduleId, tourType) => {
    const text = `${moduleName || ''} ${moduleId || ''} ${tourType || ''}`.toLowerCase();
    
    // 3: Alexa Music / Your Voice is Power / CT-L-AM-01
    if (
        text.includes('music') ||
        text.includes('alexa') ||
        text.includes('voice') ||
        text.includes('beat') ||
        text.includes('yvip') ||
        text.includes('ct-l-am') ||
        /\b(am|am-01|3)\b/i.test(text)
    ) {
        return 3;
    }
    
    // 2: Amazon Fulfillment Center / Robotics / CT-L-FC-01
    if (
        text.includes('fulfillment') ||
        text.includes('robotics') ||
        text.includes('rfc') ||
        text.includes('ct-l-fc') ||
        /\b(fc|fc-01|2)\b/i.test(text)
    ) {
        return 2;
    }
    
    // 1: AWS Data Center Tour / CT-L-AWS-01
    return 1;
};

const mapTourCodeToName = (code) => {
    if (code === 3) return 'CT-L-AM-01';
    if (code === 2) return 'CT-L-FC-01';
    return 'CT-L-AWS-01';
};

const mapTourCodeToProductName = (code) => {
    if (code === 3) return 'Alexa Music / Your Voice Is Power Tour';
    if (code === 2) return 'Amazon Fulfillment Center Tour';
    return 'AWS Data Center Tour';
};

const mapProductNameToCode = (val, moduleId, tourType) => mapTourAndProductCode(val, moduleId, tourType);
const mapTourIdToCode = (val, moduleId, tourType) => mapTourAndProductCode(val, moduleId, tourType);

const mapSchoolYearToCode = (sessionDate, academicYear) => {
    const text = `${sessionDate || ''} ${academicYear || ''}`;
    if (text.includes('2028')) return 3;
    if (text.includes('2027')) return 2;
    return 1; // 2026
};

const mapMonthToCode = (monthName, sessionDate) => {
    const months = {
        january: 1, jan: 1,
        february: 2, feb: 2,
        march: 3, mar: 3,
        april: 4, apr: 4,
        may: 5,
        june: 6, jun: 6,
        july: 7, jul: 7,
        august: 8, aug: 8,
        september: 9, sep: 9, sept: 9,
        october: 10, oct: 10,
        november: 11, nov: 11,
        december: 12, dec: 12
    };
    if (monthName && months[String(monthName).toLowerCase().trim()]) {
        return months[String(monthName).toLowerCase().trim()];
    }
    if (sessionDate) {
        const d = new Date(sessionDate);
        if (!isNaN(d.getTime())) {
            return d.getMonth() + 1;
        }
    }
    return 1;
};

const mapSchoolTypeToCode = (val) => {
    const text = String(val || '').toLowerCase().trim();
    if (text.includes('aided')) return 2;
    if (text.includes('private')) return 3;
    if (text.includes('kv') || text.includes('jnv') || text.includes('central')) return 4;
    if (text.includes('tribal') || text.includes('emrs')) return 5;
    if (text.includes('kgbv')) return 6;
    if (text.includes('other')) return 7;
    return 1; // Government School
};

const mapLanguageToCode = (val) => {
    const text = String(val || '').toLowerCase().trim();
    const langMap = {
        english: 1,
        hindi: 2,
        tamil: 3,
        telugu: 4,
        kannada: 5,
        marathi: 6,
        gujarati: 7,
        odia: 8,
        oriya: 8
    };
    return langMap[text] || 1;
};

const mapUnitTypeToCode = (val) => {
    const text = String(val || '').toLowerCase().trim();
    if (text.includes('student') && text.includes('teacher')) return 3;
    if (text.includes('teacher')) return 2;
    return 1; // Student
};

const mapDataCollectionMethodToCode = (val) => {
    const text = String(val || '').toLowerCase().trim();
    if (text.includes('classroom') || text.includes('aggregate') || text.includes('method 1')) return 1;
    return 2; // individual_tracking
};

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
            let connectedNgoName = matchedDevice && matchedDevice.ngo_name ? matchedDevice.ngo_name : null;
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
                    if (!connectedNgoName) connectedNgoName = ngoResult.rows[0].NGO_name;
                }
            }

            // Priority: Connected NGO if assigned and not 'Default NGO'. Otherwise, fallback to session.partnerName or 'Sama Digital Foundation – 1'
            const isValidConnectedNgo = connectedNgoName && connectedNgoName.trim() !== '' && connectedNgoName !== 'Default NGO';
            const clientPartnerName = (sessions.length > 0 && sessions[0].partnerName)
                ? sessions[0].partnerName
                : 'Sama Digital Foundation – 1';
            const resolvedPartnerName = isValidConnectedNgo ? connectedNgoName : clientPartnerName;

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
                        zipcode_postal_code = COALESCE($12, zipcode_postal_code),
                        school_type = COALESCE($13, school_type),
                        platform_os = COALESCE($14, platform_os),
                        has_rms = $15,
                        last_synced_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $16`,
                    [serialNumber, macAddress, deviceId, ngoId, resolvedPartnerName, firstSession.schoolName, firstSession.schoolUdise, firstSession.state, firstSession.city, firstSession.district, firstSession.districtCode, firstSession.zipcodePostalCode || firstSession.zipcode_postal_code || '110001', firstSession.schoolType, firstSession.platformOs, hasRms, existingAfeDev.rows[0].id]
                );
            } else {
                await client.query(
                    `INSERT INTO afe_devices
                    (serial_number, mac_address, device_id, ngo_id, partner_name, school_name, school_udise, state, city, district, district_code, zipcode_postal_code, school_type, platform_os, has_rms, last_synced_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)`,
                    [serialNumber, macAddress, deviceId, ngoId, resolvedPartnerName, firstSession.schoolName, firstSession.schoolUdise, firstSession.state, firstSession.city, firstSession.district, firstSession.districtCode, firstSession.zipcodePostalCode || firstSession.zipcode_postal_code || '110001', firstSession.schoolType, firstSession.platformOs, hasRms]
                );
            }

            // 3. Upsert sessions (idempotent via unique constraint on session_id)
            const syncedIds = [];

            for (const session of sessions) {
                const sessionClientPartner = session.partnerName || clientPartnerName;
                const sessionPartnerName = isValidConnectedNgo ? connectedNgoName : sessionClientPartner;
                const result = await client.query(
                    `INSERT INTO afe_details
                    (ngo_id, device_id, session_id, country_code, distribution_channel_host_id, data_collection_method, partner_name, session_date,
                     session_start_date, session_end_date, session_start_time, session_stop_time,
                     academic_year, month_name, state, city, district, district_code, zipcode_postal_code, school_udise, school_name, school_type,
                     grade, student_count, student_dummy_id, class_section, unit_type, tour_type, module_id, module_name, language,
                     delivery_model, session_duration_minutes, csat_avg, itp_avg, nps_score, response_rate_percentage,
                     video_completion_rate, quiz_accuracy_percentage, avg_watch_time_seconds, videos_completed_count,
                     quizzes_completed_count, total_questions_answered, correct_answers_count, session_completed_flag,
                     completion_percentage, total_watch_time_seconds, avg_playback_speed, pause_count_total, seek_count_total,
                     facilitator_name, teacher_confidence_rating, teacher_feedback_text, implementation_challenges,
                     device_type, platform_os, platform_version, app_version, network_type, data_source, submission_date, avatar_name,
                     overall_rating, explore_career_rating, see_more_tours_rating)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39,
                            $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56, $57, $58,
                            $59, $60, $61, $62, $63, $64, $65)
                    ON CONFLICT (session_id)
                    DO UPDATE SET
                        ngo_id = COALESCE(EXCLUDED.ngo_id, afe_details.ngo_id),
                        device_id = COALESCE(EXCLUDED.device_id, afe_details.device_id),
                        country_code = COALESCE(EXCLUDED.country_code, afe_details.country_code),
                        distribution_channel_host_id = COALESCE(EXCLUDED.distribution_channel_host_id, afe_details.distribution_channel_host_id),
                        data_collection_method = EXCLUDED.data_collection_method,
                        partner_name = EXCLUDED.partner_name,
                        session_date = EXCLUDED.session_date,
                        session_start_date = COALESCE(EXCLUDED.session_start_date, afe_details.session_start_date),
                        session_end_date = COALESCE(EXCLUDED.session_end_date, afe_details.session_end_date),
                        session_start_time = COALESCE(EXCLUDED.session_start_time, afe_details.session_start_time),
                        session_stop_time = COALESCE(EXCLUDED.session_stop_time, afe_details.session_stop_time),
                        academic_year = EXCLUDED.academic_year,
                        month_name = EXCLUDED.month_name,
                        state = EXCLUDED.state,
                        city = EXCLUDED.city,
                        district = EXCLUDED.district,
                        district_code = EXCLUDED.district_code,
                        zipcode_postal_code = COALESCE(EXCLUDED.zipcode_postal_code, afe_details.zipcode_postal_code),
                        school_udise = EXCLUDED.school_udise,
                        school_name = EXCLUDED.school_name,
                        school_type = EXCLUDED.school_type,
                        grade = EXCLUDED.grade,
                        student_count = EXCLUDED.student_count,
                        student_dummy_id = EXCLUDED.student_dummy_id,
                        class_section = EXCLUDED.class_section,
                        unit_type = EXCLUDED.unit_type,
                        tour_type = EXCLUDED.tour_type,
                        module_id = EXCLUDED.module_id,
                        module_name = EXCLUDED.module_name,
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
                        session.countryCode || 'IN',
                        session.distributionChannelHostId || 'Sama Platform 1',
                        session.dataCollectionMethod || 'Method 2 - Individual Tracking',
                        sessionPartnerName,
                        session.sessionDate,
                        session.sessionStartDate || session.session_start_date || session.sessionDate || null,
                        session.sessionEndDate || session.session_end_date || session.sessionDate || null,
                        session.sessionStartTime || session.session_start_time || null,
                        session.sessionStopTime || session.session_stop_time || null,
                        session.academicYear,
                        session.monthName,
                        session.state,
                        session.city || null,
                        session.district,
                        session.districtCode || null,
                        session.zipcodePostalCode || session.zipcode_postal_code || '110001',
                        session.schoolUdise || null,
                        session.schoolName,
                        session.schoolType || 'Government School',
                        session.grade,
                        session.studentCount || 1,
                        session.studentDummyId,
                        session.classSection || null,
                        session.unitType || 'Modular AFE',
                        session.tourType || 'Virtual',
                        session.moduleId || session.module_id || null,
                        session.moduleName || session.module_name || session.tourName || session.tourType || null,
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

            console.log(`[AFE] Successfully synced ${syncedIds.length} sessions (device_id: ${deviceId}, ngo_id: ${ngoId})`);

            return res.status(200).json({
                success: true,
                message: 'AFE learning data synced successfully',
                syncedCount: syncedIds.length,
                deviceId,
                ngoId,
                partnerName: resolvedPartnerName,
                hasRms
            });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[AFE] Error syncing learning data:', error);
            res.status(500).json({ error: 'Failed to sync AFE learning data' });
        } finally {
            client.release();
        }
    },

    /**
     * Get aggregated AFE learning metrics (Dashboard Overview)
     * GET /api/afe/overview?ngoId=<id>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>
     */
    getOverview: async (req, res) => {
        try {
            const { ngoId, deviceId, startDate, endDate } = req.query;

            let baseWhere = 'WHERE 1=1';
            const params = [];
            let paramIndex = 1;

            if (ngoId) {
                baseWhere += ` AND ad.ngo_id = $${paramIndex++}`;
                params.push(ngoId);
            }

            if (deviceId) {
                baseWhere += ` AND ad.device_id = $${paramIndex++}`;
                params.push(deviceId);
            }

            if (startDate) {
                baseWhere += ` AND ad.session_date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                baseWhere += ` AND ad.session_date <= $${paramIndex++}`;
                params.push(endDate);
            }

            const query = `
                SELECT 
                    COUNT(DISTINCT ad.session_id) as total_sessions,
                    COUNT(DISTINCT ad.student_dummy_id) as total_students,
                    COUNT(DISTINCT ad.device_id) as active_laptops,
                    COUNT(DISTINCT ad.school_udise) as total_schools,
                    ROUND(COALESCE(SUM(ad.session_duration_minutes), 0)::numeric / 60, 2) as total_learning_hours,
                    ROUND(COALESCE(AVG(ad.session_duration_minutes), 0)::numeric, 1) as avg_session_duration_mins,
                    ROUND(COALESCE(AVG(ad.video_completion_rate), 0)::numeric, 2) as avg_video_completion_rate,
                    ROUND(COALESCE(AVG(ad.quiz_accuracy_percentage), 0)::numeric, 2) as avg_quiz_accuracy,
                    ROUND(COALESCE(AVG(ad.completion_percentage), 0)::numeric, 2) as avg_session_completion,
                    ROUND(COALESCE(AVG(ad.csat_avg), 0)::numeric, 2) as avg_csat,
                    ROUND(COALESCE(AVG(ad.itp_avg), 0)::numeric, 2) as avg_itp,
                    ROUND(COALESCE(AVG(ad.overall_rating), 0)::numeric, 2) as avg_overall_rating,
                    ROUND(COALESCE(AVG(ad.explore_career_rating), 0)::numeric, 2) as avg_explore_career_rating,
                    ROUND(COALESCE(AVG(ad.see_more_tours_rating), 0)::numeric, 2) as avg_see_more_tours_rating,
                    COALESCE(SUM(ad.videos_completed_count), 0) as total_videos_completed,
                    COALESCE(SUM(ad.quizzes_completed_count), 0) as total_quizzes_completed,
                    COALESCE(SUM(ad.total_questions_answered), 0) as total_questions_answered,
                    COALESCE(SUM(ad.correct_answers_count), 0) as total_correct_answers
                FROM afe_details ad
                ${baseWhere}
            `;

            const result = await pool.query(query, params);
            res.status(200).json(result.rows[0]);

        } catch (error) {
            console.error('[AFE] Error fetching overview metrics:', error);
            res.status(500).json({ error: 'Failed to fetch AFE overview metrics' });
        }
    },

    /**
     * Get per-NGO breakdown of AFE metrics
     * GET /api/afe/ngo-summary
     */
    getNgoSummary: async (req, res) => {
        try {
            const query = `
                SELECT 
                    n.id as ngo_id,
                    n."NGO_name" as ngo_name,
                    n.contact_person,
                    n.email,
                    COUNT(DISTINCT ad.session_id) as total_sessions,
                    COUNT(DISTINCT ad.student_dummy_id) as total_students,
                    COUNT(DISTINCT ad.device_id) as active_devices,
                    ROUND(COALESCE(SUM(ad.session_duration_minutes), 0)::numeric / 60, 2) as total_learning_hours,
                    ROUND(COALESCE(AVG(ad.completion_percentage), 0)::numeric, 2) as avg_completion_rate,
                    ROUND(COALESCE(AVG(ad.quiz_accuracy_percentage), 0)::numeric, 2) as avg_quiz_accuracy,
                    MAX(ad.session_date) as last_activity_date
                FROM "NGOs" n
                LEFT JOIN afe_details ad ON n.id = ad.ngo_id
                GROUP BY n.id, n."NGO_name", n.contact_person, n.email
                ORDER BY total_sessions DESC
            `;

            const result = await pool.query(query);
            res.status(200).json(result.rows);

        } catch (error) {
            console.error('[AFE] Error fetching NGO summary:', error);
            res.status(500).json({ error: 'Failed to fetch NGO summary' });
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
                moduleId,
                moduleName,
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
                LEFT JOIN afe_devices adev ON (ad.device_id IS NOT NULL AND ad.device_id = adev.device_id)
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
                baseQuery += ` AND (d.serial_number = $${paramIndex} OR adev.serial_number = $${paramIndex})`;
                params.push(serialNumber);
                paramIndex++;
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

            if (moduleId) {
                baseQuery += ` AND ad.module_id = $${paramIndex++}`;
                params.push(moduleId);
            }

            if (moduleName) {
                baseQuery += ` AND ad.module_name ILIKE $${paramIndex++}`;
                params.push(`%${moduleName}%`);
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
                    ad.module_id ILIKE $${paramIndex} OR
                    ad.module_name ILIKE $${paramIndex} OR
                    ad.city ILIKE $${paramIndex} OR
                    ad.district ILIKE $${paramIndex} OR
                    ad.state ILIKE $${paramIndex} OR
                    ad.district_code ILIKE $${paramIndex} OR
                    ad.school_type ILIKE $${paramIndex} OR
                    ad.avatar_name ILIKE $${paramIndex} OR
                    ad.facilitator_name ILIKE $${paramIndex} OR
                    d.serial_number ILIKE $${paramIndex} OR
                    adev.serial_number ILIKE $${paramIndex}
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
                module_id: 'ad.module_id',
                module_name: 'ad.module_name',
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
                    COALESCE(d.serial_number, adev.serial_number, '') as serial_number,
                    COALESCE(d.mac_address, adev.mac_address, '') as mac_address,
                    COALESCE(NULLIF(n."NGO_name", 'Default NGO'), NULLIF(dn."NGO_name", 'Default NGO'), NULLIF(NULLIF(ad.partner_name, 'Default NGO'), 'sama'), 'Sama Digital Foundation – 1') as ngo_name,
                    COALESCE(NULLIF(n."NGO_name", 'Default NGO'), NULLIF(dn."NGO_name", 'Default NGO'), NULLIF(NULLIF(ad.partner_name, 'Default NGO'), 'sama'), 'Sama Digital Foundation – 1') as partner_name,
                    COALESCE(ad.school_name, dn."NGO_name") as school_name
                ${baseQuery}
                ORDER BY ${sortColumn} ${order}, ad.id DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;
            params.push(parsedLimit, offset);

            const result = await pool.query(selectQuery, params);

            const formattedRows = result.rows.map(row => {
                const completionDateFormatted = formatDateToDDMMYYYY(row.submission_date || row.session_date);
                return {
                    ...row,
                    ngo_name: row.ngo_name || 'Sama Digital Foundation – 1',
                    partner_name: row.partner_name || 'Sama Digital Foundation – 1',
                    device_id: row.device_id,
                    serial_number: row.serial_number || '',
                    mac_address: row.mac_address || '',
                    school_name: row.school_name || '',
                    session_id: row.session_id || '',
                    afe_session_id: row.session_id || '',
                    avatar_name: row.avatar_name || '',
                    profile_name: row.avatar_name || '',
                    videos_completed_count: row.videos_completed_count || 0,
                    quizzes_completed_count: row.quizzes_completed_count || 0,
                    number_of_videos_watched: row.videos_completed_count || 0,
                    number_of_tests_attempted: row.quizzes_completed_count || 0,
                    completion_date: completionDateFormatted,
                    submission_date: completionDateFormatted
                };
            });

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
                    data: formattedRows
                });
            }

            res.status(200).json(formattedRows);
        } catch (error) {
            console.error('[AFE] Error fetching details:', error);
            res.status(500).json({ error: 'Failed to fetch AFE details' });
        }
    },

    /**
     * Export AFE details as CSV (73-Column Amazon Dashboard Standard Format)
     * GET /api/afe/export-csv?ngoId=<id>&deviceId=<id>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>
     */
    exportCsv: async (req, res) => {
        try {
            const { ngoId, deviceId, serialNumber, moduleId, moduleName, startDate, endDate, search } = req.query;

            let baseQuery = `
                FROM afe_details ad
                LEFT JOIN devices d ON ad.device_id = d.id
                LEFT JOIN afe_devices adev ON (ad.device_id IS NOT NULL AND ad.device_id = adev.device_id)
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
                baseQuery += ` AND (d.serial_number = $${paramIndex} OR adev.serial_number = $${paramIndex})`;
                params.push(serialNumber);
                paramIndex++;
            }

            if (moduleId) {
                baseQuery += ` AND ad.module_id = $${paramIndex++}`;
                params.push(moduleId);
            }

            if (moduleName) {
                baseQuery += ` AND ad.module_name ILIKE $${paramIndex++}`;
                params.push(`%${moduleName}%`);
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
                    ad.module_id ILIKE $${paramIndex} OR
                    ad.module_name ILIKE $${paramIndex} OR
                    ad.city ILIKE $${paramIndex} OR
                    ad.district ILIKE $${paramIndex} OR
                    ad.state ILIKE $${paramIndex} OR
                    ad.district_code ILIKE $${paramIndex} OR
                    ad.school_type ILIKE $${paramIndex} OR
                    ad.avatar_name ILIKE $${paramIndex} OR
                    ad.facilitator_name ILIKE $${paramIndex} OR
                    d.serial_number ILIKE $${paramIndex} OR
                    adev.serial_number ILIKE $${paramIndex}
                )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            const query = `
                SELECT 
                    ad.*,
                    COALESCE(d.serial_number, adev.serial_number, '') as serial_number,
                    COALESCE(d.mac_address, adev.mac_address, '') as mac_address,
                    COALESCE(NULLIF(n."NGO_name", 'Default NGO'), NULLIF(dn."NGO_name", 'Default NGO'), NULLIF(NULLIF(ad.partner_name, 'Default NGO'), 'sama'), 'Sama Digital Foundation – 1') as ngo_name,
                    COALESCE(NULLIF(n."NGO_name", 'Default NGO'), NULLIF(dn."NGO_name", 'Default NGO'), NULLIF(NULLIF(ad.partner_name, 'Default NGO'), 'sama'), 'Sama Digital Foundation – 1') as partner_name,
                    COALESCE(ad.school_name, dn."NGO_name") as school_name
                ${baseQuery}
                ORDER BY ad.session_date DESC, ad.student_dummy_id
            `;

            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No data found to export' });
            }

            const mapped73Rows = result.rows.map(row => {
                const completionDate = formatDateToMMDDYYYY(row.session_date || row.submission_date);
                const sessionStartDate = formatDateToMMDDYYYY(row.session_start_date || row.session_date);
                const sessionEndDate = formatDateToMMDDYYYY(row.session_end_date || row.session_date);
                const submissionDate = formatDateToMMDDYYYY(row.submission_date || row.session_date);
                const tourCode = mapTourAndProductCode(row.module_name, row.module_id, row.tour_type);

                return {
                    id: '',
                    created_at: '',
                    updated_at: '',
                    device_id: 'sama',
                    mobile_created_at: '',
                    mobile_updated_at: '',
                    location: '',
                    time_taken: '',
                    parent_response_id: '',
                    district_code: row.district_code || '',
                    distribution_channel_host_id: 'Sama Platform',
                    product_name: tourCode,
                    unique_student_id: row.student_dummy_id || '',
                    cc: row.country_code || 'IN',
                    zipcode_postal_code: row.zipcode_postal_code || '110001',
                    completion_date: completionDate,
                    completion_rate: row.video_completion_rate !== null && row.video_completion_rate !== undefined ? Number(row.video_completion_rate) : 0,
                    student_csat: row.csat_avg !== null && row.csat_avg !== undefined && row.csat_avg !== '' ? Number(row.csat_avg) : '',
                    underserved_reach: 1,
                    grade_of_students: row.grade ? String(row.grade) : '8',
                    educator_id: '',
                    educator_nps: '',
                    distribution_channel_host: 2,
                    session_id: row.session_id || '',
                    session_start_date: sessionStartDate,
                    session_end_date: sessionEndDate,
                    session_start_time: row.session_start_time || '',
                    session_stop_time: row.session_stop_time || '',
                    school_year: mapSchoolYearToCode(row.session_date, row.academic_year),
                    latitude: '',
                    longitude: '',
                    state: row.state || '',
                    city: row.city || '',
                    district: row.district || '',
                    tour_id: tourCode,
                    data_collection_method: mapDataCollectionMethodToCode(row.data_collection_method),
                    partner_name: 1,
                    academic_year: '3ab7f1d4-e2c8-47d9-a1b6-8f0c5d2e9a73',
                    month_name: mapMonthToCode(row.month_name, row.session_date),
                    school_udise: row.school_udise || '',
                    school_name: row.school_name || '',
                    school_type: mapSchoolTypeToCode(row.school_type),
                    class_section: '',
                    language: mapLanguageToCode(row.language),
                    unit_type: mapUnitTypeToCode(row.unit_type),
                    student_count: parseInt(row.student_count, 10) || 1,
                    itp_avg: row.itp_avg ? Math.round(Number(row.itp_avg)) : 4,
                    session_duration_minutes: parseInt(row.session_duration_minutes, 10) || 0,
                    response_rate_percentage: row.response_rate_percentage !== null && row.response_rate_percentage !== undefined ? Number(row.response_rate_percentage) : 100,
                    video_completion_rate: row.video_completion_rate !== null && row.video_completion_rate !== undefined ? Number(row.video_completion_rate) : 0,
                    quiz_accuracy_percentage: row.quiz_accuracy_percentage !== null && row.quiz_accuracy_percentage !== undefined ? Number(row.quiz_accuracy_percentage) : 0,
                    avg_watch_time_seconds: parseInt(row.avg_watch_time_seconds, 10) || 0,
                    videos_completed_count: parseInt(row.videos_completed_count, 10) || 0,
                    quizzes_completed_count: parseInt(row.quizzes_completed_count, 10) || 0,
                    total_questions_answered: parseInt(row.total_questions_answered, 10) || 0,
                    correct_answers_count: parseInt(row.correct_answers_count, 10) || 0,
                    session_completed_flag: row.session_completed_flag ? 'TRUE' : 'FALSE',
                    completion_percentage: parseInt(row.completion_percentage, 10) || 0,
                    total_watch_time_seconds: parseInt(row.total_watch_time_seconds, 10) || 0,
                    avg_playback_speed: row.avg_playback_speed !== null && row.avg_playback_speed !== undefined ? Number(row.avg_playback_speed) : 1.0,
                    pause_count_total: parseInt(row.pause_count_total, 10) || 0,
                    seek_count_total: parseInt(row.seek_count_total, 10) || 0,
                    facilitator_name: '',
                    teacher_confidence_rating: '',
                    teacher_feedback_text: '',
                    implementation_challenges: '',
                    device_type: row.device_type || 'Laptop',
                    platform_os: row.platform_os || '',
                    platform_version: row.platform_version || '',
                    app_version: row.app_version || '',
                    network_type: row.network_type || '',
                    data_source: 'AFE CSV Export',
                    submission_date: submissionDate
                };
            });

            const json2csvParser = new Parser({ fields: AFE_73_FIELDS });
            const csvData = json2csvParser.parse(mapped73Rows);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=afe_export.csv');
            res.status(200).send(csvData);

        } catch (error) {
            console.error('[AFE] Error exporting CSV:', error);
            res.status(500).json({ error: 'Failed to export CSV' });
        }
    },

    /**
     * Export AFE details as CSV (Legacy 85-Column Format)
     * GET /api/afe/export-csv-legacy?ngoId=<id>&deviceId=<id>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>
     */
    exportCsvLegacy: async (req, res) => {
        try {
            const { ngoId, deviceId, serialNumber, moduleId, moduleName, startDate, endDate, search } = req.query;

            let baseQuery = `
                FROM afe_details ad
                LEFT JOIN devices d ON ad.device_id = d.id
                LEFT JOIN afe_devices adev ON (ad.device_id IS NOT NULL AND ad.device_id = adev.device_id)
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
                baseQuery += ` AND (d.serial_number = $${paramIndex} OR adev.serial_number = $${paramIndex})`;
                params.push(serialNumber);
                paramIndex++;
            }

            if (moduleId) {
                baseQuery += ` AND ad.module_id = $${paramIndex++}`;
                params.push(moduleId);
            }

            if (moduleName) {
                baseQuery += ` AND ad.module_name ILIKE $${paramIndex++}`;
                params.push(`%${moduleName}%`);
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
                    ad.module_id ILIKE $${paramIndex} OR
                    ad.module_name ILIKE $${paramIndex} OR
                    ad.city ILIKE $${paramIndex} OR
                    ad.district ILIKE $${paramIndex} OR
                    ad.state ILIKE $${paramIndex} OR
                    ad.district_code ILIKE $${paramIndex} OR
                    ad.school_type ILIKE $${paramIndex} OR
                    ad.avatar_name ILIKE $${paramIndex} OR
                    ad.facilitator_name ILIKE $${paramIndex} OR
                    d.serial_number ILIKE $${paramIndex} OR
                    adev.serial_number ILIKE $${paramIndex}
                )`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            const query = `
                SELECT 
                    ad.*,
                    COALESCE(d.serial_number, adev.serial_number, '') as serial_number,
                    COALESCE(d.mac_address, adev.mac_address, '') as mac_address,
                    COALESCE(NULLIF(n."NGO_name", 'Default NGO'), NULLIF(dn."NGO_name", 'Default NGO'), NULLIF(NULLIF(ad.partner_name, 'Default NGO'), 'sama'), 'Sama Digital Foundation – 1') as ngo_name,
                    COALESCE(NULLIF(n."NGO_name", 'Default NGO'), NULLIF(dn."NGO_name", 'Default NGO'), NULLIF(NULLIF(ad.partner_name, 'Default NGO'), 'sama'), 'Sama Digital Foundation – 1') as partner_name,
                    COALESCE(ad.school_name, dn."NGO_name") as school_name
                ${baseQuery}
                ORDER BY ad.session_date DESC, ad.student_dummy_id
            `;

            const result = await pool.query(query, params);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'No data found to export' });
            }

            const mappedCsvRows = result.rows.map(row => {
                const completionDate = formatDateToDDMMYYYY(row.submission_date || row.session_date);
                const tourCode = mapTourAndProductCode(row.module_name, row.module_id, row.tour_type);
                const tourName = mapTourCodeToName(tourCode);
                const productName = mapTourCodeToProductName(tourCode);
                const monthCode = mapMonthToCode(row.month_name, row.session_date);
                const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = row.month_name || monthNames[monthCode] || '';

                return {
                    ...row,
                    tour_name: tourName,
                    tour_id: tourCode,
                    tour_id_code: tourCode,
                    product_name: productName,
                    product_name_code: tourCode,
                    module_name: row.module_name || productName,
                    country_code: row.country_code || 'IN',
                    distribution_channel_host_id: 'Sama Platform',
                    distribution_channel_host: 2,
                    underserved_reach: 1,
                    school_year_code: mapSchoolYearToCode(row.session_date, row.academic_year),
                    month_name: monthName,
                    month_code: monthCode,
                    school_type: row.school_type || 'Government School',
                    school_type_code: mapSchoolTypeToCode(row.school_type),
                    language: row.language || 'English',
                    language_code: mapLanguageToCode(row.language),
                    unit_type: row.unit_type || 'Modular AFE',
                    unit_type_code: mapUnitTypeToCode(row.unit_type),
                    data_collection_method: row.data_collection_method || 'Method 2 - Individual Tracking',
                    data_collection_method_code: mapDataCollectionMethodToCode(row.data_collection_method),
                    partner_name: row.partner_name || 'Sama Digital Foundation – 1',
                    partner_name_code: 1,
                    data_source: 'AFE CSV Export',
                    session_start_date: row.session_start_date || row.session_date,
                    session_end_date: row.session_end_date || row.session_date,
                    session_start_time: row.session_start_time || '',
                    session_stop_time: row.session_stop_time || '',
                    completion_date: completionDate,
                    profile_name: row.avatar_name || '',
                    afe_session_id: row.session_id || '',
                    number_of_videos_watched: row.videos_completed_count || 0,
                    number_of_tests_attempted: row.quizzes_completed_count || 0,
                    ben: parseInt(row.student_count, 10) || 1,
                    fy: row.academic_year || '2025-26'
                };
            });

            const json2csvParser = new Parser();
            const csvData = json2csvParser.parse(mappedCsvRows);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=afe_export_legacy.csv');
            res.status(200).send(csvData);

        } catch (error) {
            console.error('[AFE] Error exporting legacy CSV:', error);
            res.status(500).json({ error: 'Failed to export legacy CSV' });
        }
    }
};

module.exports = AFEController;
