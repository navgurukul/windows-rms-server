const db = require('../config/database');

const UsageModel = {
    getDailyUsage: async (device_id) => {
        const result = await db.query(
            `SELECT 
                DATE(start_time) as date,
                SUM(duration_minutes) as total_minutes,
                COUNT(*) as session_count
             FROM usage_sessions
             WHERE device_id = $1
             AND end_time IS NOT NULL
             GROUP BY DATE(start_time)
             ORDER BY date DESC`,
            [device_id]
        );
        return result.rows;
    }
};

module.exports = UsageModel;