const express = require('express');
const router = express.Router();
const AFEController = require('../controllers/afeController');

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

// SAMA School Registry Lookup Routes
router.get('/schools/udise-map', AFEController.getSchoolUdiseMap);
router.get('/schools/cache-stats', AFEController.getSchoolCacheStats);
router.get('/schools/udise/:udiseCode', AFEController.lookupSchoolByUdise);
router.post('/reconcile-schools', AFEController.reconcileAllSchools);

module.exports = router;
