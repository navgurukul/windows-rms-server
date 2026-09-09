const express = require('express');
const router = express.Router();
const { TIMESTAMP_TOLERANCE_SECONDS } = require('../middleware/auth');

/**
 * GET /api/auth/status
 * Public endpoint to query server auth enforcement status and requirements
 */
router.get('/status', (req, res) => {
    res.json({
        authEnabled: process.env.AUTH_ENABLED === 'true',
        method: 'HMAC-SHA256',
        requiredHeaders: [
            'X-API-Signature',
            'X-Timestamp'
        ],
        timestampToleranceSeconds: TIMESTAMP_TOLERANCE_SECONDS,
        serverTime: Math.floor(Date.now() / 1000)
    });
});

module.exports = router;
