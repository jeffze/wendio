'use strict';
// Wendio — DB SQLite (node:sqlite builtin) pour l'authentification meneur.
// Stockage minimal : meneurs (utilisateurs autorisés), magic_tokens, sessions.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'wendio.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);

function runRaw(sql) { db.prepare(sql).run(); }

runRaw('PRAGMA journal_mode = WAL');
runRaw('PRAGMA foreign_keys = ON');

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS meneurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'meneur' CHECK (role IN ('admin', 'meneur')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS magic_tokens (
    token TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE,
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES meneurs(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_magic_email ON magic_tokens(email)`,
];

for (const stmt of STATEMENTS) db.prepare(stmt).run();

function seed() {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const upsertAdmin = db.prepare(`
    INSERT INTO meneurs (email, role) VALUES (?, 'admin')
    ON CONFLICT(email) DO UPDATE SET role = 'admin'
  `);
  for (const email of adminEmails) upsertAdmin.run(email);
}
seed();

function cleanupExpired() {
  db.prepare(`DELETE FROM magic_tokens WHERE expires_at < datetime('now', '-1 day')`).run();
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
}
cleanupExpired();
setInterval(cleanupExpired, 60 * 60 * 1000).unref();

module.exports = db;
