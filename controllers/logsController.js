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
                    } catch {}
                }
            } catch {}

            res.sendStatus(200);
        } catch (e) {
            console.error('Failed to save client logs:', e);
            res.status(500).json({ error: 'Failed to save client logs' });
        }
    },
};

module.exports = LogsController;
