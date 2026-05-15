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
  `CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL COLLATE NOCASE,
    nom_officiel TEXT NOT NULL,
    langue_label TEXT NOT NULL,
    hostnames TEXT,
    branding_json TEXT,
    contact_email TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'trial', 'suspended', 'expired')),
    subscription_until TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
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

// === Migrations idempotentes ===

function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${ddl}`).run();
  }
}

ensureColumn('meneurs', 'tenant_id', 'tenant_id INTEGER');
db.prepare(`CREATE INDEX IF NOT EXISTS idx_meneurs_tenant ON meneurs(tenant_id)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug) WHERE active = 1`).run();

function seed() {
  // Seed du tenant par défaut (wendat) — création initiale si DB vide.
  // Hostname wendio.jeuxlirlok.com est listé pour rétrocompat avec le déploiement actuel.
  const tenantCount = db.prepare('SELECT COUNT(*) AS n FROM tenants').get().n;
  let defaultTenantId = null;
  if (tenantCount === 0) {
    const info = db.prepare(`
      INSERT INTO tenants (slug, nom_officiel, langue_label, hostnames, contact_email, subscription_status)
      VALUES ('wendat', 'Nation Wendat', 'Wendat', 'wendio.jeuxlirlok.com,wendat.wendio.app', ?, 'active')
    `).run(process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || null);
    defaultTenantId = info.lastInsertRowid;
    // Attribue les meneurs déjà existants à ce tenant (migration legacy)
    db.prepare(`UPDATE meneurs SET tenant_id = ? WHERE tenant_id IS NULL`).run(defaultTenantId);
  } else {
    // Si la table existe déjà, on récupère l'id du tenant wendat pour les seeds admin
    const r = db.prepare(`SELECT id FROM tenants WHERE slug = 'wendat'`).get();
    defaultTenantId = r ? r.id : null;
  }

  // Seed des admins (ADMIN_EMAILS env var) — créés/promus dans le tenant par défaut
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  if (defaultTenantId) {
    const upsertAdmin = db.prepare(`
      INSERT INTO meneurs (email, role, tenant_id) VALUES (?, 'admin', ?)
      ON CONFLICT(email) DO UPDATE SET role = 'admin', tenant_id = COALESCE(tenant_id, excluded.tenant_id)
    `);
    for (const email of adminEmails) upsertAdmin.run(email, defaultTenantId);
  }
}
seed();

function cleanupExpired() {
  db.prepare(`DELETE FROM magic_tokens WHERE expires_at < datetime('now', '-1 day')`).run();
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
}
cleanupExpired();
setInterval(cleanupExpired, 60 * 60 * 1000).unref();

module.exports = db;
