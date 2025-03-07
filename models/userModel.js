// models/userModel.js

const pool = require('../config/database');

/**
 * Create a new user
 * @param {Object} userData - User data containing username, serial_number, mac_address, and location
 * @returns {Promise<Object>} - The created user object
 */
const createUser = async (userData) => {
  const { username, serial_number, mac_address, location } = userData;
  
  const query = `
    INSERT INTO users (username, serial_number, mac_address, location)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  
  const result = await pool.query(query, [username, serial_number, mac_address, location]);
  return result.rows[0];
};

/**
 * Get all users
 * @returns {Promise<Array>} - Array of user objects
 */
const getAllUsers = async () => {
  const query = 'SELECT * FROM users';
  const result = await pool.query(query);
  return result.rows;
};

/**
 * Get a user by serial number
 * @param {string} serialNumber - The serial number to look up
 * @returns {Promise<Object|null>} - The user object or null if not found
 */
const getUserBySerialNumber = async (serialNumber) => {
  const query = 'SELECT * FROM users WHERE serial_number = $1';
  const result = await pool.query(query, [serialNumber]);
  return result.rows[0] || null;
};

module.exports = {
  createUser,
  getAllUsers,
  getUserBySerialNumber
};