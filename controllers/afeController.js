const { pool } = require('../config/database');
const DeviceModel = require('../models/deviceModel');

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

        try {
            const { ngoKey, serialNumber, macAddress, snapshots } = req.body;

            // Validate request
            if (!ngoKey || !serialNumber || !macAddress || !Array.isArray(snapshots)) {
                return res.status(400).json({
                    error: 'Missing required fields: ngoKey, serialNumber, macAddress, snapshots[]'
                });
            }

            await client.query('BEGIN');

            // 1. Validate NGO key
            const ngoResult = await client.query(
                'SELECT id FROM "NGOs" WHERE unique_key = $1',
                [ngoKey]
            );

            if (ngoResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Invalid NGO key' });
            }

            const ngoId = ngoResult.rows[0].id;

            // 2. Get or create device
            let deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(serialNumber);

            if (!deviceId) {
                // Auto-create device
                const deviceResult = await client.query(
                    `INSERT INTO devices (username, serial_number, mac_address, location, ngo_id, rms_version)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id`,
                    ['AFE-User', serialNumber, macAddress, 'Unknown', ngoId, '0.0.0']
                );
                deviceId = deviceResult.rows[0].id;
                console.log(`[AFE] Auto-created device ${deviceId} for serial ${serialNumber}`);
            }

            // 3. Upsert snapshots (idempotent via unique constraint)
            const syncedIds = [];

            for (const snapshot of snapshots) {
                const result = await client.query(
                    `INSERT INTO afe_details
                    (ngo_id, device_id, student_uuid, student_name, snapshot_date,
                     modules_started, modules_completed, time_watched, time_read, avg_quiz_score,
                     learning_summary_text, learning_summary_progress_note, learning_summary_updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (device_id, student_uuid, snapshot_date)
                    DO UPDATE SET
                        modules_started = EXCLUDED.modules_started,
                        modules_completed = EXCLUDED.modules_completed,
                        time_watched = EXCLUDED.time_watched,
                        time_read = EXCLUDED.time_read,
                        avg_quiz_score = EXCLUDED.avg_quiz_score,
                        learning_summary_text = EXCLUDED.learning_summary_text,
                        learning_summary_progress_note = EXCLUDED.learning_summary_progress_note,
                        learning_summary_updated_at = EXCLUDED.learning_summary_updated_at,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING id`,
                    [
                        ngoId,
                        deviceId,
                        snapshot.studentUuid,
                        snapshot.studentName,
                        snapshot.snapshotDate,
                        Math.round(snapshot.modulesStarted || 0),
                        Math.round(snapshot.modulesCompleted || 0),
                        Math.round(snapshot.timeWatched || 0),
                        Math.round(snapshot.timeRead || 0),
                        snapshot.avgQuizScore,
                        snapshot.learningSummary?.text || null,
                        snapshot.learningSummary?.progressNote || null,
                        snapshot.learningSummary?.lastUpdatedAt || null
                    ]
                );
                syncedIds.push(result.rows[0].id);
            }

            await client.query('COMMIT');

            console.log(`[AFE] Successfully synced ${syncedIds.length} snapshots for device ${deviceId}`);

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
     * Get aggregated overview data from materialized view
     * GET /api/afe/overview?ngoId=<id>
     */
    getOverview: async (req, res) => {
        try {
            const { ngoId } = req.query;

            let query = 'SELECT * FROM afe_overview_view';
            const params = [];

            if (ngoId) {
                query += ' WHERE ngo_id = $1';
                params.push(ngoId);
            }

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
                query += ` AND snapshot_date >= $${paramIndex++}`;
                params.push(startDate);
            }

            if (endDate) {
                query += ` AND snapshot_date <= $${paramIndex++}`;
                params.push(endDate);
            }

            query += ` ORDER BY snapshot_date DESC, student_name`;
            query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
            params.push(limit, (page - 1) * limit);

            const result = await pool.query(query, params);
            res.status(200).json(result.rows);
        } catch (error) {
            console.error('[AFE] Error fetching details:', error);
            res.status(500).json({ error: 'Failed to fetch AFE details' });
        }
    }
};

module.exports = AFEController;
