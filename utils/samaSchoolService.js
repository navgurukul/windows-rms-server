/**
 * SAMA School Registry Service
 * 
 * Provides cached lookups against the SAMA school registry API.
 * When a session is synced, the UDISE code from the payload is used to fetch
 * the authoritative school metadata (name, state, district, city, zip, district_code)
 * from https://sama-api.thesama.in/api/schools/udise-map/{udiseCode}.
 * 
 * This prevents ops-team data entry errors from polluting the backend.
 * 
 * Cache Strategy:
 *  - In-memory Map with per-entry TTL (default 1 hour).
 *  - Bulk warm-up available via warmUpCache() which loads the entire udise-map.
 *  - Single lookups are cached on first fetch.
 *  - Failures (network, timeout, 404) return null gracefully; sync proceeds with client values.
 */

const SAMA_API_BASE_URL = process.env.SAMA_API_BASE_URL || 'https://sama-api.thesama.in/api';
const CACHE_TTL_MS = parseInt(process.env.SAMA_SCHOOL_CACHE_TTL_MS, 10) || 3600000; // 1 hour default
const REQUEST_TIMEOUT_MS = 5000; // 5 second timeout for individual lookups

// In-memory cache: Map<udiseCode, { data: SchoolRecord, expiresAt: number }>
const schoolCache = new Map();

/**
 * Fetch a single school by UDISE code from the SAMA API.
 * Returns the school data object or null if not found / error.
 * 
 * @param {string} udiseCode - The UDISE code to look up
 * @returns {Promise<Object|null>} Resolved school record or null
 */
async function resolveSchool(udiseCode) {
    if (!udiseCode || !String(udiseCode).trim()) {
        return null;
    }

    const code = String(udiseCode).trim();

    // Check cache first
    const cached = schoolCache.get(code);
    if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
    }

    // Fetch from SAMA API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(`${SAMA_API_BASE_URL}/schools/udise-map/${code}`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.warn(`[SamaSchoolService] HTTP ${response.status} for UDISE ${code}`);
            // Cache negative result for a shorter TTL (5 minutes) to avoid hammering
            schoolCache.set(code, { data: null, expiresAt: Date.now() + 300000 });
            return null;
        }

        const json = await response.json();

        if (json.status === 'error' || !json.data) {
            console.warn(`[SamaSchoolService] UDISE ${code} not found in SAMA registry`);
            schoolCache.set(code, { data: null, expiresAt: Date.now() + 300000 });
            return null;
        }

        const schoolData = json.data;
        schoolCache.set(code, { data: schoolData, expiresAt: Date.now() + CACHE_TTL_MS });
        console.log(`[SamaSchoolService] Resolved UDISE ${code} -> "${schoolData.name}" (${schoolData.district}, ${schoolData.state})`);
        return schoolData;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn(`[SamaSchoolService] Timeout fetching UDISE ${code} (>${REQUEST_TIMEOUT_MS}ms)`);
        } else {
            console.warn(`[SamaSchoolService] Error fetching UDISE ${code}:`, error.message);
        }
        return null;
    }
}

/**
 * Warm up the in-memory cache by fetching the entire UDISE map in one call.
 * This is useful on server startup or periodic refresh.
 * 
 * @returns {Promise<number>} Number of schools loaded into cache
 */
async function warmUpCache() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for bulk

        const response = await fetch(`${SAMA_API_BASE_URL}/schools/udise-map`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[SamaSchoolService] Warm-up failed: HTTP ${response.status}`);
            return 0;
        }

        const json = await response.json();

        if (json.status !== 'success' || !json.data) {
            console.error('[SamaSchoolService] Warm-up: unexpected response format');
            return 0;
        }

        const expiresAt = Date.now() + CACHE_TTL_MS;
        let count = 0;

        for (const [udise, schoolData] of Object.entries(json.data)) {
            schoolCache.set(udise, { data: schoolData, expiresAt });
            count++;
        }

        console.log(`[SamaSchoolService] Cache warmed with ${count} schools (TTL: ${CACHE_TTL_MS / 1000}s)`);
        return count;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('[SamaSchoolService] Warm-up timed out');
        } else {
            console.error('[SamaSchoolService] Warm-up error:', error.message);
        }
        return 0;
    }
}

/**
 * Get the full UDISE map from cache or fetch fresh.
 * Returns the entire map object { udiseCode: schoolData, ... } or empty object on failure.
 * 
 * @returns {Promise<Object>} Map of UDISE code to school records
 */
async function getFullMap() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${SAMA_API_BASE_URL}/schools/udise-map`, {
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error(`[SamaSchoolService] getFullMap failed: HTTP ${response.status}`);
            return {};
        }

        const json = await response.json();

        if (json.status !== 'success' || !json.data) {
            return {};
        }

        // Refresh cache while we're at it
        const expiresAt = Date.now() + CACHE_TTL_MS;
        for (const [udise, schoolData] of Object.entries(json.data)) {
            schoolCache.set(udise, { data: schoolData, expiresAt });
        }

        return json.data;
    } catch (error) {
        console.error('[SamaSchoolService] getFullMap error:', error.message);
        return {};
    }
}

/**
 * Apply authoritative school data from SAMA to a session/device record.
 * Returns patched fields object, or empty object if UDISE not resolved.
 * 
 * This does NOT overwrite partner_name (that's enforced separately as 'Sama Digital Foundation').
 * 
 * @param {string} udiseCode - The UDISE code to look up
 * @returns {Promise<Object>} Patched fields { schoolName, state, city, district, districtCode, zipcodePostalCode } or {}
 */
async function resolveSchoolFields(udiseCode) {
    const school = await resolveSchool(udiseCode);
    if (!school) return {};

    return {
        schoolName: school.name || null,
        state: school.state || null,
        city: school.city || null,
        district: school.district || null,
        districtCode: school.district_code || null,
        zipcodePostalCode: school.zipcode || null,
        distributionChannelHostId: school.distribution_host_id || null,
    };
}

/**
 * Get cache statistics for debugging/monitoring.
 * @returns {{ totalEntries: number, validEntries: number, expiredEntries: number }}
 */
function getCacheStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    for (const entry of schoolCache.values()) {
        if (now < entry.expiresAt) valid++;
        else expired++;
    }
    return { totalEntries: schoolCache.size, validEntries: valid, expiredEntries: expired };
}

/**
 * Clear the entire cache.
 */
function clearCache() {
    schoolCache.clear();
    console.log('[SamaSchoolService] Cache cleared');
}

module.exports = {
    resolveSchool,
    resolveSchoolFields,
    warmUpCache,
    getFullMap,
    getCacheStats,
    clearCache,
};
