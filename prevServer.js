const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'laptop_tracking',
    password: 'password',
    port: 5432,
});

// Create or update user
app.post('/api/users', async (req, res) => {
    try {
        const { system_id, name, location } = req.body;
        
        // Try to find existing user
        let result = await pool.query(
            'SELECT id FROM users WHERE system_id = $1',
            [system_id]
        );

        if (result.rows.length === 0) {
            // Create new user if doesn't exist
            result = await pool.query(
                'INSERT INTO users (system_id, name, location) VALUES ($1, $2, $3) RETURNING id',
                [system_id, name, location]
            );
        }

        res.json({ id: result.rows[0].id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update daily metrics
app.post('/api/daily-metrics', async (req, res) => {
    try {
        const { user_id, active_time, date } = req.body;

        // Update or insert daily metrics
        const result = await pool.query(`
            INSERT INTO daily_metrics (user_id, date, total_active_time)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, date) 
            DO UPDATE SET total_active_time = $3
            RETURNING *
        `, [user_id, date, active_time]);

        res.json({ message: 'Metrics updated', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user metrics for a date range
app.get('/api/metrics/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { start_date, end_date } = req.query;

        const result = await pool.query(`
            SELECT u.name, u.system_id, u.location, 
                   dm.date, dm.total_active_time
            FROM users u
            JOIN daily_metrics dm ON u.id = dm.user_id
            WHERE u.id = $1 
            AND dm.date BETWEEN $2 AND $3
            ORDER BY dm.date
        `, [userId, start_date || '1900-01-01', end_date || '2100-12-31']);

        res.json(result.rows);
    } catch (error) {   
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
