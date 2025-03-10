// server/routes/laptopTrackingRoutes.js
const express = require('express');
const router = express.Router();
const laptopTrackingController = require('../controllers/laptopTrackingController');

// POST endpoint to sync laptop tracking data
router.post('/sync', laptopTrackingController.syncLaptopData);

// POST endpoint to bulk sync multiple tracking records
router.post('/bulk-sync', laptopTrackingController.bulkSyncLaptopData);

// GET endpoint to get daily usage statistics
router.get('/usage/:username', laptopTrackingController.getDailyUsage);

module.exports = router;