// server/routes/laptopTrackingRoutes.js
const express = require('express');
const router = express.Router();
const laptopTrackingController = require('../controllers/laptopTrackingController');

// POST endpoint to sync laptop tracking data
router.post('/sync', laptopTrackingController.syncLaptopData);

// POST endpoint to bulk sync multiple tracking records
router.post('/bulk-sync', laptopTrackingController.bulkSyncLaptopData);

// GET endpoint to get daily usage statistics by username
router.get('/usage/:username', laptopTrackingController.getDailyUsage);

// GET endpoint to get all data from database
router.get('/all', laptopTrackingController.getAllData);

// GET endpoint to get data filtered by system ID
router.get('/system/:system_id', laptopTrackingController.getSystemData);

// GET endpoint to get data filtered by serial number
router.get('/serial/:serial_number', laptopTrackingController.getSerialNumberData);

module.exports = router;