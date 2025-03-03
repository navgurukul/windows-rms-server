const express = require('express');
const DeviceController = require('../controllers/deviceController');

const router = express.Router();

router.post('/', DeviceController.registerDevice);
router.get('/', DeviceController.getAllDevices);

module.exports = router;