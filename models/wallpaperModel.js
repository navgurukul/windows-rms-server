const { pool } = require('../config/database');

const WallpaperModel = {
    // Get the currently active wallpaper
    getActiveWallpaper: async (device_id) => {
        try {
            // Fall back to global active wallpaper
            const globalWallpaper = await pool.query(
                'SELECT id, wallpaper_url, is_active, created_at, updated_at FROM wallpapers WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
            );

            if (device_id === null) {
                return globalWallpaper.rows[0] || null;
            }

            // 1. Device Specific
            const deviceWallpaper = await pool.query(
                `SELECT 
                    dw.id, dw.device_id, dw.wallpaper_id, w.wallpaper_url, w.is_active, dw.created_at, dw.updated_at
                FROM device_wallpapers dw
                LEFT JOIN wallpapers w ON dw.wallpaper_id = w.id
                WHERE dw.device_id = $1
                ORDER BY dw.updated_at DESC LIMIT 1`,
                [device_id]
            );
            if (deviceWallpaper.rows.length > 0) return deviceWallpaper.rows[0];

            // Get Device Details (NGO/Donor)
            const deviceDetails = await pool.query('SELECT ngo_id, donor_id FROM devices WHERE id = $1', [device_id]);
            if (deviceDetails.rows.length === 0) return globalWallpaper.rows[0];
            const { ngo_id, donor_id } = deviceDetails.rows[0];

            // 2. Donor Specific
            const donorWallpaper = await pool.query(
                `SELECT 
                    dw.id, dw.donor_id, dw.wallpaper_id, w.wallpaper_url, w.is_active, dw.created_at
                FROM donor_wallpapers dw
                LEFT JOIN wallpapers w ON dw.wallpaper_id = w.id
                WHERE dw.donor_id = $1
                ORDER BY dw.created_at DESC LIMIT 1`,
                [donor_id]
            );

            if (donorWallpaper.rows.length > 0) return donorWallpaper.rows[0];

            // 3. NGO Specific
            const ngoWallpaper = await pool.query(
                `SELECT 
                    nw.id, nw.ngo_id, nw.wallpaper_id, w.wallpaper_url, w.is_active, nw.created_at
                FROM ngo_wallpapers nw
                LEFT JOIN wallpapers w ON nw.wallpaper_id = w.id
                WHERE nw.ngo_id = $1
                ORDER BY nw.created_at DESC LIMIT 1`,
                [ngo_id]
            );
            if (ngoWallpaper.rows.length > 0) return ngoWallpaper.rows[0];


            // 4. Global
            return globalWallpaper.rows[0] || null;
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
    },

    // Upsert device wallpaper mapping (update if exists, insert if not)
    upsertDeviceWallpaper: async (device_id, wallpaper_id) => {
        try {
            // Check if mapping already exists for this device
            const existing = await pool.query(
                'SELECT * FROM device_wallpapers WHERE device_id = $1',
                [device_id]
            );

            if (existing.rows.length > 0) {
                // Update existing mapping
                const result = await pool.query(
                    'UPDATE device_wallpapers SET wallpaper_id = $1, updated_at = CURRENT_TIMESTAMP WHERE device_id = $2 RETURNING *',
                    [wallpaper_id, device_id]
                );
                return result.rows[0];
            } else {
                // Insert new mapping
                const result = await pool.query(
                    'INSERT INTO device_wallpapers (device_id, wallpaper_id) VALUES ($1, $2) RETURNING *',
                    [device_id, wallpaper_id]
                );
                return result.rows[0];
            }
        } catch (error) {
            console.error('Error upserting device wallpaper:', error);
            throw error;
        }
    },

    getAssignments: async () => {
        try {
            const donorQuery = await pool.query(
                `SELECT dw.wallpaper_id, d.id as entity_id, d."donor_name" as entity_name
                 FROM donor_wallpapers dw
                 JOIN donors d ON dw.donor_id = d.id`
            );
            
            const ngoQuery = await pool.query(
                `SELECT nw.wallpaper_id, n.id as entity_id, n."NGO_name" as entity_name
                 FROM ngo_wallpapers nw
                 JOIN "NGOs" n ON nw.ngo_id = n.id`
            );

            const assignments = {};
            
            // Format donors
            donorQuery.rows.forEach(row => {
                if (!assignments[row.wallpaper_id]) {
                    assignments[row.wallpaper_id] = { donors: [], ngos: [] };
                }
                assignments[row.wallpaper_id].donors.push({ id: row.entity_id, name: row.entity_name });
            });

            // Format NGOs
            ngoQuery.rows.forEach(row => {
                if (!assignments[row.wallpaper_id]) {
                    assignments[row.wallpaper_id] = { donors: [], ngos: [] };
                }
                assignments[row.wallpaper_id].ngos.push({ id: row.entity_id, name: row.entity_name });
            });

            return assignments;
        } catch (error) {
            console.error('Error getting assignments:', error);
            throw error;
        }
    },

    setActiveWallpaperById: async (id) => {
        try {
            await pool.query('BEGIN');
            await pool.query('UPDATE wallpapers SET is_active = false');
            const result = await pool.query(
                'UPDATE wallpapers SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
                [id]
            );
            await pool.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await pool.query('ROLLBACK');
            console.error('Error setting active wallpaper by id:', error);
            throw error;
        }
    },

    assignToDonor: async (donor_id, wallpaper_id) => {
        try {
            await pool.query('DELETE FROM donor_wallpapers WHERE donor_id = $1', [donor_id]);
            const result = await pool.query(
                'INSERT INTO donor_wallpapers (donor_id, wallpaper_id) VALUES ($1, $2) RETURNING *',
                [donor_id, wallpaper_id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error assigning wallpaper to donor:', error);
            throw error;
        }
    },

    assignToNGO: async (ngo_id, wallpaper_id) => {
        try {
            await pool.query('DELETE FROM ngo_wallpapers WHERE ngo_id = $1', [ngo_id]);
            const result = await pool.query(
                'INSERT INTO ngo_wallpapers (ngo_id, wallpaper_id) VALUES ($1, $2) RETURNING *',
                [ngo_id, wallpaper_id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error assigning wallpaper to NGO:', error);
            throw error;
        }
    },

    unassignFromDonor: async (donor_id) => {
        try {
            await pool.query('DELETE FROM donor_wallpapers WHERE donor_id = $1', [donor_id]);
            return true;
        } catch (error) {
            console.error('Error unassigning wallpaper from donor:', error);
            throw error;
        }
    },

    unassignFromNGO: async (ngo_id) => {
        try {
            await pool.query('DELETE FROM ngo_wallpapers WHERE ngo_id = $1', [ngo_id]);
            return true;
        } catch (error) {
            console.error('Error unassigning wallpaper from NGO:', error);
            throw error;
        }
    },

    deleteWallpaperById: async (id) => {
        try {
            const result = await pool.query('DELETE FROM wallpapers WHERE id = $1 RETURNING *', [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Error deleting wallpaper:', error);
            throw error;
        }
    }
};

module.exports = WallpaperModel;