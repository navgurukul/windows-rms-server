        // server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const deviceRoutes = require('./routes/deviceRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const { initializeDatabase } = require('./config/database');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(rateLimiter);
app.use(logger);

// Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/metrics', metricsRoutes);
app.use('/api/register', userRoutes);
// Error handling
app.use(errorHandler);

// Initialize database and start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();