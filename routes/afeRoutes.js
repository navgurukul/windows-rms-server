const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const AFEController = require('../controllers/afeController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

router.post('/validate-key', AFEController.validateNGOKey);
router.post('/sync-ngo', AFEController.syncNGO);
router.post('/check-device', AFEController.checkDeviceStatus);
router.post('/reconcile-device', AFEController.reconcileDevice);
router.post('/sync', AFEController.syncAfeData);
router.post('/backfill-historical', AFEController.backfillHistoricalData);
router.get('/overview', AFEController.getOverview);
router.get('/details', AFEController.getDetails);
router.get('/export-csv', AFEController.exportCsv);
router.get('/export-csv-legacy', AFEController.exportCsvLegacy);

// Feedback endpoints
router.post('/feedback', upload.fields([{ name: 'screenshot', maxCount: 1 }, { name: 'log_file', maxCount: 1 }]), AFEController.submitFeedback);
router.get('/feedback', AFEController.getFeedbacks);
router.patch('/feedback/:id/status', AFEController.updateFeedbackStatus);

module.exports = router;
