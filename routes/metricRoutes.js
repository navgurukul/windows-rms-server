// server/routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { validateMetrics } = require('../middleware/validation');

// Store metrics
router.post('/:clientId', validateMetrics, async (req, res) => {
    const { clientId } = req.params;
    const {
        systemId,
        timestamp,
        session,
        location,
        system,
        type
    } = req.body;

    try {
        if (type === 'SESSION_END') {
            await pool.query(
                `INSERT INTO metrics (
                    client_id, system_id, timestamp, 
                    session_start, session_duration,
                    hostname, computer_name, domain,
                    memory_usage, cpu_load, metrics_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    clientId,
                    systemId,
                    new Date(session.endTime),
                    new Date(session.startTime),
                    session.totalDuration,
                    location?.hostname || 'unknown',
                    location?.computerName || 'unknown',
                    location?.domain || 'unknown',
                    system?.memory?.usagePercent || 0,
                    system?.cpu?.loadAvg?.[0] || 0,
                    req.body
                ]
            );
        } else {
            await pool.query(
                `INSERT INTO metrics (
                    client_id, system_id, timestamp, 
                    session_start, session_duration,
                    hostname, computer_name, domain,
                    memory_usage, cpu_load, metrics_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    clientId,
                    systemId,
                    new Date(timestamp),
                    new Date(session.startTime),
                    session.duration.milliseconds,
                    location.hostname,
                    location.computerName,
                    location.domain,
                    system.memory.usagePercent,
                    system.cpu.loadAvg[0],
                    req.body
                ]
            );
        }

        res.json({ status: 'received' });
    } catch (error) {
        console.error('Error storing metrics:', error);
        res.status(500).json({ error: 'Failed to store metrics' });
    }
});

// Get metrics for a client
router.get('/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const { from, to } = req.query;

    try {
        let query = 'SELECT * FROM metrics WHERE client_id = $1';
        const queryParams = [clientId];

        if (from && to) {
            query += ' AND timestamp BETWEEN $2 AND $3';
            queryParams.push(from, to);
        }

        query += ' ORDER BY timestamp DESC';

        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// Get aggregated metrics
router.get('/:clientId/summary', async (req, res) => {
    const { clientId } = req.params;
    const { period } = req.query; // 'daily', 'weekly', or 'monthly'

    try {
        let timeGroup;
        switch (period) {
            case 'weekly':
                timeGroup = "date_trunc('week', timestamp)";
                break;
            case 'monthly':
                timeGroup = "date_trunc('month', timestamp)";
                break;
            default:
                timeGroup = "date_trunc('day', timestamp)";
        }

        const result = await pool.query(`
            SELECT 
                ${timeGroup} as period,
                COUNT(*) as metric_count,
                AVG(memory_usage) as avg_memory_usage,
                AVG(cpu_load) as avg_cpu_load,
                MAX(memory_usage) as max_memory_usage,
                MAX(cpu_load) as max_cpu_load
            FROM metrics 
            WHERE client_id = $1
            GROUP BY period
            ORDER BY period DESC
        `, [clientId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching metrics summary:', error);
        res.status(500).json({ error: 'Failed to fetch metrics summary' });
    }
});

module.exports = router; 