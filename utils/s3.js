const {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    GetObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const region = process.env.AWS_REGION || 'ap-south-1';
const bucketName = process.env.AWS_S3_BUCKET_NAME || 'sama-central-resource-hub';

const s3Client = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ? new S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
    })
    : null;

/**
 * Upload buffer to S3
 * @param {string} key - e.g. "afe-feedbacks/screenshots/xyz.png"
 * @param {Buffer} buffer - File buffer
 * @param {string} contentType - e.g. "image/png", "text/plain"
 */
async function uploadToS3(key, buffer, contentType = 'application/octet-stream') {
    if (!s3Client) {
        throw new Error('S3 Client is not initialized. Please verify AWS credentials in .env');
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType
    });

    await s3Client.send(command);
    console.log(`[S3] Successfully uploaded: s3://${bucketName}/${key}`);
    return key;
}

/**
 * Delete a single object from S3
 * @param {string} key - e.g. "afe-feedbacks/screenshots/xyz.png"
 */
async function deleteFromS3(key) {
    if (!s3Client || !key) return false;

    try {
        const cleanKey = key.replace(/^\/+/, '');
        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: cleanKey
        });

        await s3Client.send(command);
        console.log(`[S3] Successfully deleted: s3://${bucketName}/${cleanKey}`);
        return true;
    } catch (err) {
        console.error(`[S3] Error deleting key ${key}:`, err.message);
        return false;
    }
}

/**
 * Delete multiple objects from S3
 * @param {string[]} keys
 */
async function deleteMultipleFromS3(keys) {
    if (!s3Client || !Array.isArray(keys) || keys.length === 0) return 0;

    try {
        const objects = keys.map(k => ({ Key: k.replace(/^\/+/, '') }));
        const command = new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objects }
        });

        const res = await s3Client.send(command);
        const deletedCount = res.Deleted ? res.Deleted.length : 0;
        console.log(`[S3] Deleted ${deletedCount} objects from s3://${bucketName}`);
        return deletedCount;
    } catch (err) {
        console.error('[S3] Error in deleteMultipleFromS3:', err.message);
        return 0;
    }
}

/**
 * Delete old S3 files under a prefix older than maxAgeDays
 * @param {string} prefix - e.g. "afe-feedbacks/"
 * @param {number} maxAgeDays - default 3
 */
async function cleanOldS3Files(prefix = 'afe-feedbacks/', maxAgeDays = 3) {
    if (!s3Client) return 0;

    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - maxAgeMs);
    let totalDeleted = 0;

    try {
        let continuationToken = undefined;

        do {
            const listCommand = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: prefix,
                ContinuationToken: continuationToken
            });

            const listRes = await s3Client.send(listCommand);
            const contents = listRes.Contents || [];

            const keysToDelete = [];
            for (const item of contents) {
                // Ignore directory marker keys
                if (item.Key.endsWith('/')) continue;

                if (item.LastModified && item.LastModified < cutoffDate) {
                    keysToDelete.push(item.Key);
                }
            }

            if (keysToDelete.length > 0) {
                const count = await deleteMultipleFromS3(keysToDelete);
                totalDeleted += count;
            }

            continuationToken = listRes.NextContinuationToken;
        } while (continuationToken);

        if (totalDeleted > 0) {
            console.log(`[S3 Cleanup] Cleaned up ${totalDeleted} expired files under ${prefix} (> ${maxAgeDays} days old)`);
        }
    } catch (err) {
        console.error(`[S3 Cleanup] Error during S3 cleanup under prefix ${prefix}:`, err.message);
    }

    return totalDeleted;
}

/**
 * Generate presigned URL for downloading / viewing an S3 object
 * @param {string} key
 * @param {number} expiresInSeconds
 */
async function getPresignedDownloadUrl(key, expiresInSeconds = 3600) {
    if (!s3Client || !key) return null;

    try {
        const cleanKey = key.replace(/^\/+/, '');
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: cleanKey
        });

        return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    } catch (err) {
        console.error(`[S3] Error generating presigned URL for ${key}:`, err.message);
        return null;
    }
}

module.exports = {
    s3Client,
    bucketName,
    uploadToS3,
    deleteFromS3,
    deleteMultipleFromS3,
    cleanOldS3Files,
    getPresignedDownloadUrl
};
