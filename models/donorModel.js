const { pool } = require('../config/database');

const DonorModel = {
    getAll: async () => {
        const result = await pool.query('SELECT * FROM donors ORDER BY created_at DESC');
        return result.rows;
    },

    getById: async (id) => {
        const result = await pool.query('SELECT * FROM donors WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    create: async (donorName, isActive = false) => {
        const result = await pool.query(
            'INSERT INTO donors (donor_name, is_active) VALUES ($1, $2) RETURNING *',
            [donorName, isActive]
        );
        return result.rows[0];
    },

    update: async (id, donorName, isActive) => {
        const updates = [];
        const params = [];
        let index = 1;

        if (donorName !== undefined) {
            updates.push(`donor_name = $${index++}`);
            params.push(donorName);
        }

        if (isActive !== undefined) {
            updates.push(`is_active = $${index++}`);
            params.push(isActive);
        }

        if (updates.length === 0) return null;

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        params.push(id);
        const query = `UPDATE donors SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;

        const result = await pool.query(query, params);
        return result.rows[0];
    },

    delete: async (id) => {
        const result = await pool.query('DELETE FROM donors WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
};

module.exports = DonorModel;
