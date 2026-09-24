/**
 * Database bootstrap.
 * Uses better-sqlite3: a single-file, persistent, synchronous SQLite driver.
 * The .db file lives in /data (outside /public and /uploads) so it survives
 * restarts and is never served as a static file by accident.
 */
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "ganpati-agman.db");
const dirToEnsure = path.dirname(DB_PATH);
if (!fs.existsSync(dirToEnsure)) fs.mkdirSync(dirToEnsure, { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    college_id    TEXT,
    email         TEXT NOT NULL UNIQUE,
    role          TEXT NOT NULL DEFAULT 'participant', -- participant | voter | admin
    password_hash TEXT,                                -- only set for admin accounts
    is_verified   INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_code TEXT NOT NULL UNIQUE,
    user_id         INTEGER REFERENCES users(id),
    name            TEXT NOT NULL,
    college_id      TEXT NOT NULL,
    email           TEXT NOT NULL,
    category        TEXT NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    file_paths      TEXT NOT NULL DEFAULT '[]', -- JSON array of {path, originalName, mime, size}
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    admin_note      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_submissions_category ON submissions(category);
  CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
  CREATE INDEX IF NOT EXISTS idx_submissions_email ON submissions(email);

  CREATE TABLE IF NOT EXISTS votes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    voter_email   TEXT NOT NULL,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    category      TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Default rule: one vote per voter per category. This unique index is what
  -- makes duplicate votes physically impossible at the database level, even
  -- if the frontend were bypassed entirely. See README "Changing the voting
  -- rule" before altering this.
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_vote_per_category
    ON votes(voter_email, category);

  CREATE TABLE IF NOT EXISTS otp_codes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT NOT NULL,
    code_hash   TEXT NOT NULL,
    purpose     TEXT NOT NULL DEFAULT 'vote',
    expires_at  TEXT NOT NULL,
    consumed    INTEGER NOT NULL DEFAULT 0,
    attempts    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email);

  -- Only ever populated when SMTP is not configured, so organizers can test
  -- the full voting flow locally before real email is set up.
  CREATE TABLE IF NOT EXISTS dev_mail_outbox (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email   TEXT NOT NULL,
    subject    TEXT NOT NULL,
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

module.exports = db;
