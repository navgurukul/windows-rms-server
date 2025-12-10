// server/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // ssl: {
    //     rejectUnauthorized: false
    // }
});

async function createSoftwareSeeder() {
    try {
        const softwareExists = await pool.query('SELECT * FROM softwares');
        if (softwareExists.rows.length > 0) {
            return;
        }
        await pool.query('INSERT INTO softwares (software_name, winget_id) VALUES ($1, $2)', ['obs-studio', 'OBSProject.OBSStudio']);
        await pool.query('INSERT INTO softwares (software_name, winget_id) VALUES ($1, $2)', ['brave', 'Brave.Brave']);
        await pool.query('INSERT INTO softwares (software_name, winget_id) VALUES ($1, $2)', ['vlc', 'VideoLAN.VLC']);
        // await pool.query('INSERT INTO softwares (software_name) VALUES ($1)', ['flux']);
        // await pool.query('INSERT INTO softwares (software_name) VALUES ($1)', ['everything']);
        // await pool.query('INSERT INTO softwares (software_name) VALUES ($1)', ['discord']);
    } catch (error) {
        console.error('Error creating software seeder:', error);
        throw error;
    }
}

module.exports = {
    pool,
    createSoftwareSeeder
};
