
const { pool } = require('../config/database');

const fetchDeviceIdFromSerialNumber = async (serial_number) => {
    const fetchDeviceId = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
    return fetchDeviceId?.rows[0]?.id || null;
};

const DeviceModel = {
    create: async (username, serial_number, mac_address, location, rms_version = '0.0.0') => {
        const deviceExists = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
        if (deviceExists.rows.length > 0) {
            return deviceExists.rows[0];
        }
        const result = await pool.query(
            'INSERT INTO devices (username, serial_number, mac_address, location, rms_version) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [username, serial_number, mac_address, location, rms_version]
        );
        return result.rows[0];
    },

    getById: async (id) => {
        const result = await pool.query('SELECT * FROM devices WHERE id = $1', [id]);
        return result.rows[0];
    },

    getAll: async () => {
        const result = await pool.query('SELECT * FROM devices');
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
        const result = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
        return result.rows[0] || null;
    },

    fetchDeviceIdFromSerialNumber
};

module.exports = DeviceModel;