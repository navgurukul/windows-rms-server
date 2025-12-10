// drizzle.config.js
require('dotenv').config();

/** @type { import("drizzle-kit").Config } */
module.exports = {
    schema: "./db/schema.js",
    out: "./db/migrations",
    dialect: "postgresql",
    dbCredentials: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: {
            rejectUnauthorized: false
        }
    }
};
