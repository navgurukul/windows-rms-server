const fs = require('fs');
const path = require('path');

const LogsController = {
    uploadLogs: async (req, res) => {
        try {
            const { deviceId, serial_number, timestamp, logs } = req.body;
            const serial = serial_number || deviceId || 'UNKNOWN';
            const ts = timestamp || new Date().toISOString();

            // Sanitize serial number for directory name: replace slashes with hyphens
            const safeSerial = String(serial).replace(/[\/\\]/g, '-');

            // Base directory for client logs
            const baseDir = path.join(__dirname, "..", "clientLogs");
            
            // Serial-specific directory
            const serialDir = path.join(baseDir, safeSerial);
            fs.mkdirSync(serialDir, { recursive: true });

            // Build date-wise filename: YYYY_MM_DD.txt
            const d = new Date(ts);
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            const datePart = `${yyyy}_${mm}_${dd}`;
            const filename = `${datePart}.txt`;
            const filePath = path.join(serialDir, filename);

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
                const dirs = fs.readdirSync(baseDir);
                for (const dirName of dirs) {
                    const serialDir = path.join(baseDir, dirName);
                    if (!fs.statSync(serialDir).isDirectory()) {
                        // Handle legacy files in base directory
                        const stat = fs.statSync(serialDir);
                        if (now - stat.mtimeMs > maxAgeMs) {
                            fs.unlinkSync(serialDir);
                        }
                        continue;
                    }

                    const files = fs.readdirSync(serialDir);
                    for (const f of files) {
                        const full = path.join(serialDir, f);
                        try {
                            const stat = fs.statSync(full);
                            if (now - stat.mtimeMs > maxAgeMs) {
                                fs.unlinkSync(full);
                            }
                        } catch { }
                    }
                    
                    // Optional: remove empty directories
                    try {
                        if (fs.readdirSync(serialDir).length === 0) {
                            fs.rmdirSync(serialDir);
                        }
                    } catch {}
                }
            } catch (retentionError) {
                console.error('Retention error:', retentionError);
            }

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

            if (!fs.existsSync(baseDir)) {
                return res.json([]);
            }

            const logFiles = [];
            const dirs = fs.readdirSync(baseDir);

            for (const dirName of dirs) {
                const serialDir = path.join(baseDir, dirName);
                if (!fs.statSync(serialDir).isDirectory()) continue;

                // Reconstruct the "virtual" serial number if it was sanitized
                // We use the directory name as-is, but the client might expect slashes.
                // However, the most consistent way is to just list everything and let the client filter.
                // If serial_number query param is provided, we should match it (even with slashes).
                if (serial_number) {
                    const sanitizedQuery = String(serial_number).replace(/[\/\\]/g, '-');
                    if (dirName !== sanitizedQuery) continue;
                }

                const files = fs.readdirSync(serialDir);
                for (const filename of files) {
                    const filePath = path.join(serialDir, filename);
                    try {
                        const stat = fs.statSync(filePath);
                        if (stat.isFile()) {
                            // Virtual filename: <serial>/<filename>
                            // If the serial originally had slashes, we should probably restore them here 
                            // to match what the client expects. But our directory name has hyphens.
                            // The user said: "changing the name can cause issues".
                            // So we should return the path using the ORIGINAL serial number if possible.
                            // For simplicity, let's assume the "slash-version" of the directory name is what they want.
                            // But wait, the directory is hyphenated. 
                            // Let's use the actual serial number if we can find it, or just use the slash-restored version.
                            // Actually, let's use the hyphenated directory name but call it a "path".
                            
                            // Re-calculate the "handle" based on original slashes if requested
                            const handle = serial_number ? `${serial_number}/${filename}` : `${dirName}/${filename}`;

                            logFiles.push({
                                filename: handle,
                                size: stat.size,
                                modified: stat.mtime,
                                type: 'client'
                            });
                        }
                    } catch (e) {
                        console.error(`Error reading file stats for ${filename}:`, e);
                    }
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

            // filename will be like "serialA/serialB/2026_02_17.txt"
            if (!filename || filename.includes('..')) {
                return res.status(400).json({ error: 'Invalid filename' });
            }

            const parts = filename.split('/');
            if (parts.length < 2) {
                return res.status(400).json({ error: 'Invalid log path format' });
            }

            const dateFile = parts.pop();
            const serialPart = parts.join('/');
            const safeSerial = serialPart.replace(/[\/\\]/g, '-');

            const baseDir = path.join(__dirname, "..", "clientLogs");
            const filePath = path.join(baseDir, safeSerial, dateFile);

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
