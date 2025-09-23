const express = require('express');
const SoftwareController = require('../controllers/softwareController.js');

const router = express.Router();

router.get('/notInstalled', SoftwareController.getNotInstalledSoftwares);
router.post('/addHistory', SoftwareController.addHistory);

module.exports = router;