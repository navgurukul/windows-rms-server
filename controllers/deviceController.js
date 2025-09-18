const DeviceModel = require('../models/deviceModel');

const DeviceController = {
    registerDevice: async (req, res) => {
        try {
            const { hostname, device_name } = req.body;
            
            if (!hostname || !device_name) {
                return res.status(400).json({ error: 'Hostname and device_name are required' });
            }
            
            const device = await DeviceModel.create(hostname, device_name);
            res.status(201).json(device);
        } catch (error) {
            console.error('Error registering device:', error);
            res.status(500).json({ error: 'Failed to register device' });
        }
    },
    
    getAllDevices: async (req, res) => {
        try {
            const devices = await DeviceModel.getAll();
            res.json(devices);
        } catch (error) {
            console.error('Error fetching devices:', error);
            res.status(500).json({ error: 'Failed to fetch devices' });
        }
    }
};

module.exports = DeviceController;
