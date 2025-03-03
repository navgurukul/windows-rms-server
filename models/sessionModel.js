const db = require('../config/database');

const SessionModel = {
    startSession: async (device_id) => {
        const result = await db.query(
            'INSERT INTO usage_sessions (device_id, start_time) VALUES ($1, NOW()) RETURNING *',
            [device_id]
        );
        return result.rows[0];
    },
    
    endSession: async (session_id) => {
        const result = await db.query(
            `UPDATE usage_sessions 
             SET end_time = NOW(),
             duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
             WHERE id = $1 
             RETURNING *`,
            [session_id]
        );
        return result.rows[0];
    },
    
    getById: async (id) => {
        const result = await db.query('SELECT * FROM usage_sessions WHERE id = $1', [id]);
        return result.rows[0];
    }
};

module.exports = SessionModel;