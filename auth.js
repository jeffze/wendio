'use strict';
// Wendio — Auth meneur via magic link (calqué sur D:/Support/auth.js).

const crypto = require('crypto');
const db = require('./db');

const MAGIC_TTL_MIN = 15;
const SESSION_TTL_DAYS = 30;
const SESSION_COOKIE = 'mid'; // meneur id

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normEmail(email) { return String(email || '').trim().toLowerCase(); }

function isValidEmail(email) {
  const e = normEmail(email);
  return e.length > 0 && e.length <= 254 && EMAIL_RE.test(e);
}

function createMagicToken(email, { ip, userAgent } = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  // expires_at stocké au format SQLite (datetime('now', '+N minutes')) pour que la
  // comparaison `expires_at > datetime('now')` soit correcte. Un ISO toISOString()
  // ('2026-...T..Z') se comparait lexicographiquement au format SQLite ('2026-... ..')
  // et le 'T' > ' ' faisait que le TTL ne se déclenchait jamais dans la même journée.
  db.prepare(
    `INSERT INTO magic_tokens (token, email, expires_at, ip, user_agent)
     VALUES (?, ?, datetime('now', ?), ?, ?)`
  ).run(token, email, `+${MAGIC_TTL_MIN} minutes`, ip || null, userAgent || null);
  return token;
}

// Valide un jeton SANS le consommer (jeton non consommé + non expiré).
// Utilisé par le GET /auth/verify pour afficher un écran de confirmation :
// les scanners d'email institutionnels (Microsoft Safe Links, etc.) pré-ouvrent
// le lien en GET et consommeraient un jeton à usage unique avant que l'humain
// ne clique. On ne consomme donc qu'au POST de confirmation (ticket #38).
function peekMagicToken(token) {
  if (!token) return null;
  return db
    .prepare(
      `SELECT * FROM magic_tokens
       WHERE token = ? AND consumed_at IS NULL AND expires_at > datetime('now')`
    )
    .get(token) || null;
}

function consumeMagicToken(token) {
  const row = db
    .prepare(
      `SELECT * FROM magic_tokens
       WHERE token = ? AND consumed_at IS NULL AND expires_at > datetime('now')`
    )
    .get(token);
  if (!row) return null;
  db.prepare(`UPDATE magic_tokens SET consumed_at = datetime('now') WHERE token = ?`).run(token);
  return row;
}

function getUser(email, tenantId) {
  if (tenantId) {
    return db.prepare(`SELECT * FROM meneurs WHERE email = ? AND tenant_id = ?`).get(email, tenantId);
  }
  // Fallback : sans tenant (compat avec les anciennes routes qui ne passaient pas le tenant)
  return db.prepare(`SELECT * FROM meneurs WHERE email = ?`).get(email);
}

function touchLastLogin(userId) {
  db.prepare(`UPDATE meneurs SET last_login_at = datetime('now') WHERE id = ?`).run(userId);
}

function createSession(userId, { ip, userAgent } = {}) {
  const id = crypto.randomBytes(32).toString('hex');
  // Même correctif de format que createMagicToken : expires_at en datetime SQLite
  // pour que `expires_at > datetime('now')` (getSessionUser) compare correctement.
  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at, ip, user_agent)
     VALUES (?, ?, datetime('now', ?), ?, ?)`
  ).run(id, userId, `+${SESSION_TTL_DAYS} days`, ip || null, userAgent || null);
  return { id };
}

function getSessionUser(sessionId) {
  if (!sessionId) return null;
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN meneurs u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .get(sessionId);
  return row || null;
}

function destroySession(sessionId) {
  if (!sessionId) return;
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(sessionId);
}

// === Middleware Express ===

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function attachUser(req, _res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[SESSION_COOKIE];
  const u = getSessionUser(sid);
  // Isolation cross-tenant : un cookie d'un autre tenant ne donne pas accès
  // (en pratique le navigateur ne devrait jamais l'envoyer car cookies scopés
  // au sous-domaine, mais defense in depth si quelqu'un bricole les cookies).
  if (u && req.tenant && u.tenant_id && u.tenant_id !== req.tenant.id) {
    req.user = null;
    req.sessionId = null;
  } else {
    req.user = u;
    req.sessionId = u ? sid : null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  // Pour les requêtes API (JSON), 401 ; pour les requêtes HTML, redirect /login?next=
  const accepts = req.get('Accept') || '';
  if (accepts.includes('application/json') || req.path.startsWith('/auth/')) {
    return res.status(401).json({ error: 'auth_required' });
  }
  const next_ = encodeURIComponent(req.originalUrl);
  res.redirect('/login?next=' + next_);
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'auth_required' });
  if (req.user.role !== 'admin') {
    const accepts = req.get('Accept') || '';
    if (accepts.includes('application/json')) {
      return res.status(403).json({ error: 'admin_required' });
    }
    return res.status(403).type('html').send('<h1>403 — Accès admin requis</h1><p><a href="/lobby.html">← Retour</a></p>');
  }
  next();
}

function cookieOptions() {
  const prod = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: prod,
    sameSite: 'Lax',
    maxAge: SESSION_TTL_DAYS * 86400 * 1000,
    path: '/',
  };
}

function serializeCookie(name, value, opts) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge) parts.push(`Max-Age=${Math.floor(opts.maxAge / 1000)}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

module.exports = {
  SESSION_COOKIE,
  normEmail,
  isValidEmail,
  createMagicToken,
  peekMagicToken,
  consumeMagicToken,
  getUser,
  touchLastLogin,
  createSession,
  getSessionUser,
  destroySession,
  attachUser,
  requireAuth,
  requireAdmin,
  cookieOptions,
  serializeCookie,
  parseCookies,
};
