const nodemailer = require("nodemailer");
require("dotenv").config();

// ─── Create reusable SMTP transporter ───────────────────────────────
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports (STARTTLS)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Verify connection on startup (logs result, does not block)
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email transporter verification failed:", error.message);
    } else {
        console.log("✅ Email transporter is ready to send messages");
    }
});

// ─── Global send-email function ─────────────────────────────────────
/**
 * Send an email to a recipient.
 *
 * @param {string}  to       - Recipient email address (e.g. "user@example.com")
 * @param {string}  subject  - Email subject line
 * @param {string}  body     - Email body (supports HTML)
 * @returns {Promise<object>} - Nodemailer send result (includes messageId, etc.)
 */

const sendEmail = async (to, subject, body) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_USER, // sender address
            to,                           // recipient(s) — comma-separated string or array
            subject,                      // subject line
            html: body,                   // html body (plain text fallback below)
            text: body.replace(/<[^>]*>/g, ""), // auto-strip HTML tags for plain-text version
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to} — Message ID: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`❌ Failed to send email to ${to}:`, error.message);
        throw error;
    }
};

module.exports = { sendEmail };
