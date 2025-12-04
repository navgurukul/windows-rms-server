// server/controllers/wallpaperController.js
const path = require('path');
const multer = require('multer');
const WallpaperModel = require('../models/wallpaperModel');

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
        const serial_number = req.params.serial_number;
        const device_id = await DeviceModel.getDeviceIdBySerialNumber(serial_number);
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

// Update the active wallpaper in database
const updateWallpaper = async (req, res) => {
    try {
        const { wallpaper } = req.body;

        // Validate input
        if (!wallpaper || typeof wallpaper !== 'string') {
            return res.status(400).json({ error: 'Valid wallpaper URL is required' });
        }

        // Set as active wallpaper in database
        const updatedWallpaper = await WallpaperModel.setActiveWallpaper(wallpaper);

        res.status(200).json({
            message: 'Wallpaper updated successfully',
            wallpaper: updatedWallpaper.wallpaper_url
        });
    } catch (error) {
        console.error('Error updating wallpaper:', error);
        res.status(500).json({ error: 'Failed to update wallpaper' });
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

        res.status(200).json({
            message: 'Wallpaper uploaded successfully',
            filename: filename,
            url: fileUrl,
            size: req.file.size
        });
    } catch (error) {
        console.error('Error uploading wallpaper:', error);
        res.status(500).json({ error: 'Failed to upload wallpaper' });
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

        res.status(200).json({
            count: wallpapers.length,
            wallpapers: wallpapers
        });
    } catch (error) {
        console.error('Error listing wallpapers:', error);
        res.status(500).json({ error: 'Failed to list wallpapers' });
    }
};

module.exports = {
    getWallpaper,
    updateWallpaper,
    uploadWallpaper,
    listWallpapers,
    upload // Export multer upload middleware
};