// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Create simple middleware functions since the original ones aren't found
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};

const rateLimiter = (req, res, next) => {
  // Simple rate limiter - in production you'd use a more robust solution
  next();
};

// Import routes - using correct paths based on your project structure
const deviceRoutes = require('./routes/deviceRoutes');
const wallpaperRoutes = require('./routes/wallpaperRoutes');
const laptopTrackingRoutes = require('./routes/laptopTrackingRoutes'); // Add this line

// Import database initialization
const { initializeDatabase } = require('./config/database');

// Simple logger middleware
const logger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
};

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(rateLimiter);
app.use(logger);

// Routes
app.use('/api/devices', deviceRoutes);
app.use('/api', wallpaperRoutes);
app.use('/api/tracking', laptopTrackingRoutes); // Add this line

// Error handling
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Database tables initialized successfully');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();