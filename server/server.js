// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// PostgreSQL connection setup
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'laptop_tracking',
    password: 'postgres', 
    port: 5432,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});

// Create metrics table if it doesn't exist
pool.query(`
    CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        client_id VARCHAR(255) NOT NULL,
        system_id VARCHAR(255) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        session_start TIMESTAMP NOT NULL,
        session_duration INTEGER NOT NULL,
        hostname VARCHAR(255) NOT NULL,
        computer_name VARCHAR(255),
        domain VARCHAR(255),
        memory_usage DECIMAL,
        cpu_load DECIMAL,
        metrics_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`).catch(err => console.error('Error creating metrics table:', err));

// Add this endpoint to match the client's request
// server.js endpoint for metrics
app.post('/metrics/:clientId', async (req, res) => {
    const { clientId } = req.params;
    console.log('\n📊 Received metrics request for client:', clientId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {
        const {
            systemId,
            timestamp,
            session,
            location,
            system,
            type
        } = req.body;

        // Log the incoming data
        console.log('📌 System ID:', systemId);
        console.log('💻 Computer Name:', location.computerName);
        console.log('💾 Memory Usage:', system.memory.usagePercent + '%');
        console.log('⚡ CPU Load:', system.cpu.loadAvg[0].toFixed(2));

        const result = await pool.query(
            `INSERT INTO metrics (
                client_id, system_id, timestamp, 
                session_start, session_duration,
                hostname, computer_name, domain,
                memory_usage, cpu_load, metrics_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id`,
            [
                clientId,
                systemId,
                new Date(timestamp),
                new Date(session.startTime),
                parseInt(session.duration.milliseconds),
                location.hostname,
                location.computerName,
                location.domain,
                parseFloat(system.memory.usagePercent),
                parseFloat(system.cpu.loadAvg[0]),
                req.body
            ]
        );

        console.log('✅ Data inserted successfully with ID:', result.rows[0].id);

        res.json({
            status: 'received',
            recordId: result.rows[0].id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error storing metrics:', error);
        res.status(500).json({ 
            error: 'Failed to store metrics',
            details: error.message
        });
    }
});

const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflicts
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});