const express = require('express');
const UsageController = require('../controllers/usageController');

const router = express.Router();

router.get('/:device_id', UsageController.getDailyUsage);

module.exports = router;