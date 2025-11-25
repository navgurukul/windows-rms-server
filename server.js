// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { rateLimit } = require('express-rate-limit');

// Create simple middleware functions since the original ones aren't found
const errorHandler = (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};

// Configure rate limiter ONCE at app initialization
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  validate: { trustProxy: false } // Disable validation since we're intentionally behind a proxy
});

// Import routes - using correct paths based on your project structure
const deviceRoutes = require('./routes/deviceRoutes');
const logsRoutes = require('./routes/logsRoutes');
const softwareRoutes = require('./routes/softwareRoutes');
const wallpaperRoutes = require('./routes/wallpaperRoutes');
const laptopTrackingRoutes = require('./routes/laptopTrackingRoutes'); // Add this line

// Import database initialization
const { initializeDatabase, createSoftwareSeeder } = require('./config/database');

// Simple logger middleware
const logger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
};

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
// If behind a proxy/load balancer, enable correct client IP resolution
app.set('trust proxy', true);
app.use(limiter);
app.use(logger);

// Routes
app.use('/api', wallpaperRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/softwares', softwareRoutes);
app.use('/api/tracking', laptopTrackingRoutes);

// Error handling
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeDatabase();
    await createSoftwareSeeder();
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
