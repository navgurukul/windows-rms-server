// // server.js
// const express = require('express');
// const { Pool } = require('pg');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// app.use(express.json());
// app.use(cors());

// // PostgreSQL connection setup
// const pool = new Pool({
//     user: 'postgres',
//     host: 'localhost',
//     database: 'laptop_tracking',
//     password: 'password', // Use your actual password
//     port: 5432,
// });

// // Test database connection
// pool.query('SELECT NOW()', (err, res) => {
//     if (err) {
//         console.error('Database connection error:', err);
//     } else {
//         console.log('Database connected successfully');
//     }
// });

// // API Endpoints for tracking laptop usage
// // 1. Register a device
// app.post('/api/devices', async (req, res) => {
//     const { hostname, device_name } = req.body;
//     try {
//         const result = await pool.query(
//             'INSERT INTO devices (hostname, device_name) VALUES ($1, $2) RETURNING *',
//             [hostname, device_name]
//         );
//         res.json(result.rows[0]);
//     } catch (error) {
//         console.error('Error registering device:', error);
//         res.status(500).json({ error: 'Failed to register device' });
//     }
// });

// // 2. Start a session
// app.post('/api/sessions/start', async (req, res) => {
//     const { device_id } = req.body;
//     try {
//         const result = await pool.query(
//             'INSERT INTO usage_sessions (device_id, start_time) VALUES ($1, NOW()) RETURNING *',
//             [device_id]
//         );
//         res.json(result.rows[0]);
//     } catch (error) {
//         console.error('Error starting session:', error);
//         res.status(500).json({ error: 'Failed to start session' });
//     }
// });

// // 3. End a session
// app.put('/api/sessions/:session_id/end', async (req, res) => {
//     const { session_id } = req.params;
//     try {
//         const result = await pool.query(
//             `UPDATE usage_sessions 
//              SET end_time = NOW(),
//              duration_minutes = EXTRACT(EPOCH FROM (NOW() - start_time))/60
//              WHERE id = $1 
//              RETURNING *`,
//             [session_id]
//         );
//         res.json(result.rows[0]);
//     } catch (error) {
//         console.error('Error ending session:', error);
//         res.status(500).json({ error: 'Failed to end session' });
//     }
// });

// // 4. Get daily usage summary
// app.get('/api/usage/:device_id', async (req, res) => {
//     const { device_id } = req.params;
//     try {
//         const result = await pool.query(
//             `SELECT 
//                 DATE(start_time) as date,
//                 SUM(duration_minutes) as total_minutes,
//                 COUNT(*) as session_count
//              FROM usage_sessions
//              WHERE device_id = $1
//              AND end_time IS NOT NULL
//              GROUP BY DATE(start_time)
//              ORDER BY date DESC`,
//             [device_id]
//         );
//         res.json(result.rows);
//     } catch (error) {
//         console.error('Error fetching usage:', error);
//         res.status(500).json({ error: 'Failed to fetch usage data' });
//     }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
// });