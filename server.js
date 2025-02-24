const express = require('express');
const { Pool } = require('pg');
const os = require('os');

const app = express();
app.use(express.json()); // For parsing JSON bodies

// Database configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'laptop_tracking',
  password: 'your_password',
  port: 5432,
});

// POST endpoint to receive metrics
app.post('/api/metrics', async (req, res) => {
  try {
    const { system_id, name, active_time, location } = req.body;

    // Validate required fields
    if (!system_id || !name) {
      return res.status(400).json({ 
        error: 'system_id and name are required fields' 
      });
    }

    const query = `
      INSERT INTO system_metrics (system_id, name, active_time, location)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;

    const values = [
      system_id || os.hostname(), // Use provided system_id or fallback to hostname
      name,
      active_time || '00:00:00',
      location || 'Unknown'
    ];

    const result = await pool.query(query, values);
    res.status(201).json({
      message: 'Data inserted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error inserting data:', error);
    res.status(500).json({ 
      error: 'Failed to insert metrics',
      details: error.message 
    });
  }
});

// GET endpoint to retrieve metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_metrics ORDER BY date_of_entry DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch metrics',
      details: error.message 
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});