
const { pool } = require('../config/database');

const fetchDeviceIdFromSerialNumber = async (serial_number) => {
    const fetchDeviceId = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
    return fetchDeviceId.rows[0].id;
};

const DeviceModel = {
    create: async (username, serial_number, mac_address, location) => {
        const deviceExists = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
        if (deviceExists.rows.length > 0) {
            return deviceExists.rows[0];
        }
        const result = await pool.query(
            'INSERT INTO devices (username, serial_number, mac_address, location) VALUES ($1, $2, $3, $4) RETURNING *',
            [username, serial_number, mac_address, location]
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

    fetchDeviceIdFromSerialNumber
};

module.exports = DeviceModel;