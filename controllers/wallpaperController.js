// server/controllers/wallpaperController.js
const fs = require('fs');
const path = require('path');

// Path to the wallpaper.json file
const dataDir = path.join(__dirname, '../data');
const wallpaperFilePath = path.join(dataDir, 'wallpaper.json');

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

module.exports = {
    getWallpaper,
    updateWallpaper
};