// server/controllers/laptopTrackingController.js
const { pool } = require('../config/database');
const DeviceModel = require('../models/deviceModel');

/**
 * Syncs laptop tracking data from client to the server
 * Aggregates data by day for each user and system
 */
const syncLaptopData = async (req, res) => {
    try {
        const {
            username,
            system_id,
            mac_address,
            serial_number,
            active_time, // Time in seconds for this session
            total_time, // Optional: total time if aggregated on client
            latitude,
            longitude,
            location_name,
            timestamp // Optional: specific timestamp for this record
        } = req.body;

        // Validate required fields
        if (!username || !system_id || !mac_address || !serial_number ||
            (active_time === undefined && total_time === undefined)) {
            return res.status(400).json({
                error: 'Missing required fields. Required: username, system_id, mac_address, serial_number, and either active_time or total_time'
            });
        }

        const device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
        if (!device_id) {
            return res.status(400).json({ error: 'Device not found' });
        }
        // Get the date to use for aggregation (UTC midnight)
        // Use provided timestamp or current time
        const recordDate = timestamp ? new Date(timestamp) : new Date();
        recordDate.setHours(0, 0, 0, 0);

        // Get the actual timestamp to record (now or provided)
        const actualTimestamp = timestamp ? new Date(timestamp) : new Date();

        // Check if an entry already exists for this user/system/day
        const existingEntry = await pool.query(
            `SELECT id, total_active_time FROM laptop_tracking 
             WHERE device_id = $1 AND 
             DATE(timestamp) = $2`,
            [device_id, recordDate]
        );

        if (existingEntry.rows.length > 0) {
            // Update existing entry
            const currentEntry = existingEntry.rows[0];
            let updatedTime;

            if (total_time !== undefined) {
                // If total_time is provided, use the larger value
                const currentTime = parseInt(currentEntry.total_active_time);
                const newTotalTime = parseInt(total_time);
                updatedTime = newTotalTime > currentTime ? newTotalTime : currentTime;
            } else {
                // Otherwise add the active_time to the existing total
                updatedTime = parseInt(currentEntry.total_active_time) + parseInt(active_time);
            }

            await pool.query(
                `UPDATE laptop_tracking 
                 SET total_active_time = $1, 
                     latitude = $2, 
                     longitude = $3, 
                     location_name = $4, 
                     timestamp = $5
                 WHERE id = $6`,
                [updatedTime, latitude || null, longitude || null, location_name || null, actualTimestamp, currentEntry.id]
            );

            return res.status(200).json({
                message: 'Laptop tracking data updated successfully',
                tracking_id: currentEntry.id,
                total_active_time: updatedTime
            });
        } else {
            // Create new entry
            const result = await pool.query(
                `INSERT INTO laptop_tracking 
                 (device_id, total_active_time, 
                  latitude, longitude, location_name, timestamp)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING id, total_active_time`,
                [
                    device_id,
                    total_time !== undefined ? total_time : active_time, // Use total_time if provided, otherwise active_time
                    latitude || null,
                    longitude || null,
                    location_name || null,
                    actualTimestamp
                ]
            );

            return res.status(201).json({
                message: 'Laptop tracking data created successfully',
                tracking_id: result.rows[0].id,
                total_active_time: result.rows[0].total_active_time
            });
        }
    } catch (error) {
        console.error('Error syncing laptop tracking data:', error);
        res.status(500).json({ error: 'Failed to sync laptop tracking data' });
    }
};

/**
 * Bulk sync multiple records from client
 */
const bulkSyncLaptopData = async (req, res) => {
    const client = await pool.connect();

    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ error: 'No valid records provided for syncing' });
        }

        // Begin transaction
        await client.query('BEGIN');

        const results = [];

        // Process each record
        for (const record of records) {
            // Validate required fields
            if (!record.username || !record.system_id || !record.mac_address ||
                !record.serial_number || record.total_time === undefined) {
                continue; // Skip invalid records
            }
            const device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(record.serial_number);
            if (!device_id) {
                continue; // Skip invalid records
            }
            // Parse the date if it's provided, otherwise use current date
            let recordDate;
            if (record.date) {
                recordDate = new Date(record.date);
            } else if (record.last_updated) {
                recordDate = new Date(record.last_updated);
                recordDate.setHours(0, 0, 0, 0); // Set to midnight
            } else {
                recordDate = new Date();
                recordDate.setHours(0, 0, 0, 0); // Set to midnight
            }

            // Format for database comparison (YYYY-MM-DD)
            const dateStr = recordDate.toISOString().split('T')[0];

            // Check if an entry already exists for this day/system/user combination
            const existingEntry = await client.query(
                `SELECT id, total_active_time FROM laptop_tracking 
                 WHERE device_id = $1 AND 
                 DATE(timestamp) = $2`,
                [device_id, dateStr]
            );

            // Get the latest location data and timestamp
            const latitude = record.latitude || null;
            const longitude = record.longitude || null;
            const location_name = record.location_name || null;

            // Use the provided last_updated timestamp or the current time
            let timestamp;
            if (record.last_updated) {
                timestamp = new Date(record.last_updated);
            } else {
                timestamp = new Date();
            }

            if (existingEntry.rows.length > 0) {
                // Update existing entry
                const currentEntry = existingEntry.rows[0];

                // If we received a total_time that's larger than what we already have, use it
                // Otherwise, use our existing value (don't decrease usage time)
                const currentTime = parseInt(currentEntry.total_active_time);
                const newTime = parseInt(record.total_time);
                const updatedTime = newTime > currentTime ? newTime : currentTime;

                const updateResult = await client.query(
                    `UPDATE laptop_tracking 
                     SET total_active_time = $1, 
                         latitude = $2, 
                         longitude = $3, 
                         location_name = $4, 
                         timestamp = $5
                     WHERE id = $6
                     RETURNING id, total_active_time`,
                    [
                        updatedTime,
                        latitude,
                        longitude,
                        location_name,
                        timestamp,
                        currentEntry.id
                    ]
                );

                results.push({
                    action: 'updated',
                    id: updateResult.rows[0].id,
                    total_active_time: updateResult.rows[0].total_active_time,
                    date: dateStr,
                    device_id: device_id
                });
            } else {
                // Insert new entry
                const insertResult = await client.query(
                    `INSERT INTO laptop_tracking 
                     (device_id, total_active_time, latitude, longitude, location_name, timestamp)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, total_active_time`,
                    [
                        device_id,
                        record.total_time, // Use the provided total_time directly
                        latitude,
                        longitude,
                        location_name,
                        timestamp
                    ]
                );

                results.push({
                    action: 'inserted',
                    id: insertResult.rows[0].id,
                    total_active_time: insertResult.rows[0].total_active_time,
                    date: dateStr,
                    device_id: device_id
                });
            }
        }

        // Commit the transaction
        await client.query('COMMIT');

        return res.status(200).json({
            message: 'Bulk sync completed successfully',
            results: results,
            processed: results.length,
            received: records.length
        });
    } catch (error) {
        // Rollback in case of error
        await client.query('ROLLBACK');
        console.error('Error during bulk sync:', error);
        res.status(500).json({ error: 'Failed to sync laptop tracking data' });
    } finally {
        // Release the client back to the pool
        client.release();
    }
};

/**
 * Get daily usage statistics for a specific user
 */
const getDailyUsage = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                DATE(timestamp) as date,
                device_id,
                serial_number,
                total_active_time as total_time,
                timestamp as last_updated,
                latitude,
                longitude,
                location_name
            FROM laptop_tracking
            WHERE device_id = $1
        `;

        const queryParams = [device_id];

        if (start_date) {
            query += ` AND DATE(timestamp) >= $${queryParams.length + 1}`;
            queryParams.push(start_date);
        }

        if (end_date) {
            query += ` AND DATE(timestamp) <= $${queryParams.length + 1}`;
            queryParams.push(end_date);
        }

        query += ` ORDER BY date DESC, system_id`;

        const result = await pool.query(query, queryParams);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching laptop usage data:', error);
        res.status(500).json({ error: 'Failed to fetch laptop usage data' });
    }
};

/**
 * Get all laptop tracking data with optional filtering by date range
 */
const getAllData = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        // Populate device_id from the device table
        // Join with devices table to get device_id for each tracking record
        let joinDeviceTable = `
            SELECT 
                d.id as device_id,
                DATE(lt.timestamp) as date,
                lt.total_active_time as total_time,
                lt.timestamp as last_updated,
                lt.latitude,
                lt.longitude,
                lt.location_name
            FROM laptop_tracking lt
            JOIN devices d ON lt.device_id = d.id
        `;

        // let query = `
        //     SELECT 
        //         device_id,
        //         DATE(timestamp) as date,
        //         total_active_time as total_time,
        //         timestamp as last_updated,
        //         latitude,
        //         longitude,
        //         location_name
        //     FROM laptop_tracking
        // `;

        const queryParams = [];

        // Add date filtering if provided
        if (start_date || end_date) {
            joinDeviceTable += ' WHERE';

            if (start_date) {
                joinDeviceTable += ` DATE(timestamp) >= $${queryParams.length + 1}`;
                queryParams.push(start_date);
            }

            if (end_date) {
                if (start_date) joinDeviceTable += ' AND';
                joinDeviceTable += ` DATE(timestamp) <= $${queryParams.length + 1}`;
                queryParams.push(end_date);
            }
        }

        joinDeviceTable += ` ORDER BY date DESC, device_id`;

        const result = await pool.query(joinDeviceTable, queryParams);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching all laptop tracking data:', error);
        res.status(500).json({ error: 'Failed to fetch laptop tracking data' });
    }
};

/**
 * Get laptop tracking data for a specific system ID
 */
const getSystemData = async (req, res) => {
    try {
        const { device_id } = req.params;
        const { start_date, end_date } = req.query;

        // let query = `
        //     SELECT 
        //         device_id,
        //         DATE(timestamp) as date,
        //         serial_number,
        //         total_active_time as total_time,
        //         timestamp as last_updated,
        //         latitude,
        //         longitude,
        //         location_name
        //     FROM laptop_tracking
        //     WHERE device_id = $1
        // `;

        const query = `
            SELECT 
                device_id,
                DATE(timestamp) as date,
                total_active_time as total_time,
                timestamp as last_updated,
                latitude,
                longitude,
                location_name
            FROM laptop_tracking
            WHERE device_id = $1
        `;

        const queryParams = [device_id];

        if (start_date) {
            query += ` AND DATE(timestamp) >= $${queryParams.length + 1}`;
            queryParams.push(start_date);
        }

        if (end_date) {
            query += ` AND DATE(timestamp) <= $${queryParams.length + 1}`;
            queryParams.push(end_date);
        }

        query += ` ORDER BY date DESC, device_id`;

        const result = await pool.query(query, queryParams);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching system data:', error);
        res.status(500).json({ error: 'Failed to fetch system data' });
    }
};

/**
 * Get laptop tracking data for a specific serial number
 */
const getSerialNumberData = async (req, res) => {
    try {
        const { serial_number } = req.params;
        const { start_date, end_date } = req.query;

        let query = `
            SELECT 
                id,
                DATE(timestamp) as date,
                system_id,
                mac_address,
                serial_number,
                username,
                total_active_time as total_time,
                timestamp as last_updated,
                latitude,
                longitude,
                location_name
            FROM laptop_tracking
            WHERE serial_number = $1
        `;

        const queryParams = [serial_number];

        if (start_date) {
            query += ` AND DATE(timestamp) >= $${queryParams.length + 1}`;
            queryParams.push(start_date);
        }

        if (end_date) {
            query += ` AND DATE(timestamp) <= $${queryParams.length + 1}`;
            queryParams.push(end_date);
        }

        query += ` ORDER BY date DESC`;

        const result = await pool.query(query, queryParams);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching serial number data:', error);
        res.status(500).json({ error: 'Failed to fetch serial number data' });
    }
};

module.exports = {
    syncLaptopData,
    bulkSyncLaptopData,
    getDailyUsage,
    getAllData,
    getSystemData,
    getSerialNumberData
};