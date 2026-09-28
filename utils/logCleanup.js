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

const { cleanOldS3Files } = require('./s3');

/**
 * Clean old AFE feedback files (logs and screenshots) older than 3 days from AWS S3 and disk
 */
async function cleanOldAfeFeedbackFiles(maxAgeDays = 3) {
    // 1. Clean S3 bucket objects older than maxAgeDays
    try {
        await cleanOldS3Files('afe-feedbacks/', maxAgeDays);
    } catch (s3Err) {
        console.error('[LogCleanup] Error cleaning S3 feedback files:', s3Err.message);
    }

    // 2. Clean local disk if any legacy files remain
    const feedbackDir = path.join(__dirname, "..", "clientLogs", "afe-feedbacks");
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
        try {
            await fs.access(feedbackDir);
        } catch {
            return;
        }

        const files = await fs.readdir(feedbackDir);
        for (const file of files) {
            const filePath = path.join(feedbackDir, file);
            try {
                const stat = await fs.stat(filePath);
                if (stat.isFile() && (now - stat.mtimeMs > maxAgeMs)) {
                    await fs.unlink(filePath);
                    console.log(`[LogCleanup] Deleted expired feedback file (>3 days old): ${file}`);
                }
            } catch (e) {
                console.error(`[LogCleanup] Error processing feedback file ${file}:`, e.message);
            }
        }
    } catch (error) {
        console.error('[LogCleanup] Error scanning afe-feedbacks directory:', error);
    }
}

// Start daily cleanup task
function scheduleLogCleanup() {
    // Run cleanup immediately on server startup (delayed slightly to avoid startup contention)
    setTimeout(() => {
        console.log('[LogCleanup] Starting startup clientLogs cleanup...');
        cleanOldClientLogs(10).catch(err => console.error('[LogCleanup] Startup cleanup failed:', err));
        cleanOldAfeFeedbackFiles(3).catch(err => console.error('[LogCleanup] Startup feedback files cleanup failed:', err));
    }, 5000);

    // Schedule cleanup to run every 24 hours
    setInterval(() => {
        console.log('[LogCleanup] Starting scheduled clientLogs cleanup...');
        cleanOldClientLogs(10).catch(err => console.error('[LogCleanup] Scheduled cleanup failed:', err));
        cleanOldAfeFeedbackFiles(3).catch(err => console.error('[LogCleanup] Scheduled feedback files cleanup failed:', err));
    }, 24 * 60 * 60 * 1000);
}

module.exports = {
    cleanOldClientLogs,
    cleanOldAfeFeedbackFiles,
    scheduleLogCleanup
};
