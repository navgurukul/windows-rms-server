const express = require('express');
const router = express.Router();
const {
    getWallpaper,
    updateWallpaper,
    uploadWallpaper,
    listWallpapers,
    upload
} = require('../controllers/wallpaperController');

// GET endpoint to retrieve the current wallpaper URL
router.get('/wallpaper', getWallpaper);

// POST endpoint to update the wallpaper URL
router.post('/wallpaper', updateWallpaper);

// POST endpoint to upload a wallpaper file
router.post('/wallpapers/upload', upload.single('wallpaper'), uploadWallpaper);

// GET endpoint to list all available wallpapers
router.get('/wallpapers/list', listWallpapers);

module.exports = router;