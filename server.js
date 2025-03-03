const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initializeDatabase } = require('./config/database');
const deviceRoutes = require('./routes/deviceRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const usageRoutes = require('./routes/usageRoutes');
const wallpaperRoutes = require('./routes/wallpaperRoutes');
const commandRoutes = require('./routes/commandRoutes');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize database connection
initializeDatabase();

// Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/wallpapers', wallpaperRoutes);
app.use('/api/commands', commandRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
