const express = require('express');
const SoftwareController = require('../controllers/softwareController.js');

const router = express.Router();

router.get('/notInstalled', SoftwareController.getNotInstalledSoftwares);
router.post('/addHistory', SoftwareController.addHistory);
router.get('/history/:serial_number', SoftwareController.getInstallationHistory);

module.exports = router;