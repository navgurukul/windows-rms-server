
const { pool } = require('../config/database');
const DeviceModel = require('./deviceModel');

const SoftwareModel = {

    getNotInstalledSoftwares: async (serial_number) => {
        const deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
        if (!deviceId) return [];

        const deviceDetails = await DeviceModel.getById(deviceId);
        if (!deviceDetails) return [];

        // Fetch all softwares
        const allSoftwaresQuery = await pool.query('SELECT * FROM softwares');
        const allSoftwares = allSoftwaresQuery.rows;

        // Fetch Donor specific softwares
        const donorSoftwaresQuery = await pool.query(
            'SELECT software_id FROM donor_softwares WHERE donor_id = $1',
            [deviceDetails.donor_id]
        );
        const donorSoftwareIds = new Set(donorSoftwaresQuery.rows.map(row => row.software_id));

        // Fetch NGO specific softwares
        const ngoSoftwaresQuery = await pool.query(
            'SELECT software_id FROM ngo_softwares WHERE ngo_id = $1',
            [deviceDetails.ngo_id]
        );
        const ngoSoftwareIds = new Set(ngoSoftwaresQuery.rows.map(row => row.software_id));

        const installedSoftwares = await pool.query(
            'SELECT * FROM softwares_installed WHERE device_id = $1',
            [deviceId]
        );

        const result = allSoftwares.filter(software => {
            // Check if software is applicable
            const isApplicable = software.is_global || donorSoftwareIds.has(software.id) || ngoSoftwareIds.has(software.id);
            if (!isApplicable) return false;

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

        return result
            .sort((a, b) => {
                // Google.Chrome should appear at index 0
                if (a.winget_id === 'Google.Chrome') return -1;
                if (b.winget_id === 'Google.Chrome') return 1;
                return 0;
            })
            .map(s => ({
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