const express = require('express');
const WallpaperController = require('../controllers/wallpaperController');

const router = express.Router();

router.post('/', WallpaperController.addWallpaper);

module.exports = router;    