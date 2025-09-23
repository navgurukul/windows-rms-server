
const { pool } = require('../config/database');

const fetchDeviceIdFromSerialNumber = async (serial_number) => {
    const fetchDeviceId = await pool.query('SELECT * FROM devices WHERE serial_number = $1', [serial_number]);
    return fetchDeviceId.rows[0].id;
};

const SoftwareModel = {

    getNotInstalledSoftwares: async (serial_number) => {
        const allSoftwares = await pool.query('SELECT * FROM softwares');
        const deviceId = await fetchDeviceIdFromSerialNumber(serial_number);

        const installedSoftwares = await pool.query(
            'SELECT * FROM softwares_installed WHERE device_id = $1',
            [deviceId]
        );

        const result = allSoftwares.rows.filter(software => {
            // Find all installation attempts for this software
            const attempts = installedSoftwares.rows.filter(
                s => s.software_name === software.software_name
            );

            if (attempts.length === 0) {
                // No attempt made → should be installed
                return true;
            }

            // If any attempt was successful → exclude
            if (attempts.some(a => a.issuccessful === true)) {
                return false;
            }

            // Attempts exist but none successful → should be installed
            return true;
        });

        return result.map(s => s.software_name);
    },

    addHistory: async (serial_number, software_name, isSuccessful) => {
        const device_id = await fetchDeviceIdFromSerialNumber(serial_number);
        const result = await pool.query('INSERT INTO softwares_installed (device_id, software_name, isSuccessful) VALUES ($1, $2, $3) RETURNING *', [device_id, software_name, isSuccessful]);
        return result.rows[0];
    },
};

module.exports = SoftwareModel;