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

            // Helper to classify fallback serial numbers
            const isFallbackSerial = (s) => {
                if (!s) return true;
                const upper = String(s).trim().toUpperCase();
                return upper.startsWith('WIN-') || upper.startsWith('FP-') || upper.startsWith('NG-') || upper === 'UNKNOWN' || upper === 'N/A';
            };

            // 1. Search by serial number
            let existingDevice = await DeviceModel.getBySerialNumber(serial_number);
            if (existingDevice) {
                console.log(`Device found by serial number: ${serial_number}. Updating details if changed.`);
                existingDevice = await DeviceModel.updateDeviceDetails(existingDevice.id, {
                    username,
                    mac_address,
                    location,
                    rms_version
                });
                return res.status(200).json(existingDevice);
            }

            // 2. Search by MAC address
            existingDevice = await DeviceModel.getByMacAddress(mac_address);
            if (existingDevice) {
                console.log(`Device found by MAC address: ${mac_address}. Current Serial in DB: ${existingDevice.serial_number}, Incoming Serial: ${serial_number}`);
                
                const existingIsFallback = isFallbackSerial(existingDevice.serial_number);
                const incomingIsFallback = isFallbackSerial(serial_number);

                if (existingIsFallback && !incomingIsFallback) {
                    console.log(`Upgrading fallback serial ${existingDevice.serial_number} to hardware serial ${serial_number} in DB.`);
                    existingDevice = await DeviceModel.updateDeviceDetails(existingDevice.id, {
                        serial_number,
                        username,
                        location,
                        rms_version
                    });
                } else {
                    console.log(`Keeping existing serial ${existingDevice.serial_number} in DB. Updating other details.`);
                    existingDevice = await DeviceModel.updateDeviceDetails(existingDevice.id, {
                        username,
                        location,
                        rms_version
                    });
                }
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
