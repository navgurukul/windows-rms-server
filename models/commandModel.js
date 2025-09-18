
const db = require('../config/database');

const CommandModel = {
    create: async (device_id, command_type, command_data) => {
        const result = await db.query(
            'INSERT INTO commands (device_id, command_type, command_data) VALUES ($1, $2, $3) RETURNING *',
            [device_id, command_type, command_data]
        );
        return result.rows[0];
    },
    
    getPendingCommands: async (device_id) => {
        const result = await db.query(
            'SELECT * FROM commands WHERE device_id = $1 AND status = $2 ORDER BY created_at ASC',
            [device_id, 'pending']
        );
        return result.rows;
    },
    
    markAsExecuted: async (command_id) => {
        const result = await db.query(
            'UPDATE commands SET status = $1, executed_at = NOW() WHERE id = $2 RETURNING *',
            ['executed', command_id]
        );
        return result.rows[0];
    }
};

module.exports = CommandModel;