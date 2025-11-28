// server/controllers/wallpaperController.js
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Path to the wallpaper.json file
const dataDir = path.join(__dirname, '../data');
const wallpaperFilePath = path.join(dataDir, 'wallpaper.json');

// Path to wallpapers directory
const wallpapersDir = path.join(__dirname, '../wallpapers');

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

// Ensure the data directory exists
const ensureDataDirExists = () => {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize wallpaper.json if it doesn't exist
    if (!fs.existsSync(wallpaperFilePath)) {
        fs.writeFileSync(wallpaperFilePath, JSON.stringify({ wallpaper: '' }), 'utf8');
    }
};

// Get the current wallpaper
const getWallpaper = (req, res) => {
    try {
        ensureDataDirExists();

        // Read the wallpaper.json file
        const wallpaperData = JSON.parse(fs.readFileSync(wallpaperFilePath, 'utf8'));

        // Send the wallpaper URL as response
        res.status(200).json({ wallpaper: wallpaperData.wallpaper });
    } catch (error) {
        console.error('Error retrieving wallpaper:', error);
        res.status(500).json({ error: 'Failed to retrieve wallpaper' });
    }
};

// Update the wallpaper
const updateWallpaper = (req, res) => {
    try {
        ensureDataDirExists();

        const { wallpaper } = req.body;

        // Validate input
        if (!wallpaper || typeof wallpaper !== 'string') {
            return res.status(400).json({ error: 'Valid wallpaper URL is required' });
        }

        // Write the new wallpaper URL to the file
        fs.writeFileSync(wallpaperFilePath, JSON.stringify({ wallpaper }), 'utf8');

        // Send success response
        res.status(200).json({ message: 'Wallpaper updated successfully', wallpaper });
    } catch (error) {
        console.error('Error updating wallpaper:', error);
        res.status(500).json({ error: 'Failed to update wallpaper' });
    }
};

// Handle wallpaper file upload
const uploadWallpaper = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = req.file.filename;
        const fileUrl = `${req.protocol}://${req.get('host')}/wallpapers/${filename}`;

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

// List all available wallpapers
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