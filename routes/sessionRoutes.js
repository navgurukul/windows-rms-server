const express = require('express');
const SessionController = require('../controllers/sessionController');

const router = express.Router();

router.post('/start', SessionController.startSession);
router.put('/:session_id/end', SessionController.endSession);

module.exports = router;    