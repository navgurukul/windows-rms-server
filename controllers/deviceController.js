const axios = require('axios');
const DeviceModel = require('../models/deviceModel');
const DonorModel = require('../models/donorModel');
const NgoModel = require('../models/ngoModel');

const DeviceController = {
    registerDevice: async (req, res) => {
        try {
            const { username, serial_number, mac_address, location, rms_version } = req.body;

            if (!username || !serial_number || !mac_address || !location) {
                return res.status(400).json({ error: 'Username, serial_number, mac_address, and location are required' });
            }

            // Check if device already exists to avoid unnecessary API calls and duplicates
            const existingDevice = await DeviceModel.getBySerialNumberOrMac(serial_number, mac_address);
            if (existingDevice) {
                console.log(`Device already exists (Serial: ${serial_number}, MAC: ${mac_address}). Returning existing record.`);
                return res.status(200).json(existingDevice);
            }

            // Fetch donor and ngo information from Google Apps Script API
            let donor_id = null;
            let ngo_id = null;

            try {
                const apiUrl = `https://script.google.com/macros/s/AKfycbyNAvN4kwWEkeRQFVKXtZaUI8ijRakGxWJQB-XgabrPtrZosS8XlGhZauQv4RvUsMPFpg/exec?id=${serial_number}`;
                console.log(`Fetching device details from API for serial: ${serial_number}`);
                const apiResponse = await axios.get(apiUrl, { timeout: 30000 }); // 30s timeout
                const apiData = apiResponse.data;

                if (apiData && typeof apiData === 'object' && apiData.ID) {
                    const donorName = apiData['Donor Company Name'];
                    const ngoName = apiData['Allocated To'];

                    if (donorName) {
                        let donor = await DonorModel.getByName(donorName);
                        if (!donor) {
                            console.log(`Creating new donor: ${donorName}`);
                            donor = await DonorModel.create(donorName, true);
                        }
                        donor_id = donor.id;
                    }

                    if (ngoName) {
                        let ngo = await NgoModel.getByName(ngoName);
                        if (!ngo) {
                            console.log(`Creating new NGO: ${ngoName}`);
                            ngo = await NgoModel.create(ngoName, true);
                        }
                        ngo_id = ngo.id;
                    }
                } else {
                    console.log(`No device data found in Google Script for serial: ${serial_number}`);
                }
            } catch (apiError) {
                console.error(`Error fetching device data from Google Script for ${serial_number}:`, apiError.message);
            }

            const device = await DeviceModel.create(username, serial_number, mac_address, location, rms_version, ngo_id, donor_id);
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
            const device = await DeviceModel.getBySerialNumber(serial_number);

            if (!device) {
                return res.status(404).json({ error: 'Device not found' });
            }

            return res.status(200).json(device);
        }
        catch (error) {
            console.error('Error fetching device by serial number:', error);
            return res.status(500).json({ error: 'Failed to fetch device by serial number' });
        }
    },

    statusUpdate: async (req, res) => {
        try {
            const { serial_number, isActive, rms_version } = req.body;
            const deviceId = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
            if (!deviceId) {
                return res.status(404).json({ error: 'Device not found' });
            }
            await DeviceModel.updateDeviceStatus(deviceId, isActive, rms_version);
            return res.status(200).json({ message: 'Device status updated successfully' });
        } catch (error) {
            console.error('Error updating device status:', error);
            return res.status(500).json({ error: 'Failed to update device status', message: error.message });
        }
    },
};

module.exports = DeviceController;
