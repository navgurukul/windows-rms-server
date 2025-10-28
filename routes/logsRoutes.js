const express = require('express');
const Controller = require('../controllers/logsController');

const router = express.Router();

router.post('/', Controller.uploadLogs);

module.exports = router;