const { pool } = require('../config/database');
const { generateUniqueNGOKey } = require('../utils/generateNGOKey');

const NGOModel = {
    getAll: async () => {
        const result = await pool.query('SELECT * FROM "NGOs" ORDER BY created_at DESC');
        return result.rows;
    },

    getByName: async (name) => {
        const result = await pool.query('SELECT * FROM "NGOs" WHERE LOWER("NGO_name") = LOWER($1)', [name]);
        return result.rows[0] || null;
    },

    getById: async (id) => {
        const result = await pool.query('SELECT * FROM "NGOs" WHERE id = $1', [id]);
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
    }
};

module.exports = NGOModel;
