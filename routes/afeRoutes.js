const express = require('express');
const router = express.Router();
const AFEController = require('../controllers/afeController');

router.post('/validate-key', AFEController.validateNGOKey);
router.post('/sync', AFEController.syncAfeData);
router.post('/backfill-historical', AFEController.backfillHistoricalData);
router.get('/overview', AFEController.getOverview);
router.get('/details', AFEController.getDetails);
router.get('/export-csv', AFEController.exportCsv);

module.exports = router;
