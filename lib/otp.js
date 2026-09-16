const crypto = require("crypto");
const db = require("../db/database");

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

function hashCode(code, email) {
  // Salt with the email so two identical codes for different addresses
  // never collide in storage.
  return crypto
    .createHash("sha256")
    .update(`${email.toLowerCase()}:${code}:${process.env.SESSION_SECRET || ""}`)
    .digest("hex");
}

function generateOtp(email) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  const codeHash = hashCode(code, email);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  // Invalidate any earlier unconsumed codes for this email+purpose so only
  // the newest one is valid.
  db.prepare(
    `UPDATE otp_codes SET consumed = 1 WHERE email = ? AND purpose = 'vote' AND consumed = 0`
  ).run(email.toLowerCase());

  db.prepare(
    `INSERT INTO otp_codes (email, code_hash, purpose, expires_at) VALUES (?, ?, 'vote', ?)`
  ).run(email.toLowerCase(), codeHash, expiresAt);

  return { code, expiresAt };
}

/**
 * Returns one of: 'ok' | 'invalid' | 'expired' | 'too_many_attempts' | 'not_found'
 */
function verifyOtp(email, submittedCode) {
  const row = db
    .prepare(
      `SELECT * FROM otp_codes WHERE email = ? AND purpose = 'vote' AND consumed = 0
       ORDER BY id DESC LIMIT 1`
    )
    .get(email.toLowerCase());

  if (!row) return "not_found";

  if (row.attempts >= MAX_ATTEMPTS) {
    return "too_many_attempts";
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return "expired";
  }

  const submittedHash = hashCode(submittedCode, email);
  const match =
    submittedHash.length === row.code_hash.length &&
    crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(row.code_hash));

  if (!match) {
    db.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).run(row.id);
    return "invalid";
  }

  db.prepare(`UPDATE otp_codes SET consumed = 1 WHERE id = ?`).run(row.id);
  return "ok";
}

module.exports = { generateOtp, verifyOtp, OTP_TTL_MINUTES };
