/**
 * Run with: npm run create-admin
 * Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from .env and creates (or
 * updates) that admin account. Safe to re-run any time you want to change
 * the admin password — see README "How to change the admin account".
 */
require("dotenv").config();
const db = require("../db/database");
const { hashPassword } = require("../lib/password");

const name = process.env.ADMIN_NAME;
const email = (process.env.ADMIN_EMAIL || "").toLowerCase();
const passwordPlain = process.env.ADMIN_PASSWORD;

if (!name || !email || !passwordPlain) {
  console.error(
    "Missing ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD in your .env file. See .env.example."
  );
  process.exit(1);
}

if (passwordPlain.length < 8) {
  console.error("ADMIN_PASSWORD should be at least 8 characters.");
  process.exit(1);
}

const passwordHash = hashPassword(passwordPlain);
const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);

if (existing) {
  db.prepare(
    `UPDATE users SET name = ?, role = 'admin', password_hash = ?, is_verified = 1 WHERE id = ?`
  ).run(name, passwordHash, existing.id);
  console.log(`Updated existing account (${email}) to admin with the new password.`);
} else {
  db.prepare(
    `INSERT INTO users (name, email, role, password_hash, is_verified) VALUES (?, ?, 'admin', ?, 1)`
  ).run(name, email, passwordHash);
  console.log(`Created admin account: ${email}`);
}

console.log("You can now log in at /admin/login with this email and password.");
