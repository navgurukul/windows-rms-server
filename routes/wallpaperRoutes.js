const express = require('express');
const router = express.Router();
const {
    getWallpaper,
    updateWallpaper,
    uploadWallpaper,
    listWallpapers,
    getAssignments,
    assignGlobal,
    assignToDonor,
    assignToNGO,
    unassignFromDonor,
    unassignFromNGO,
    deleteWallpaper,
    upload
} = require('../controllers/wallpaperController');

// GET endpoint to retrieve the current wallpaper URL
router.get('/wallpaper/', getWallpaper);

// POST endpoint to update the wallpaper URL
router.post('/wallpaper/', updateWallpaper);

// POST endpoint to upload a wallpaper file
router.post('/wallpapers/upload', upload.single('wallpaper'), uploadWallpaper);

// GET endpoint to list all available wallpapers
router.get('/wallpapers/list', listWallpapers);

// GET endpoint to get all wallpaper assignments
router.get('/wallpapers/assignments', getAssignments);

// POST endpoints for assigning wallpapers
router.post('/wallpaper/global', assignGlobal);
router.post('/wallpaper/donor', assignToDonor);
router.post('/wallpaper/ngo', assignToNGO);

// DELETE endpoints for unassigning wallpapers
router.delete('/wallpaper/donor', unassignFromDonor);
router.delete('/wallpaper/ngo', unassignFromNGO);

// DELETE endpoint to remove a wallpaper completely
router.delete('/wallpapers/:id', deleteWallpaper);

module.exports = router;