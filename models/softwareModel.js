
const { pool } = require('../config/database');
const DeviceModel = require('./deviceModel');

function isVersionAtLeast(currentVersion, targetVersion) {
    if (!currentVersion) return false;
    const parse = v => String(v).split('.').map(n => parseInt(n, 10) || 0);
    const curr = parse(currentVersion);
    const target = parse(targetVersion);
    for (let i = 0; i < Math.max(curr.length, target.length); i++) {
        const c = curr[i] || 0;
        const t = target[i] || 0;
        if (c > t) return true;
        if (c < t) return false;
    }
    return true;
}


const SoftwareModel = {

    getNotInstalledSoftwares: async (identifier) => {
        let deviceDetails = null;
        let deviceId = null;

        if (typeof identifier === 'object' && identifier !== null) {
            const rawId = identifier.device_id || identifier.deviceId || identifier.id;
            const sn = identifier.serial_number || identifier.serialNumber;
            const mac = identifier.mac_address || identifier.macAddress;

            if (rawId) {
                deviceDetails = await DeviceModel.getById(rawId);
                if (deviceDetails) deviceId = deviceDetails.id;
            }
            if (!deviceDetails && sn) {
                deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(sn);
                if (deviceId) {
                    deviceDetails = await DeviceModel.getById(deviceId);
                } else {
                    const dev = await DeviceModel.fetchDeviceByIdentifiers(mac, sn);
                    if (dev) {
                        deviceId = dev.id;
                        deviceDetails = await DeviceModel.getById(deviceId);
                    }
                }
            }
            if (!deviceDetails && mac) {
                const dev = await DeviceModel.getByMacAddress(mac);
                if (dev) {
                    deviceId = dev.id;
                    deviceDetails = await DeviceModel.getById(deviceId);
                }
            }
        } else if (identifier !== undefined && identifier !== null) {
            const trimmed = String(identifier).trim();
            if (/^\d+$/.test(trimmed)) {
                deviceDetails = await DeviceModel.getById(Number(trimmed));
                if (deviceDetails) deviceId = deviceDetails.id;
            }
            if (!deviceDetails) {
                deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(trimmed);
                if (deviceId) {
                    deviceDetails = await DeviceModel.getById(deviceId);
                } else {
                    const dev = await DeviceModel.fetchDeviceByIdentifiers(null, trimmed);
                    if (dev) {
                        deviceId = dev.id;
                        deviceDetails = await DeviceModel.getById(deviceId);
                    }
                }
            }
        }

        if (!deviceId || !deviceDetails) return [];

        const isDeviceTesting = Boolean(deviceDetails.is_testing);

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
            // Check if software is active
            if (software.isactive === false) return false;

            // Never serve upgrade packages to devices that already report v1.4.1 or higher
            if (software.software_name && software.software_name.toLowerCase().includes('upgrade') && isVersionAtLeast(deviceDetails.rms_version, '1.4.1')) {
                return false;
            }

            // Devices older than 1.3.0 do not support source === 'script'
            if (software.source === 'script' && !isVersionAtLeast(deviceDetails.rms_version, '1.3.0')) {
                return false;
            }

            // Testing software check:
            // Software marked as is_testing = true can ONLY be installed on devices marked as is_testing = true.
            // If the device is NOT marked as testing, exclude all testing softwares.
            // If the device IS marked as testing, both regular softwares and testing softwares are eligible.
            if (software.is_testing && !isDeviceTesting) {
                return false;
            }

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
                winget_id: s.winget_id,
                source: s.source,
                isPortable: s.is_portable,
                is_testing: Boolean(s.is_testing),
                isTesting: Boolean(s.is_testing),
                installer_type: s.installer_type || (
                    s.source === 'rms-repository' ? (
                        ((s.software_name && (s.software_name.toLowerCase().includes('inno') || s.software_name.toLowerCase().includes('aitutor'))) ||
                         (s.winget_id && (s.winget_id.toLowerCase().includes('inno') || s.winget_id.toLowerCase().includes('aitutor'))))
                            ? 'inno'
                            : (s.winget_id && s.winget_id.toLowerCase().endsWith('.msi') ? 'msi' : 'custom_exe')
                    ) : (s.source === 'script' ? 'script' : 'winget')
                ),
                silent_args: s.silent_args || {},
                run_as: s.run_as || 'system',
                elevation: s.elevation || 'highest',
                pre_install_script: s.pre_install_script || null,
                post_install_script: s.post_install_script || null,
                custom_install_script: s.custom_install_script || null,
                process_name_to_wait: s.process_name_to_wait || null,
                timeout_seconds: s.timeout_seconds ? Number(s.timeout_seconds) : 600,
                success_exit_codes: s.success_exit_codes || '0,3010'
            }));
    },

    getAllSoftwares: async () => {
        const result = await pool.query('SELECT * FROM softwares ORDER BY id DESC');
        return result.rows;
    },

    getById: async (id) => {
        const result = await pool.query('SELECT * FROM softwares WHERE id = $1', [id]);
        return result.rows[0] || null;
    },

    getByName: async (software_name) => {
        const result = await pool.query('SELECT * FROM softwares WHERE LOWER(software_name) = LOWER($1)', [software_name]);
        return result.rows[0] || null;
    },

    create: async (data) => {
        const query = `
            INSERT INTO softwares (
                software_name,
                winget_id,
                source,
                is_global,
                installer_type,
                silent_args,
                run_as,
                elevation,
                pre_install_script,
                post_install_script,
                custom_install_script,
                process_name_to_wait,
                timeout_seconds,
                success_exit_codes,
                is_portable,
                isactive,
                is_testing
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING *
        `;

        const values = [
            data.softwareName,
            data.wingetId,
            data.source || 'winget',
            data.isGlobal !== undefined ? data.isGlobal : true,
            data.installerType || 'winget',
            data.silentArgs ? (typeof data.silentArgs === 'object' ? JSON.stringify(data.silentArgs) : data.silentArgs) : '{}',
            data.runAs || 'system',
            data.elevation || 'highest',
            data.preInstallScript || null,
            data.postInstallScript || null,
            data.customInstallScript || null,
            data.processNameToWait || null,
            data.timeoutSeconds || 600,
            data.successExitCodes || '0,3010',
            data.isPortable !== undefined ? data.isPortable : false,
            data.isActive !== undefined ? data.isActive : true,
            data.isTesting !== undefined ? Boolean(data.isTesting) : (data.is_testing !== undefined ? Boolean(data.is_testing) : false)
        ];

        const result = await pool.query(query, values);
        return result.rows[0];
    },

    update: async (id, data) => {
        const fieldToColumn = {
            softwareName: 'software_name',
            wingetId: 'winget_id',
            source: 'source',
            isGlobal: 'is_global',
            installerType: 'installer_type',
            silentArgs: 'silent_args',
            runAs: 'run_as',
            elevation: 'elevation',
            preInstallScript: 'pre_install_script',
            postInstallScript: 'post_install_script',
            customInstallScript: 'custom_install_script',
            processNameToWait: 'process_name_to_wait',
            timeoutSeconds: 'timeout_seconds',
            successExitCodes: 'success_exit_codes',
            isPortable: 'is_portable',
            isActive: 'isactive',
            isTesting: 'is_testing',
            is_testing: 'is_testing'
        };

        const updates = [];
        const values = [];
        let index = 1;

        for (const [field, column] of Object.entries(fieldToColumn)) {
            if (data[field] !== undefined) {
                updates.push(`${column} = $${index++}`);
                const val = (field === 'silentArgs' && typeof data[field] === 'object' && data[field] !== null)
                    ? JSON.stringify(data[field])
                    : data[field];
                values.push(val);
            }
        }

        if (updates.length === 0) return null;

        values.push(id);
        const query = `UPDATE softwares SET ${updates.join(', ')} WHERE id = $${index} RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    },

    delete: async (id) => {
        const result = await pool.query('DELETE FROM softwares WHERE id = $1 RETURNING *', [id]);
        return result.rows[0] || null;
    },

    getAssignments: async () => {
        try {
            const donorQuery = await pool.query(
                `SELECT ds.software_id, d.id as entity_id, d."donor_name" as entity_name
                 FROM donor_softwares ds
                 JOIN donors d ON ds.donor_id = d.id`
            );
            
            const ngoQuery = await pool.query(
                `SELECT ns.software_id, n.id as entity_id, n."NGO_name" as entity_name
                 FROM ngo_softwares ns
                 JOIN "NGOs" n ON ns.ngo_id = n.id`
            );

            const assignments = {};
            
            // Format donors
            donorQuery.rows.forEach(row => {
                if (!assignments[row.software_id]) {
                    assignments[row.software_id] = { donors: [], ngos: [] };
                }
                assignments[row.software_id].donors.push({ id: row.entity_id, name: row.entity_name });
            });

            // Format NGOs
            ngoQuery.rows.forEach(row => {
                if (!assignments[row.software_id]) {
                    assignments[row.software_id] = { donors: [], ngos: [] };
                }
                assignments[row.software_id].ngos.push({ id: row.entity_id, name: row.entity_name });
            });

            return assignments;
        } catch (error) {
            console.error('Error getting software assignments:', error);
            throw error;
        }
    },

    addHistory: async (serial_number, software_name, isSuccessful) => {
        let device_id = null;
        if (typeof serial_number === 'number' || (/^\d+$/.test(String(serial_number).trim()) && !isNaN(Number(serial_number)))) {
            const dev = await DeviceModel.getById(Number(serial_number));
            if (dev) device_id = dev.id;
        }
        if (!device_id) {
            device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(String(serial_number).trim());
        }
        if (!device_id) {
            console.error('Device not found for identifier:', serial_number);
            return null;
        }
        const result = await pool.query('INSERT INTO softwares_installed (device_id, software_name, isSuccessful) VALUES ($1, $2, $3) RETURNING *', [device_id, software_name, isSuccessful]);
        return result.rows[0];
    },

    getInstallationHistory: async (serial_number) => {
        let device_id = null;
        if (typeof serial_number === 'number' || (/^\d+$/.test(String(serial_number).trim()) && !isNaN(Number(serial_number)))) {
            const dev = await DeviceModel.getById(Number(serial_number));
            if (dev) device_id = dev.id;
        }
        if (!device_id) {
            device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(String(serial_number).trim());
        }
        if (!device_id) {
            console.error('Device not found for identifier:', serial_number);
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