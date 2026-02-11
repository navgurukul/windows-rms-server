const crypto = require('crypto');

/**
 * Generate a unique NGO key in the format XXX-YYY-ZZZ
 * Example: D3F-41T-K37
 */
function generateNGOKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = 3;
    const segmentLength = 3;

    const key = Array.from({ length: segments }, () => {
        return Array.from({ length: segmentLength }, () =>
            chars[Math.floor(Math.random() * chars.length)]
        ).join('');
    }).join('-');

    return key;
}

/**
 * Check if a key already exists in the database
 * @param {import('pg').Pool} pool - Database pool
 * @param {string} key - Key to check
 * @returns {Promise<boolean>}
 */
async function keyExists(pool, key) {
    const result = await pool.query(
        'SELECT 1 FROM "NGOs" WHERE unique_key = $1 LIMIT 1',
        [key]
    );
    return result.rows.length > 0;
}

/**
 * Generate a unique NGO key that doesn't exist in the database
 * @param {import('pg').Pool} pool - Database pool
 * @returns {Promise<string>}
 */
async function generateUniqueNGOKey(pool) {
    let key;
    let attempts = 0;
    const maxAttempts = 100;

    do {
        key = generateNGOKey();
        attempts++;

        if (attempts >= maxAttempts) {
            throw new Error('Failed to generate unique NGO key after 100 attempts');
        }
    } while (await keyExists(pool, key));

    return key;
}

module.exports = {
    generateNGOKey,
    generateUniqueNGOKey,
    keyExists
};
