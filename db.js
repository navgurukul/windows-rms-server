const { Pool } = require('pg');
const os = require('os');

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'laptop_tracking', // Based on your pgAdmin screenshot
  password: 'your_password',
  port: 5432,
});

async function insertSystemMetrics() {
  try {
            const metrics = {
            system_id: os.hostname(), // Gets computer hostname
            name: 'System Name',
            active_time: '02:00:00', // Format: HH:MM:SS
            location: 'Office'
            };

    const query = `
      INSERT INTO system_metrics (system_id, name, active_time, location)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [
      metrics.system_id,
      metrics.name,
      metrics.active_time,
      metrics.location
    ];  

    const result = await pool.query(query, values);
    console.log('Data inserted successfully:', result.rows[0]);
  } catch (error) {
    console.error('Error inserting data:', error);
  } finally {
    // If you want to close the pool after insertion
    // await pool.end();
  }
}

// Run the function
insertSystemMetrics();