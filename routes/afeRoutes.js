const express = require('express');
const router = express.Router();
const AFEController = require('../controllers/afeController');

router.post('/validate-key', AFEController.validateNGOKey);
router.post('/sync', AFEController.syncAfeData);
router.get('/overview', AFEController.getOverview);
router.get('/details', AFEController.getDetails);

module.exports = router;
