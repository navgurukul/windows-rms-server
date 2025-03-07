// routes/userRoutes.js

const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// Register a new user
router.post('/register', userController.registerUser);

// Get all users
router.get('/', userController.getAllUsers);

module.exports = router;