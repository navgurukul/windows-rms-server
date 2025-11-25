const fs = require('fs');
const path = require('path');

const LogsController = {
    uploadLogs: async (req, res) => {
        try {
            const { deviceId, serial_number, timestamp, logs } = req.body;
            const serial = serial_number || deviceId || 'UNKNOWN';
            const ts = timestamp || new Date().toISOString();

            // Ensure target directory exists: clientLogs at server root
            const baseDir = path.join(__dirname, "..", "clientLogs");
            fs.mkdirSync(baseDir, { recursive: true });

            // Build date-wise filename: {serial}{YYYY_MM_DD}.txt
            const d = new Date(ts);
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            const datePart = `${yyyy}_${mm}_${dd}`;
            const filename = `${serial}${datePart}.txt`;
            const filePath = path.join(baseDir, filename);

            // Normalize logs array to lines of text
            const lines = Array.isArray(logs)
                ? logs.map(l => {
                    if (typeof l === 'string') return l;
                    try { return JSON.stringify(l); } catch { return String(l); }
                }).join("\n") + "\n"
                : '';

            if (lines.length > 0) {
                fs.appendFileSync(filePath, lines);
            }

            // Retention: keep only files newer than 7 days
            try {
                const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
                const now = Date.now();
                const files = fs.readdirSync(baseDir);
                for (const f of files) {
                    const full = path.join(baseDir, f);
                    try {
                        const stat = fs.statSync(full);
                        if (now - stat.mtimeMs > maxAgeMs) {
                            fs.unlinkSync(full);
                        }
                    } catch { }
                }
            } catch { }

            res.sendStatus(200);
        } catch (e) {
            console.error('Failed to save client logs:', e);
            res.status(500).json({ error: 'Failed to save client logs' });
        }
    },

    getLogFiles: async (req, res) => {
        try {
            const { serial_number } = req.query;
            const baseDir = path.join(__dirname, "..", "clientLogs");

            // Ensure directory exists
            if (!fs.existsSync(baseDir)) {
                return res.json([]);
            }

            // Read all files from clientLogs
            const files = fs.readdirSync(baseDir);
            const logFiles = [];

            for (const filename of files) {
                // Filter by serial number if provided
                if (serial_number && !filename.startsWith(serial_number)) {
                    continue;
                }

                const filePath = path.join(baseDir, filename);
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isFile()) {
                        logFiles.push({
                            filename: filename,
                            size: stat.size,
                            modified: stat.mtime,
                            type: 'client'
                        });
                    }
                } catch (e) {
                    console.error(`Error reading file stats for ${filename}:`, e);
                }
            }

            // Sort by modified date, newest first
            logFiles.sort((a, b) => new Date(b.modified) - new Date(a.modified));

            res.json(logFiles);
        } catch (e) {
            console.error('Failed to list log files:', e);
            res.status(500).json({ error: 'Failed to list log files' });
        }
    },

    readLogFile: async (req, res) => {
        try {
            const { filename } = req.params;
            const { lines, from } = req.query;

            // Security: prevent path traversal
            if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const baseDir = path.join(__dirname, "..", "clientLogs");
            const filePath = path.join(baseDir, filename);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'Log file not found' });
            }

            // Read file contents
            const content = fs.readFileSync(filePath, 'utf-8');

            // Handle line-based pagination if requested
            if (lines || from) {
                const allLines = content.split('\n');
                const startLine = from ? parseInt(from) : 0;
                const numLines = lines ? parseInt(lines) : allLines.length;
                const selectedLines = allLines.slice(startLine, startLine + numLines);
                return res.type('text/plain').send(selectedLines.join('\n'));
            }

            // Return full content
            res.type('text/plain').send(content);
        } catch (e) {
            console.error('Failed to read log file:', e);
            res.status(500).json({ error: 'Failed to read log file' });
        }
    },
};

module.exports = LogsController;
