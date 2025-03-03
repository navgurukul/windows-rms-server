const db = require('../config/database');

const DeviceModel = {
    create: async (hostname, device_name) => {
        const result = await db.query(
            'INSERT INTO devices (hostname, device_name) VALUES ($1, $2) RETURNING *',
            [hostname, device_name]
        );
        return result.rows[0];
    },
    
    getById: async (id) => {
        const result = await db.query('SELECT * FROM devices WHERE id = $1', [id]);
        return result.rows[0];
    },
    
    getAll: async () => {
        const result = await db.query('SELECT * FROM devices');
        return result.rows;
    }
};

module.exports = DeviceModel;