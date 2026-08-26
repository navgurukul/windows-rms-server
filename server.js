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
  validate: { trustProxy: false }, // Disable validation since we're intentionally behind a proxy
  skip: (req) => {
    // Bypass rate limiting for localhost during development
    return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
  }
});

// Import routes - using correct paths based on your project structure
const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const logsRoutes = require('./routes/logsRoutes');
const softwareRoutes = require('./routes/softwareRoutes');
const wallpaperRoutes = require('./routes/wallpaperRoutes');
const laptopTrackingRoutes = require('./routes/laptopTrackingRoutes'); // Add this line
const ngoRoutes = require('./routes/ngoRoutes');
const donorRoutes = require('./routes/donorRoutes');
const afeRoutes = require('./routes/afeRoutes');

// Import authentication middleware
const { verifyApiKey } = require('./middleware/auth');

// Import database initialization
const { pool, createSoftwareSeeder } = require('./config/database');
const { scheduleLogCleanup } = require('./utils/logCleanup');

// Simple logger middleware
const logger = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
};

const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());
// If behind a proxy/load balancer, enable correct client IP resolution
app.set('trust proxy', true);
app.use(limiter);
app.use(logger);

// Serve wallpapers directory as static files (public)
app.use('/wallpapers', express.static('wallpapers'));
app.use('/softwares', express.static('softwares'));

// Auth status route (public)
app.use('/api/auth', authRoutes);

// Global API Key Authentication Guard (all /api/* routes)
app.use('/api', verifyApiKey);

// Protected API Routes
app.use('/api', wallpaperRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/softwares', softwareRoutes);
app.use('/api/tracking', laptopTrackingRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/afe', afeRoutes);

// Error handling
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Check database connection
    console.log('Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✓ Database connection successful');

    await createSoftwareSeeder();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Database ready`);
      // Start log cleanup scheduler
      scheduleLogCleanup();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();