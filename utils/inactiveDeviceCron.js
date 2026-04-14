const cron = require('node-cron');
const { sendEmail } = require('../helper/emailHelper');

const DEFAULT_CRON = '0 2 * * *'; // Daily at 02:00
const DEFAULT_INACTIVE_DAYS = 15;
const MAX_DEVICE_ROWS = 200;

const buildEmailLogInsert = (devices, recipients, inactiveDays) => {
    const values = [];
    const params = [];
    let index = 1;

    for (const device of devices) {
        for (const recipient of recipients) {
            values.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3})`);
            params.push(device.device_id, device.last_active_at, recipient, inactiveDays);
            index += 4;
        }
    }

    if (values.length === 0) {
        return null;
    }

    return {
        text: `
            INSERT INTO email_logs (device_id, last_active_at, recipient_email, inactive_days)
            VALUES ${values.join(', ')}
        `,
        params
    };
};

const buildEmailHtml = (devices, totalCount, inactiveDays) => {
    const rows = devices
        .map(
            (row) => `<tr><td>${row.device_id}</td><td>${row.last_active_at}</td></tr>`
        )
        .join('');

    const extraNote = totalCount > devices.length
        ? `<p>Showing first ${devices.length} devices of ${totalCount} total.</p>`
        : '';

    return `
        <p>Inactive devices for more than ${inactiveDays} days: ${totalCount}</p>
        ${extraNote}
        <table border="1" cellpadding="6" cellspacing="0">
            <thead>
                <tr><th>Device ID</th><th>Last Active At</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
};

const startInactiveDeviceCron = (pool) => {
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

    if (adminEmails.length === 0) {
        console.warn('Inactive device cron not started: ADMIN_EMAILS is empty');
        return;
    }

    const inactiveDays = Number(process.env.INACTIVE_DEVICE_DAYS || DEFAULT_INACTIVE_DAYS);
    const cronExpr = process.env.INACTIVE_DEVICE_CRON || DEFAULT_CRON;
    const timezone = process.env.CRON_TIMEZONE;

    if (!cron.validate(cronExpr)) {
        console.error(`Invalid INACTIVE_DEVICE_CRON expression: ${cronExpr}`);
        return;
    }

    const scheduleOptions = timezone ? { timezone } : undefined;

    cron.schedule(
        cronExpr,
        async () => {
            try {
                const countQuery = `
                    WITH latest AS (
                        SELECT DISTINCT ON (device_id)
                               device_id,
                               timestamp AS last_active_at
                        FROM laptop_tracking
                        ORDER BY device_id, timestamp DESC
                    )
                    SELECT COUNT(*)::int AS total_count
                    FROM latest l
                    LEFT JOIN email_logs el
                        ON el.device_id = l.device_id
                        AND el.last_active_at = l.last_active_at
                    WHERE l.last_active_at < NOW() - ($1 * INTERVAL '1 day')
                        AND el.id IS NULL;
                `;

                const countResult = await pool.query(countQuery, [inactiveDays]);
                const totalCount = countResult.rows[0]?.total_count || 0;

                if (totalCount === 0) {
                    console.log('Inactive device cron: no inactive devices found');
                    return;
                }

                const dataQuery = `
                    WITH latest AS (
                        SELECT DISTINCT ON (device_id)
                               device_id,
                               timestamp AS last_active_at
                        FROM laptop_tracking
                        ORDER BY device_id, timestamp DESC
                    )
                    SELECT l.device_id, l.last_active_at
                    FROM latest l
                    LEFT JOIN email_logs el
                        ON el.device_id = l.device_id
                        AND el.last_active_at = l.last_active_at
                    WHERE l.last_active_at < NOW() - ($1 * INTERVAL '1 day')
                        AND el.id IS NULL
                    ORDER BY l.last_active_at ASC
                    LIMIT $2;
                `;

                const dataResult = await pool.query(dataQuery, [inactiveDays, MAX_DEVICE_ROWS]);

                const subject = `Inactive devices report (${inactiveDays}+ days)`;
                const html = buildEmailHtml(dataResult.rows, totalCount, inactiveDays);

                await sendEmail(adminEmails, subject, html);

                const insertLog = buildEmailLogInsert(dataResult.rows, adminEmails, inactiveDays);
                if (insertLog) {
                    await pool.query(insertLog.text, insertLog.params);
                }

                console.log(`Inactive device cron: emailed ${adminEmails.length} admin(s)`);
            } catch (error) {
                console.error('Inactive device cron failed:', error);
            }
        },
        scheduleOptions
    );

    console.log(`Inactive device cron scheduled: ${cronExpr}`);
};

module.exports = { startInactiveDeviceCron };
