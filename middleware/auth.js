const crypto = require('crypto');

const TIMESTAMP_TOLERANCE_SECONDS = 120; // 2 minutes window to prevent replay attacks

/**
 * Middleware to verify HMAC-SHA256 API signature.
 * 
 * When AUTH_ENABLED is 'false' (or not 'true'), this middleware passes all requests
 * through unconditionally for backward compatibility with thousands of older devices.
 * 
 * When AUTH_ENABLED is 'true':
 * Expects headers:
 *   - X-API-Signature: HMAC-SHA256(API_KEY, timestamp)
 *   - X-Timestamp: Unix timestamp in seconds
 */
function verifyApiKey(req, res, next) {
    const authEnabled = process.env.AUTH_ENABLED === 'true';

    // If auth is disabled globally in .env, let all requests pass through
    if (!authEnabled) {
        return next();
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error('[AuthMiddleware] API_KEY environment variable is not configured!');
        return res.status(500).json({ error: 'Server authentication misconfigured' });
    }

    const signature = req.headers['x-api-signature'];
    const timestamp = req.headers['x-timestamp'];

    if (!signature || !timestamp) {
        return res.status(401).json({
            error: 'Access denied. Missing authentication headers.',
            required: ['X-API-Signature', 'X-Timestamp']
        });
    }

    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp, 10);

    if (isNaN(requestTime) || Math.abs(now - requestTime) > TIMESTAMP_TOLERANCE_SECONDS) {
        return res.status(401).json({
            error: 'Request expired or invalid timestamp. Clock drift exceeds 2 minutes window.',
            serverTime: now
        });
    }

    try {
        const expectedSignature = crypto
            .createHmac('sha256', apiKey)
            .update(timestamp.toString())
            .digest('hex');

        const sigBuffer = Buffer.from(signature, 'hex');
        const expBuffer = Buffer.from(expectedSignature, 'hex');

        if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
            return res.status(401).json({
                error: 'Invalid API signature.'
            });
        }

        next();
    } catch (error) {
        console.error('[AuthMiddleware] Error verifying signature:', error);
        return res.status(401).json({
            error: 'Authentication verification failed.'
        });
    }
}

module.exports = {
    verifyApiKey,
    TIMESTAMP_TOLERANCE_SECONDS
};
