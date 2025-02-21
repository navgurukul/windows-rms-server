// server/middleware/validation.js
const { body, param, validationResult } = require('express-validator');

const validateMetrics = [
    param('clientId').notEmpty().withMessage('Client ID is required'),
    body('systemId').notEmpty().withMessage('System ID is required'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
    body('session.startTime').isISO8601().withMessage('Valid session start time is required'),
    handleValidationErrors
];

function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }   
    next();
}

// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100
});

// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal server error',
            status: err.status || 500
        }
    });
};

module.exports = {
    validateMetrics,
    rateLimiter,
    errorHandler
};