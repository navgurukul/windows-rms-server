const path = require('path');
const fs = require('fs');
const multer = require('multer');
const SoftwareModel = require('../models/softwareModel.js');

const softwaresDir = path.join(__dirname, '../softwares');

// Configure multer for software installer file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(softwaresDir)) {
            fs.mkdirSync(softwaresDir, { recursive: true });
        }
        cb(null, softwaresDir);
    },
    filename: (req, file, cb) => {
        // Keep original filename so it matches the executable/package name
        cb(null, file.originalname);
    }
});

// Allow up to 2GB for large offline bundles (such as AFE)
const MAX_SOFTWARE_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_SOFTWARE_FILE_SIZE }
});

const uploadMiddleware = (req, res, next) => {
    // Increase timeout to 30 minutes for large multi-gigabyte uploads
    req.setTimeout(30 * 60 * 1000);
    res.setTimeout(30 * 60 * 1000);

    upload.fields([
        { name: 'file', maxCount: 1 },
        { name: 'software', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: 'File too large. Maximum allowed size is 2GB.' });
                }
                return res.status(400).json({ error: `File upload error: ${err.message}` });
            }
            return res.status(400).json({ error: err.message });
        }
        if (req.files) {
            req.file = req.files['file']?.[0] || req.files['software']?.[0] || null;
        }
        next();
    });
};

const ALLOWED_FIELDS = new Set([
    'softwareName',
    'wingetId',
    'source',
    'isGlobal',
    'installerType',
    'silentArgs',
    'runAs',
    'elevation',
    'preInstallScript',
    'postInstallScript',
    'customInstallScript',
    'processNameToWait',
    'timeoutSeconds',
    'successExitCodes',
    'isPortable',
    'isActive',
    'isTesting',
    'is_testing'
]);

const SoftwareController = {

    uploadMiddleware,

    getNotInstalledSoftwares: async (req, res) => {
        try {
            const serial_number = req.query.serial_number || req.query.serialNumber;
            const device_id = req.query.device_id || req.query.deviceId || req.query.id;
            const mac_address = req.query.mac_address || req.query.macAddress;

            const notInstalledSoftwares = await SoftwareModel.getNotInstalledSoftwares({
                serial_number,
                device_id,
                mac_address
            });
            return res.json(notInstalledSoftwares);
        } catch (error) {
            console.error('Error fetching not installed softwares:', error);
            res.status(500).json({ error: 'Failed to fetch not installed softwares' });
        }
    },

    getAllSoftwares: async (req, res) => {
        try {
            const softwares = await SoftwareModel.getAllSoftwares();
            return res.json(softwares);
        } catch (error) {
            console.error('Error fetching all softwares:', error);
            res.status(500).json({ error: 'Failed to fetch all softwares' });
        }
    },

    getSoftwareById: async (req, res) => {
        try {
            const { id } = req.params;
            const software = await SoftwareModel.getById(id);
            if (!software) {
                return res.status(404).json({ error: 'Software not found' });
            }
            return res.json(software);
        } catch (error) {
            console.error('Error fetching software by ID:', error);
            res.status(500).json({ error: 'Failed to fetch software' });
        }
    },

    createSoftware: async (req, res) => {
        const uploadedFile = req.file;

        const cleanupUploadedFile = () => {
            if (uploadedFile && uploadedFile.path && fs.existsSync(uploadedFile.path)) {
                try {
                    fs.unlinkSync(uploadedFile.path);
                } catch (cleanupErr) {
                    console.error('Error cleaning up uploaded file:', cleanupErr);
                }
            }
        };

        try {
            // Reject any field outside the set of allowed fields
            const invalidField = Object.keys(req.body).find(key => !ALLOWED_FIELDS.has(key));
            if (invalidField) {
                cleanupUploadedFile();
                return res.status(400).json({ error: `Field "${invalidField}" is not accepted` });
            }

            // Destructure API fields
            const {
                softwareName,
                wingetId,
                source,
                isGlobal,
                installerType,
                silentArgs,
                runAs,
                elevation,
                preInstallScript,
                postInstallScript,
                customInstallScript,
                processNameToWait,
                timeoutSeconds,
                successExitCodes,
                isPortable,
                isActive,
                isTesting,
                is_testing
            } = req.body;

            // If a file was uploaded and wingetId not explicitly provided, use the uploaded filename
            const effectiveWingetId = wingetId ? String(wingetId).trim() : (uploadedFile ? uploadedFile.filename : null);

            // If a file was uploaded and source was not provided, default to 'rms-repository'
            const effectiveSource = source ? String(source).trim() : (uploadedFile ? 'rms-repository' : 'winget');

            // Validate required fields
            if (!softwareName || !String(softwareName).trim()) {
                cleanupUploadedFile();
                return res.status(400).json({ error: 'softwareName is required' });
            }
            if (!effectiveWingetId) {
                cleanupUploadedFile();
                return res.status(400).json({ error: 'wingetId or an uploaded file is required' });
            }

            // Check duplicate name
            const existing = await SoftwareModel.getByName(softwareName.trim());
            if (existing) {
                cleanupUploadedFile();
                return res.status(409).json({ error: `Software with name "${softwareName}" already exists` });
            }

            // Helper to parse booleans sent via multipart/form-data strings
            const parseBoolean = (val) => {
                if (typeof val === 'boolean') return val;
                if (val === 'true') return true;
                if (val === 'false') return false;
                return undefined;
            };

            // Helper to parse numbers sent via multipart/form-data strings
            const parseNumber = (val) => {
                if (val === undefined || val === null || val === '') return undefined;
                const n = Number(val);
                return isNaN(n) ? undefined : n;
            };

            let parsedSilentArgs = silentArgs;
            if (typeof silentArgs === 'string') {
                try {
                    parsedSilentArgs = JSON.parse(silentArgs);
                } catch {
                    cleanupUploadedFile();
                    return res.status(400).json({ error: 'silentArgs must be a valid JSON object or array' });
                }
            }

            // Default installerType if file uploaded and installerType not set
            let effectiveInstallerType = installerType ? String(installerType).trim() : undefined;
            if (!effectiveInstallerType && uploadedFile) {
                const lowerName = uploadedFile.filename.toLowerCase();
                effectiveInstallerType = lowerName.endsWith('.msi') ? 'msi' : 'custom_exe';
            }

            const newSoftware = await SoftwareModel.create({
                softwareName: softwareName.trim(),
                wingetId: effectiveWingetId,
                source: effectiveSource,
                isGlobal: parseBoolean(isGlobal),
                installerType: effectiveInstallerType,
                silentArgs: parsedSilentArgs,
                runAs: runAs ? String(runAs).trim() : undefined,
                elevation: elevation ? String(elevation).trim() : undefined,
                preInstallScript,
                postInstallScript,
                customInstallScript,
                processNameToWait,
                timeoutSeconds: parseNumber(timeoutSeconds),
                successExitCodes,
                isPortable: parseBoolean(isPortable),
                isActive: parseBoolean(isActive),
                isTesting: parseBoolean(isTesting !== undefined ? isTesting : is_testing) ?? false
            });

            return res.status(201).json({
                ...newSoftware,
                uploadedFile: uploadedFile ? {
                    filename: uploadedFile.filename,
                    size: uploadedFile.size,
                    path: `/softwares/${uploadedFile.filename}`
                } : undefined
            });
        } catch (error) {
            cleanupUploadedFile();
            console.error('Error creating software:', error);
            res.status(500).json({ error: 'Failed to create software' });
        }
    },

    updateSoftware: async (req, res) => {
        try {
            const { id } = req.params;

            // Reject any field outside the set of allowed fields
            const invalidField = Object.keys(req.body).find(key => !ALLOWED_FIELDS.has(key));
            if (invalidField) {
                return res.status(400).json({ error: `Field "${invalidField}" is not accepted` });
            }

            if (Object.keys(req.body).length === 0) {
                return res.status(400).json({ error: 'At least one field is required to update' });
            }

            if (req.body.silentArgs && typeof req.body.silentArgs === 'string') {
                try {
                    req.body.silentArgs = JSON.parse(req.body.silentArgs);
                } catch {
                    return res.status(400).json({ error: 'silentArgs must be a valid JSON object or array' });
                }
            }

            const updatedSoftware = await SoftwareModel.update(id, req.body);
            if (!updatedSoftware) {
                return res.status(404).json({ error: 'Software not found or no changes made' });
            }

            return res.json(updatedSoftware);
        } catch (error) {
            console.error('Error updating software:', error);
            res.status(500).json({ error: 'Failed to update software' });
        }
    },

    updateSoftwareTestingStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const is_testing = req.body.is_testing !== undefined ? req.body.is_testing : req.body.isTesting;
            if (is_testing === undefined) {
                return res.status(400).json({ error: 'is_testing boolean is required' });
            }
            const updated = await SoftwareModel.update(id, {
                is_testing: Boolean(is_testing)
            });
            if (!updated) {
                return res.status(404).json({ error: 'Software not found' });
            }
            return res.status(200).json(updated);
        } catch (error) {
            console.error('Error updating software testing status:', error);
            res.status(500).json({ error: 'Failed to update software testing status' });
        }
    },

    deleteSoftware: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedSoftware = await SoftwareModel.delete(id);
            if (!deletedSoftware) {
                return res.status(404).json({ error: 'Software not found' });
            }

            return res.json({ message: 'Software deleted successfully', software: deletedSoftware });
        } catch (error) {
            console.error('Error deleting software:', error);
            res.status(500).json({ error: 'Failed to delete software' });
        }
    },

    getAssignments: async (req, res) => {
        try {
            const assignments = await SoftwareModel.getAssignments();
            return res.json(assignments);
        } catch (error) {
            console.error('Error fetching software assignments:', error);
            res.status(500).json({ error: 'Failed to fetch software assignments' });
        }
    },

    addHistory: async (req, res) => {
        try {
            const { serial_number, software_name, isSuccessful } = req.body;
            const history = await SoftwareModel.addHistory(serial_number, software_name, isSuccessful);
            res.json(history);
        }
        catch (error) {
            console.error('Error adding history:', error);
            res.status(500).json({ error: 'Failed to add history' });
        }
    },

    getInstallationHistory: async (req, res) => {
        try {
            const { serial_number } = req.params;
            if (!serial_number) {
                return res.status(400).json({ error: 'Serial number is required' });
            }
            const history = await SoftwareModel.getInstallationHistory(serial_number);
            res.json(history);
        }
        catch (error) {
            console.error('Error fetching installation history:', error);
            res.status(500).json({ error: 'Failed to fetch installation history' });
        }
    },
};

module.exports = SoftwareController;
