const DeviceModel = require('../models/deviceModel');

const DeviceController = {
    registerDevice: async (req, res) => {
        try {
            const { username, serial_number, mac_address, location } = req.body;

            if (!username || !serial_number || !mac_address || !location) {
                return res.status(400).json({ error: 'Username, serial_number, mac_address, and location are required' });
            }

            const device = await DeviceModel.create(username, serial_number, mac_address, location);
            return res.status(201).json(device);
        } catch (error) {
            console.error('Error registering device:', error);
            return res.status(500).json({ error: 'Failed to register device' });
        }
    },

    getAllDevices: async (req, res) => {
        try {
            const devices = await DeviceModel.getAll();
            return res.json(devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
            return res.status(500).json({ error: 'Failed to fetch devices' });
        }
    },

    getDeviceBySerialNumber: async (req, res) => {
        try {
            const { serial_number } = req.params;
            const device = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
            return res.status(200).json(device);
        }
        catch (error) {
            console.error('Error fetching device by serial number:', error);
            return res.status(500).json({ error: 'Failed to fetch device by serial number' });
        }
    },

    statusUpdate: async (req, res) => {
        try {
            const { serial_number, isActive } = req.body;
            const deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
            if (!deviceId) {
                return res.status(404).json({ error: 'Device not found' });
            }
            await DeviceModel.updateDeviceStatus(deviceId, isActive);
            return res.status(200).json({ message: 'Device status updated successfully' });
        } catch (error) {
            console.error('Error updating device status:', error);
            return res.status(500).json({ error: 'Failed to update device status', message: error.message });
        }
    },
};

module.exports = DeviceController;
