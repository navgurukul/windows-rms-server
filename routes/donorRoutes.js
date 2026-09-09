const express = require('express');
const DonorController = require('../controllers/donorController');
const router = express.Router();

router.get('/', DonorController.getAllDonors);
router.get('/:id', DonorController.getDonorById);
router.post('/', DonorController.createDonor);
router.put('/:id', DonorController.updateDonor);
router.delete('/:id', DonorController.deleteDonor);

module.exports = router;
