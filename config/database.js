// server/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

// Initialize database tables
async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS devices (
                id SERIAL PRIMARY KEY,
                hostname VARCHAR(255) NOT NULL,
                device_name VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS usage_sessions (
                id SERIAL PRIMARY KEY,
                device_id INTEGER REFERENCES devices(id),
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                duration_minutes DECIMAL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
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
        `);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

module.exports = {
    pool,
    initializeDatabase
};