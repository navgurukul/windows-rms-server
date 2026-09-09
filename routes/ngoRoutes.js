const express = require('express');
const NGOController = require('../controllers/ngoController');
const router = express.Router();

router.get('/', NGOController.getAllNGOs);
router.get('/:id', NGOController.getNGOById);
router.post('/', NGOController.createNGO);
router.put('/:id', NGOController.updateNGO);
router.delete('/:id', NGOController.deleteNGO);

module.exports = router;
