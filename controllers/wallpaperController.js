
const WallpaperModel = require('../models/wallpaperModel');

const WallpaperController = {
    addWallpaper: async (req, res) => {
        try {
            const { device_id, wallpaper_url } = req.body;
            
            if (!device_id || !wallpaper_url) {
                return res.status(400).json({ 
                    error: 'device_id and wallpaper_url are required' 
                });
            }
            
            const command = await WallpaperModel.addWallpaperCommand(device_id, wallpaper_url);
            res.status(201).json(command);
        } catch (error) {
            console.error('Error adding wallpaper command:', error);
            res.status(500).json({ error: 'Failed to add wallpaper command' });
        }
    }
};

module.exports = WallpaperController;