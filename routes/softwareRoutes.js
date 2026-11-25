const express = require('express');
const SoftwareController = require('../controllers/softwareController.js');

const router = express.Router();

router.get('/', SoftwareController.getAllSoftwares);
router.get('/assignments', SoftwareController.getAssignments);
router.get('/notInstalled', SoftwareController.getNotInstalledSoftwares);
router.post('/addHistory', SoftwareController.addHistory);
router.get('/history/:serial_number', SoftwareController.getInstallationHistory);

// Software management endpoints
router.get('/:id', SoftwareController.getSoftwareById);
router.post('/', SoftwareController.uploadMiddleware, SoftwareController.createSoftware);
router.put('/:id', SoftwareController.updateSoftware);
router.patch('/:id/testing', SoftwareController.updateSoftwareTestingStatus);
router.delete('/:id', SoftwareController.deleteSoftware);

module.exports = router;
