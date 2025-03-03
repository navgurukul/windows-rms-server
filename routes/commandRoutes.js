const express = require('express');
const CommandController = require('../controllers/commandController');

const router = express.Router();

router.get('/:device_id', CommandController.getPendingCommands);
router.put('/:command_id/executed', CommandController.markCommandExecuted);

module.exports = router;        