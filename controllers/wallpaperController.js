// server/controllers/wallpaperController.js
const path = require('path');
const multer = require('multer');
const WallpaperModel = require('../models/wallpaperModel');
const DeviceModel = require('../models/deviceModel');

// Path to wallpapers directory
const wallpapersDir = path.join(__dirname, '../wallpapers');
const fs = require('fs');

// Configure multer for wallpaper uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Ensure wallpapers directory exists
        if (!fs.existsSync(wallpapersDir)) {
            fs.mkdirSync(wallpapersDir, { recursive: true });
        }
        cb(null, wallpapersDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        cb(null, basename + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        cb(null, true);
    } else {
        cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Get the current active wallpaper from database
const getWallpaper = async (req, res) => {
    try {
        const serial_number = req.query.serial_number || null;
        let device_id = null;
        if (serial_number) {
            device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);
        }
        const activeWallpaper = await WallpaperModel.getActiveWallpaper(device_id);

        if (!activeWallpaper) {
            return res.status(200).json({ wallpaper: '' });
        }

        res.status(200).json({ wallpaper: activeWallpaper.wallpaper_url });
    } catch (error) {
        console.error('Error retrieving wallpaper:', error);
        res.status(500).json({ error: 'Failed to retrieve wallpaper' });
    }
};

// Update the active wallpaper for multiple devices
const updateWallpaper = async (req, res) => {
    try {
        const { serailNumberArray, wallpaper_id } = req.body;

        // Validate input
        if (!serailNumberArray || !Array.isArray(serailNumberArray) || serailNumberArray.length === 0) {
            return res.status(400).json({ error: 'Valid serailNumberArray is required' });
        }
        if (!wallpaper_id) {
            return res.status(400).json({ error: 'Valid wallpaper_id is required' });
        }

        // Process all serial numbers in parallel for better performance
        const updatePromises = serailNumberArray.map(async (serial_number) => {
            try {
                // Get device ID from serial number
                const device_id = await DeviceModel.fetchDeviceIdFromSerialNumber(serial_number);

                if (!device_id) {
                    return {
                        success: false,
                        serial_number,
                        error: 'Device not found'
                    };
                }

                // Upsert device wallpaper mapping
                const updatedMapping = await WallpaperModel.upsertDeviceWallpaper(device_id, parseInt(wallpaper_id));

                return {
                    success: true,
                    serial_number,
                    device_id: updatedMapping.device_id,
                    wallpaper_id: updatedMapping.wallpaper_id,
                    status: 'success'
                };
            } catch (err) {
                return {
                    success: false,
                    serial_number,
                    error: err.message
                };
            }
        });

        // Wait for all updates to complete
        const allResults = await Promise.all(updatePromises);

        // Separate successes and errors
        const results = allResults.filter(r => r.success);
        const errors = allResults.filter(r => !r.success).map(({ success, ...rest }) => rest);

        return res.status(200).json({
            message: `Wallpaper updated for ${results.length} device(s)`,
            success_count: results.length,
            error_count: errors.length,
            results,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error updating wallpaper:', error);
        return res.status(500).json({ error: 'Failed to update wallpaper' });
    }
};

// Handle wallpaper file upload
const uploadWallpaper = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = req.file.filename;
        const fileUrl = `${req.protocol}://${req.get('host')}/wallpapers/${filename}`;

        // Optionally save to database (not as active)
        await WallpaperModel.createWallpaper(fileUrl);

        return res.status(200).json({
            message: 'Wallpaper uploaded successfully',
            filename: filename,
            url: fileUrl,
            size: req.file.size
        });
    } catch (error) {
        console.error('Error uploading wallpaper:', error);
        return res.status(500).json({ error: 'Failed to upload wallpaper' });
    }
};

// List all available wallpapers (from filesystem)
const listWallpapers = (req, res) => {
    try {
        // Ensure wallpapers directory exists
        if (!fs.existsSync(wallpapersDir)) {
            return res.status(200).json({ wallpapers: [] });
        }

        // Read directory contents
        const files = fs.readdirSync(wallpapersDir);

        // Filter for image files and get metadata
        const wallpapers = files
            .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
            .map(file => {
                const filepath = path.join(wallpapersDir, file);
                const stats = fs.statSync(filepath);
                return {
                    filename: file,
                    url: `${req.protocol}://${req.get('host')}/wallpapers/${file}`,
                    size: stats.size,
                    modified: stats.mtime
                };
            });

        return res.status(200).json({
            count: wallpapers.length,
            wallpapers: wallpapers
        });
    } catch (error) {
        console.error('Error listing wallpapers:', error);
        return res.status(500).json({ error: 'Failed to list wallpapers' });
    }
};

module.exports = {
    getWallpaper,
    updateWallpaper,
    uploadWallpaper,
    listWallpapers,
    upload // Export multer upload middleware
};