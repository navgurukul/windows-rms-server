const express = require('express');
const router = express.Router();
const { getWallpaper, updateWallpaper } = require('../controllers/wallpaperController');

// GET endpoint to retrieve the current wallpaper URL
router.get('/wallpaper', getWallpaper);

// POST endpoint to update the wallpaper URL
router.post('/wallpaper', updateWallpaper);

module.exports = router;