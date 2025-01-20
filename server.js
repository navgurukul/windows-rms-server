const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// In-memory storage (replace with a database in production)
const clients = new Map();
const commands = new Map();
const metrics = new Map();

app.use(bodyParser.json());

// Client registration endpoint
app.post('/register', (req, res) => {
    const clientInfo = req.body;
    clients.set(clientInfo.clientId, {
        ...clientInfo,
        lastSeen: new Date(),
        active: true
    });

    console.log(`New client registered: ${clientInfo.hostname}`);
    res.json({ status: 'registered' });
});

// Command queue endpoint
app.get('/commands/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const pendingCommands = commands.get(clientId) || [];
    res.json(pendingCommands);

    // Clear commands after sending
    commands.set(clientId, []);
});

// Command status update endpoint
app.post('/command-status', (req, res) => {
    const { clientId, commandId, status, error } = req.body;
    console.log(`Command ${commandId} for client ${clientId} completed with status: ${status}`);
    if (error) {
        console.error(`Command error: ${error}`);
    }
    res.json({ status: 'received' });
});

// Metrics collection endpoint
app.post('/metrics/:clientId', (req, res) => {
    const clientId = req.params.clientId;
    const clientMetrics = metrics.get(clientId) || [];
    clientMetrics.push({
        ...req.body,
        timestamp: new Date()
    });

    // Keep only last 24 hours of metrics
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filteredMetrics = clientMetrics.filter(m => m.timestamp > oneDayAgo);

    metrics.set(clientId, filteredMetrics);
    res.json({ status: 'received' });
});

// Admin API to send commands to clients
app.post('/admin/send-command', (req, res) => {
    const { clientId, command } = req.body;

    if (!clients.has(clientId)) {
        return res.status(404).json({ error: 'Client not found' });
    }

    const clientCommands = commands.get(clientId) || [];
    clientCommands.push({
        id: Date.now().toString(),
        ...command,
        timestamp: new Date()
    });

    commands.set(clientId, clientCommands);
    res.json({ status: 'command-queued' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
