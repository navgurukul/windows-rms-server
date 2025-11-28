const { pool } = require('../config/database');

const WallpaperModel = {
    // Get the currently active wallpaper
    getActiveWallpaper: async () => {
        try {
            const result = await pool.query(
                'SELECT * FROM wallpapers WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting active wallpaper:', error);
            throw error;
        }
    },

    // Set a wallpaper as active (deactivates all others)
    setActiveWallpaper: async (wallpaperUrl) => {
        try {
            // Start transaction
            await pool.query('BEGIN');

            // Deactivate all wallpapers
            await pool.query('UPDATE wallpapers SET is_active = false');

            // Check if this URL already exists
            const existing = await pool.query(
                'SELECT * FROM wallpapers WHERE wallpaper_url = $1',
                [wallpaperUrl]
            );

            if (existing.rows.length > 0) {
                // Update existing wallpaper to active
                const result = await pool.query(
                    'UPDATE wallpapers SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE wallpaper_url = $1 RETURNING *',
                    [wallpaperUrl]
                );
                await pool.query('COMMIT');
                return result.rows[0];
            } else {
                // Insert new wallpaper as active
                const result = await pool.query(
                    'INSERT INTO wallpapers (wallpaper_url, is_active) VALUES ($1, $2) RETURNING *',
                    [wallpaperUrl, true]
                );
                await pool.query('COMMIT');
                return result.rows[0];
            }
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Error setting active wallpaper:', error);
            throw error;
        }
    },

    // Create a new wallpaper entry (not active by default)
    createWallpaper: async (wallpaperUrl) => {
        try {
            const result = await pool.query(
                'INSERT INTO wallpapers (wallpaper_url, is_active) VALUES ($1, $2) RETURNING *',
                [wallpaperUrl, false]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating wallpaper:', error);
            throw error;
        }
    },

    // Get all wallpapers
    getAllWallpapers: async () => {
        try {
            const result = await pool.query(
                'SELECT * FROM wallpapers ORDER BY updated_at DESC'
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting all wallpapers:', error);
            throw error;
        }
    },

    // Get wallpaper by ID
    getWallpaperById: async (id) => {
        try {
            const result = await pool.query(
                'SELECT * FROM wallpapers WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error getting wallpaper by ID:', error);
            throw error;
        }
    }
};

module.exports = WallpaperModel;