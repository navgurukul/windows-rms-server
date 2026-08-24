
const { pool } = require('../config/database');


const fetchDeviceByIdentifiers = async (mac_address, serial_number) => {
    // Priority 1: Match by normalized MAC address (Primary source of truth)
    if (mac_address && mac_address !== 'Unknown' && mac_address !== 'UNKNOWN-MAC') {
        const normalizedMac = mac_address.replace(/[:-]/g, '').toLowerCase();
        const macRes = await pool.query(
            `SELECT d.id, d.ngo_id, n."NGO_name" as ngo_name, d.serial_number, d.mac_address
             FROM devices d
             LEFT JOIN "NGOs" n ON d.ngo_id = n.id
             WHERE LOWER(REPLACE(REPLACE(d.mac_address, ':', ''), '-', '')) = $1
             LIMIT 1`,
            [normalizedMac]
        );
        if (macRes.rows.length > 0) {
            return macRes.rows[0];
        }
    }

    // Priority 2: Match by case-insensitive trimmed serial number (Fallback)
    if (serial_number && serial_number !== 'Unknown' && serial_number !== 'UNKNOWN-SERIAL') {
        const serialRes = await pool.query(
            `SELECT d.id, d.ngo_id, n."NGO_name" as ngo_name, d.serial_number, d.mac_address
             FROM devices d
             LEFT JOIN "NGOs" n ON d.ngo_id = n.id
             WHERE UPPER(TRIM(d.serial_number)) = UPPER(TRIM($1))
             LIMIT 1`,
            [serial_number]
        );
        if (serialRes.rows.length > 0) {
            return serialRes.rows[0];
        }
    }

    return null;
};

const fetchDeviceIdFromSerialNumber = async (serial_number) => {
    const fetchDeviceId = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
    return fetchDeviceId?.rows[0]?.id || null;
};

const DeviceModel = {
    create: async (username, serial_number, mac_address, location, rms_version = '0.0.0', ngo_id = null, donor_id = null) => {
        // Check if device already exists by serial_number or mac_address
        const deviceExists = await pool.query(
            'SELECT * FROM devices WHERE serial_number = $1 OR mac_address = $2',
            [serial_number, mac_address]
        );

        if (deviceExists.rows.length > 0) {
            // Return existing device without making any changes
            return deviceExists.rows[0];
        }
        const result = await pool.query(
            'INSERT INTO devices (username, serial_number, mac_address, location, rms_version, ngo_id, donor_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [username, serial_number, mac_address, location, rms_version, ngo_id, donor_id]
        );
        return result.rows[0];
    },

    getById: async (id) => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            WHERE d.id = $1
            GROUP BY d.id, n."NGO_name", don.donor_name
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0];
    },

    getAll: async () => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            GROUP BY d.id, n."NGO_name", don.donor_name
            ORDER BY d.id
        `;
        const result = await pool.query(query);
        return result.rows;
    },

    getAllPaginated: async (page = 1, limit = 10, filters = {}) => {
        const offset = (page - 1) * limit;
        
        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        if (filters.search) {
            whereClause += ` WHERE (d.username ILIKE $${paramIndex} OR d.serial_number ILIKE $${paramIndex} OR d.mac_address ILIKE $${paramIndex} OR d.location ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }

        if (filters.ngoName) {
            whereClause += (whereClause ? ' AND ' : ' WHERE ') + `n."NGO_name" ILIKE $${paramIndex}`;
            params.push(`%${filters.ngoName}%`);
            paramIndex++;
        }

        if (filters.donorName) {
            whereClause += (whereClause ? ' AND ' : ' WHERE ') + `don.donor_name ILIKE $${paramIndex}`;
            params.push(`%${filters.donorName}%`);
            paramIndex++;
        }

        params.push(limit);
        const limitIndex = paramIndex++;
        params.push(offset);
        const offsetIndex = paramIndex++;

        const query = `
            SELECT 
                COUNT(*) OVER() as full_count,
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            ${whereClause}
            GROUP BY d.id, n."NGO_name", don.donor_name
            ORDER BY d.created_at DESC NULLS LAST, d.id DESC
            LIMIT $${limitIndex} OFFSET $${offsetIndex}
        `;
        const result = await pool.query(query, params);
        
        const total = result.rows.length > 0 ? parseInt(result.rows[0].full_count, 10) : 0;
        
        const data = result.rows.map(row => {
            const { full_count, ...rest } = row;
            return rest;
        });

        return { data, total, page, limit };
    },

    updateDeviceStatus: async (deviceId, isActive, rms_version) => {
        let query = 'UPDATE devices SET isActive = $1';
        const params = [isActive, deviceId];

        if (rms_version) {
            query += ', rms_version = $3';
            params.push(rms_version);
        }

        query += ' WHERE id = $2';

        const result = await pool.query(query, params);
        return result.rows[0];
    },

    getBySerialNumber: async (serial_number) => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            WHERE d.serial_number = $1
            GROUP BY d.id, n."NGO_name", don.donor_name
        `;
        const result = await pool.query(query, [serial_number]);
        return result.rows[0] || null;
    },

    getBySerialNumberOrMac: async (serial_number, mac_address) => {
        const query = 'SELECT * FROM devices WHERE serial_number = $1 OR mac_address = $2';
        const result = await pool.query(query, [serial_number, mac_address]);
        return result.rows[0] || null;
    },
    getByMacAddress: async (mac_address) => {
        const query = `
            SELECT 
                d.*,
                n."NGO_name" as ngo_name,
                don.donor_name,
                COALESCE(SUM(lt.total_active_time), 0) as total_usage_minutes
            FROM devices d
            LEFT JOIN "NGOs" n ON d.ngo_id = n.id
            LEFT JOIN donors don ON d.donor_id = don.id
            LEFT JOIN laptop_tracking lt ON d.id = lt.device_id
            WHERE d.mac_address = $1
            GROUP BY d.id, n."NGO_name", don.donor_name
        `;
        const result = await pool.query(query, [mac_address]);
        return result.rows[0] || null;
    },
    updateDeviceDetails: async (id, fields) => {
        const setClause = [];
        const values = [];
        let index = 1;
        
        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                setClause.push(`${key} = $${index}`);
                values.push(value);
                index++;
            }
        }
        
        if (setClause.length > 0) {
            values.push(id);
            const query = `UPDATE devices SET ${setClause.join(', ')} WHERE id = $${index}`;
            await pool.query(query, values);
        }
        
        return await DeviceModel.getById(id);
    },
    fetchDeviceIdFromSerialNumber,
    fetchDeviceByIdentifiers
};

module.exports = DeviceModel;