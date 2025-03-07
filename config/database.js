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
              username VARCHAR(255) NOT NULL,
              serial_number VARCHAR(50) NOT NULL UNIQUE,
              mac_address VARCHAR(50) NOT NULL,
              location VARCHAR(255) NOT NULL,
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
        system_id VARCHAR(255) NOT NULL,
        mac_address VARCHAR(50) NOT NULL,
        serial_number VARCHAR(50) NOT NULL,
        username VARCHAR(255) NOT NULL,
        total_active_time INTEGER NOT NULL,
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        location_name VARCHAR(255),
        timestamp TIMESTAMP NOT NULL
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