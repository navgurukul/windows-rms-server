const express = require('express');
const Controller = require('../controllers/logsController');

const router = express.Router();

router.post('/', Controller.uploadLogs);
router.get('/', Controller.getLogFiles);
router.get('/:filename', Controller.readLogFile);

module.exports = router;