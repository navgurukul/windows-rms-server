// controllers/userController.js

const userModel = require('../models/userModel');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const registerUser = async (req, res) => {
  try {
    const { username, serial_number, mac_address, location } = req.body;
    
    // Validate required fields
    if (!username || !serial_number || !mac_address || !location) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required: username, serial_number, mac_address, and location' 
      });
    }
    
    // Check if user with serial number already exists
    const existingUser = await userModel.getUserBySerialNumber(serial_number);
    if (existingUser) {
      return res.status(409).json({ 
        success: false, 
        message: 'User with this serial number already exists' 
      });
    }
    
    // Create the user
    const userData = { username, serial_number, mac_address, location };
    const newUser = await userModel.createUser(userData);
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: newUser
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred while registering user'
    });
  }
};

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await userModel.getAllUsers();
    
    return res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error occurred while fetching users'
    });
  }
};

module.exports = {
  registerUser,
  getAllUsers
};