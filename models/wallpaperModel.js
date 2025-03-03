const db = require('../config/database');

const WallpaperModel = {
    addWallpaperCommand: async (device_id, wallpaper_url) => {
        return await CommandModel.create(
            device_id,
            'set_wallpaper',
            { url: wallpaper_url }
        );
    }
};

module.exports = WallpaperModel;    