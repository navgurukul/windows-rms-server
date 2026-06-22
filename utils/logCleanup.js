const fs = require('fs').promises;
const path = require('path');

async function cleanOldClientLogs(maxAgeDays = 10) {
    const baseDir = path.join(__dirname, "..", "clientLogs");
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
        // Check if directory exists
        try {
            await fs.access(baseDir);
        } catch {
            return; // Directory doesn't exist yet
        }

        const entries = await fs.readdir(baseDir, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(baseDir, entry.name);

            if (entry.isFile()) {
                // Handle files directly in clientLogs folder
                try {
                    const stat = await fs.stat(entryPath);
                    if (now - stat.mtimeMs > maxAgeMs) {
                        await fs.unlink(entryPath);
                        console.log(`[LogCleanup] Deleted old file: ${entry.name}`);
                    }
                } catch (e) {
                    console.error(`[LogCleanup] Error deleting file ${entry.name}:`, e.message);
                }
            } else if (entry.isDirectory()) {
                // Handle device subdirectories
                try {
                    const files = await fs.readdir(entryPath);
                    for (const file of files) {
                        const filePath = path.join(entryPath, file);
                        try {
                            const stat = await fs.stat(filePath);
                            if (now - stat.mtimeMs > maxAgeMs) {
                                await fs.unlink(filePath);
                                console.log(`[LogCleanup] Deleted old log file: ${entry.name}/${file}`);
                            }
                        } catch (e) {
                            console.error(`[LogCleanup] Error deleting file ${entry.name}/${file}:`, e.message);
                        }
                    }

                    // Check if directory is empty now and remove it
                    const remainingFiles = await fs.readdir(entryPath);
                    if (remainingFiles.length === 0) {
                        await fs.rmdir(entryPath);
                        console.log(`[LogCleanup] Removed empty log directory: ${entry.name}`);
                    }
                } catch (e) {
                    console.error(`[LogCleanup] Error processing directory ${entry.name}:`, e.message);
                }
            }
        }
    } catch (error) {
        console.error('[LogCleanup] Error scanning clientLogs:', error);
    }
}

// Start daily cleanup task
function scheduleLogCleanup() {
    // Run cleanup immediately on server startup (delayed slightly to avoid startup contention)
    setTimeout(() => {
        console.log('[LogCleanup] Starting startup clientLogs cleanup...');
        cleanOldClientLogs(10).catch(err => console.error('[LogCleanup] Startup cleanup failed:', err));
    }, 5000);

    // Schedule cleanup to run every 24 hours
    setInterval(() => {
        console.log('[LogCleanup] Starting scheduled clientLogs cleanup...');
        cleanOldClientLogs(10).catch(err => console.error('[LogCleanup] Scheduled cleanup failed:', err));
    }, 24 * 60 * 60 * 1000);
}

module.exports = {
    cleanOldClientLogs,
    scheduleLogCleanup
};
