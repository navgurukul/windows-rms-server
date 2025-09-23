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
                CREATE TABLE IF NOT EXISTS laptop_tracking(
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

        await pool.query(`
                CREATE TABLE IF NOT EXISTS softwares (
                id SERIAL PRIMARY KEY,
                software_name VARCHAR(255) NOT NULL,
                isActive BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        await pool.query(`
                CREATE TABLE IF NOT EXISTS softwares_installed (
                id SERIAL PRIMARY KEY,
                device_id INTEGER NOT NULL,
                software_name VARCHAR(255) NOT NULL,
                isSuccessful BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (device_id) REFERENCES devices(id)
                )
            `);

        console.log('Database tables initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

async function createSoftwareSeeder() {
    try {
        const softwareExists = await pool.query('SELECT * FROM softwares');
        if (softwareExists.rows.length > 0) {
            return;
        }
        await pool.query('INSERT INTO softwares (software_name) VALUES ($1)', ['obs-studio.portable']);
    } catch (error) {
        console.error('Error creating software seeder:', error);
        throw error;
    }
}

module.exports = {
    pool,
    createSoftwareSeeder,
    initializeDatabase
};