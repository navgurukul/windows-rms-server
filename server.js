const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const app = express();

// Configuration
const CONFIG = {
    LOG_DIR: path.join(__dirname, 'server_logs'),
    METRICS_FILE: 'metrics.json',
    SESSIONS_FILE: 'sessions.json',
    CLIENTS_FILE: 'clients.json',
    COMMANDS_FILE: 'commands.json'
};

// In-memory storage
const clients = new Map();
const commands = new Map();
const metrics = new Map();

// Ensure log directory exists
async function initializeLogging() {
    try {
        await fs.mkdir(CONFIG.LOG_DIR, { recursive: true });
        console.log('Log directory initialized:', CONFIG.LOG_DIR);
    } catch (error) {
        console.error('Error creating log directory:', error);
        process.exit(1);
    }
}

// Logging functions
async function logToFile(type, data) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(CONFIG.LOG_DIR, `${type}_${date}.log`);
    const logEntry = `${new Date().toISOString()} - ${JSON.stringify(data)}\n`;

    try {
        await fs.appendFile(logFile, logEntry);
    } catch (error) {
        console.error(`Error writing to ${type} log:`, error);
    }
}

async function updateJsonStore(filename, data) {
    const filePath = path.join(CONFIG.LOG_DIR, filename);
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Error updating ${filename}:`, error);
    }
}

app.use(bodyParser.json());

// Logging middleware
app.use(async (req, res, next) => {
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params
    };
    await logToFile('requests', requestLog);
    next();
});

// Client registration endpoint
app.post('/register', async (req, res) => {
    const clientInfo = req.body;
    const registrationData = {
        ...clientInfo,
        lastSeen: new Date(),
        active: true,
        registrationTime: new Date().toISOString()
    };

    clients.set(clientInfo.clientId, registrationData);

    // Log registration
    await logToFile('registrations', registrationData);
    await updateJsonStore(CONFIG.CLIENTS_FILE, Array.from(clients.entries()));

    console.log(`New client registered: ${clientInfo.hostname} (${clientInfo.systemId})`);
    res.json({ status: 'registered' });
});

// Metrics collection endpoint
app.post('/metrics/:clientId', async (req, res) => {
    const clientId = req.params.clientId;
    const metricsData = req.body;
    const timestamp = new Date();

    // Process session metrics
    if (metricsData.type === 'SESSION_END') {
        await logToFile('sessions', {
            ...metricsData,
            receivedAt: timestamp.toISOString()
        });
    }

    // Store metrics
    const clientMetrics = metrics.get(clientId) || [];
    const newMetrics = {
        ...metricsData,
        receivedAt: timestamp.toISOString()
    };

    clientMetrics.push(newMetrics);

    // Keep only last 24 hours of metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredMetrics = clientMetrics.filter(m => new Date(m.receivedAt) > oneDayAgo);
    metrics.set(clientId, filteredMetrics);

    // Log metrics
    await logToFile('metrics', newMetrics);
    await updateJsonStore(CONFIG.METRICS_FILE, Array.from(metrics.entries()));

    // Update client's last seen timestamp
    if (clients.has(clientId)) {
        const clientInfo = clients.get(clientId);
        clientInfo.lastSeen = timestamp;
        clients.set(clientId, clientInfo);
        await updateJsonStore(CONFIG.CLIENTS_FILE, Array.from(clients.entries()));
    }

    res.json({ status: 'received' });
});

// Command endpoints with logging
app.post('/admin/send-command', async (req, res) => {
    const { clientId, command } = req.body;

    if (!clients.has(clientId)) {
        const error = { error: 'Client not found', clientId, timestamp: new Date().toISOString() };
        await logToFile('errors', error);
        return res.status(404).json(error);
    }

    const commandData = {
        id: Date.now().toString(),
        ...command,
        timestamp: new Date().toISOString(),
        clientId
    };

    const clientCommands = commands.get(clientId) || [];
    clientCommands.push(commandData);
    commands.set(clientId, clientCommands);

    await logToFile('commands', commandData);
    await updateJsonStore(CONFIG.COMMANDS_FILE, Array.from(commands.entries()));

    res.json({ status: 'command-queued', commandId: commandData.id });
});

app.post('/command-status', async (req, res) => {
    const { clientId, commandId, status, error } = req.body;
    const statusUpdate = {
        clientId,
        commandId,
        status,
        error,
        timestamp: new Date().toISOString()
    };

    await logToFile('command_status', statusUpdate);
    console.log(`Command ${commandId} for client ${clientId} completed with status: ${status}`);

    if (error) {
        await logToFile('errors', { ...statusUpdate, type: 'command_error' });
    }

    res.json({ status: 'received' });
});

// Get client status endpoint
app.get('/admin/clients', async (req, res) => {
    const clientList = Array.from(clients.entries()).map(([id, info]) => ({
        clientId: id,
        ...info,
        isActive: new Date(info.lastSeen) > new Date(Date.now() - 5 * 60 * 1000) // Consider active if seen in last 5 minutes
    }));

    res.json(clientList);
});

// Get client metrics endpoint
app.get('/admin/metrics/:clientId', async (req, res) => {
    const clientId = req.params.clientId;
    const clientMetrics = metrics.get(clientId) || [];
    res.json(clientMetrics);
});

// Initialize server
async function startServer() {
    await initializeLogging();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Logs directory: ${CONFIG.LOG_DIR}`);
    });
}

// Start server with error handling
startServer().catch(error => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
});