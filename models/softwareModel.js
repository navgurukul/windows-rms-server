
const { pool } = require('../config/database');
const DeviceModel = require('./deviceModel');

const SoftwareModel = {

    getNotInstalledSoftwares: async (serial_number) => {
        const allSoftwares = await pool.query('SELECT * FROM softwares');
        const deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);

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

        return result.map(s => ({
            software_name: s.software_name,
            winget_id: s.winget_id
        }));
    },

    addHistory: async (serial_number, software_name, isSuccessful) => {
        const device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
        if (!device_id) {
            console.error('Device not found for serial number:', serial_number);
            return null;
        }
        const result = await pool.query('INSERT INTO softwares_installed (device_id, software_name, isSuccessful) VALUES ($1, $2, $3) RETURNING *', [device_id, software_name, isSuccessful]);
        return result.rows[0];
    },

    getInstallationHistory: async (serial_number) => {
        const device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
        if (!device_id) {
            console.error('Device not found for serial number:', serial_number);
            return [];
        }
        const result = await pool.query(
            'SELECT * FROM softwares_installed WHERE device_id = $1 ORDER BY created_at DESC',
            [device_id]
        );
        return result.rows;
    },
};

module.exports = SoftwareModel;