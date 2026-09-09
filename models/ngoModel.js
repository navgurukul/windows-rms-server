const { pool } = require('../config/database');
const { generateUniqueNGOKey } = require('../utils/generateNGOKey');

const NGOModel = {
    getAll: async () => {
        const query = `
            SELECT 
                n.*,
                COUNT(dev.id)::int as laptop_count
            FROM "NGOs" n
            LEFT JOIN devices dev ON dev.ngo_id = n.id
            GROUP BY n.id
            ORDER BY n.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    getByName: async (name) => {
        const result = await pool.query('SELECT * FROM "NGOs" WHERE LOWER("NGO_name") = LOWER($1)', [name]);
        return result.rows[0] || null;
    },

    getById: async (id) => {
        const query = `
            SELECT 
                n.*,
                COUNT(dev.id)::int as laptop_count
            FROM "NGOs" n
            LEFT JOIN devices dev ON dev.ngo_id = n.id
            WHERE n.id = $1
            GROUP BY n.id
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    create: async (NGOName, isActive = false) => {
        // Auto-generate unique key
        const uniqueKey = await generateUniqueNGOKey(pool);

        const result = await pool.query(
            'INSERT INTO "NGOs" ("NGO_name", unique_key, is_active) VALUES ($1, $2, $3) RETURNING *',
            [NGOName, uniqueKey, isActive]
        );
        return result.rows[0];
    },

    update: async (id, NGOName, isActive) => {
        // Build query dynamically based on provided fields
        const updates = [];
        const params = [];
        let index = 1;

        if (NGOName !== undefined) {
            updates.push(`"NGO_name" = $${index++}`);
            params.push(NGOName);
        }

        if (isActive !== undefined) {
            updates.push(`is_active = $${index++}`);
            params.push(isActive);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        params.push(id);
        const query = `UPDATE "NGOs" SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;

        const result = await pool.query(query, params);
        return result.rows[0];
    },

    delete: async (id) => {
        const result = await pool.query('DELETE FROM "NGOs" WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    },

    reconcileWithSama: async (NGOName, samaKey) => {
        if (!NGOName || !NGOName.trim()) return null;
        const cleanName = NGOName.trim();
        // Check it all small cases, remove all spaces and "."s and then check the name
        const normalizedTarget = cleanName.toLowerCase().replace(/[\s.]+/g, '');

        const allNgos = await pool.query('SELECT * FROM "NGOs"');
        const existing = allNgos.rows.find(n => {
            const norm = (n.NGO_name || '').toLowerCase().replace(/[\s.]+/g, '');
            return norm === normalizedTarget;
        });

        if (existing) {
            const currentKey = (existing.unique_key || '').trim().toLowerCase();
            // If present and the unique key is not starting with sama (or sam) as in the API, update it
            if (samaKey && !currentKey.startsWith('sam')) {
                const updateResult = await pool.query(
                    'UPDATE "NGOs" SET unique_key = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                    [samaKey.trim(), existing.id]
                );
                return updateResult.rows[0];
            }
            return existing;
        } else {
            // If not present, add it
            const keyToUse = (samaKey && samaKey.trim()) ? samaKey.trim() : await generateUniqueNGOKey(pool);
            const insertResult = await pool.query(
                'INSERT INTO "NGOs" ("NGO_name", unique_key, is_active) VALUES ($1, $2, $3) RETURNING *',
                [cleanName, keyToUse, true]
            );
            return insertResult.rows[0];
        }
    }
};

module.exports = NGOModel;
