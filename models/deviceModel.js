
const { pool } = require('../config/database');

const fetchDeviceIdFromSerialNumber = async (serial_number) => {
    const fetchDeviceId = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
    return fetchDeviceId?.rows[0]?.id || null;
};

const DeviceModel = {
    create: async (username, serial_number, mac_address, location, rms_version = '0.0.0', ngo_id = null, donor_id = null) => {
        const deviceExists = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
        if (deviceExists.rows.length > 0) {
            // Update donor_id and ngo_id if they are provided and different
            if (ngo_id || donor_id) {
                await pool.query(
                    'UPDATE devices SET ngo_id = COALESCE($1, ngo_id), donor_id = COALESCE($2, donor_id) WHERE serial_number = $3',
                    [ngo_id, donor_id, serial_number]
                );
            }
            return deviceExists.rows[0];
        }
        const result = await pool.query(
            'INSERT INTO devices (username, serial_number, mac_address, location, rms_version, ngo_id, donor_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [username, serial_number, mac_address, location, rms_version, ngo_id, donor_id]
        );
        return result.rows[0];
    },

    getById: async (id) => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            WHERE d.id = $1
            GROUP BY d.id, n."NGO_name", don.donor_name
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    getAll: async () => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            GROUP BY d.id, n."NGO_name", don.donor_name
            ORDER BY d.id
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    updateDeviceStatus: async (deviceId, isActive, rms_version) => {
        let query = 'UPDATE devices SET isActive = $1';
        const params = [isActive, deviceId];

        if (rms_version) {
            query += ', rms_version = $3';
            params.push(rms_version);
        }

        query += ' WHERE id = $2';

        const result = await pool.query(query, params);
        return result.rows[0];
    },

    getBySerialNumber: async (serial_number) => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            WHERE d.serial_number = $1
            GROUP BY d.id, n."NGO_name", don.donor_name
        `;
        const result = await pool.query(query, [serial_number]);
        return result.rows[0] || null;
    },

    fetchDeviceIdFromSerialNumber
};

module.exports = DeviceModel;