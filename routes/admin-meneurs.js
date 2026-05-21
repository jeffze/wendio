'use strict';
// Routes /api/admin/meneurs/* — gestion des meneurs par un admin.
// Toutes les operations sont scopees au tenant de l'admin connecte.

const express = require('express');
const db = require('../db');
const auth = require('../auth');

const router = express.Router();

const MAX_EMAIL = 254;
const MAX_NAME = 80;

function clean(s, max) { return String(s ?? '').trim().slice(0, max); }

function tenantId(req) {
  // Si l'admin a un tenant_id en DB, c'est celui-la qui prime (defense in depth).
  // Le req.tenant vient du hostname et peut ne pas matcher en cas de bricolage.
  return req.user.tenant_id;
}

function countAdmins(tid) {
  return db.prepare(`SELECT COUNT(*) AS n FROM meneurs WHERE tenant_id = ? AND role = 'admin'`).get(tid).n;
}

// === GET /api/admin/meneurs — liste les meneurs du tenant ===
router.get('/', (req, res) => {
  const tid = tenantId(req);
  if (!tid) return res.status(400).json({ error: 'no_tenant_for_user' });
  const meneurs = db.prepare(`
    SELECT id, email, name, role, created_at, last_login_at
    FROM meneurs
    WHERE tenant_id = ?
    ORDER BY (role = 'admin') DESC, email COLLATE NOCASE
  `).all(tid);
  res.json({ meneurs, currentUserId: req.user.id });
});

// === POST /api/admin/meneurs — ajouter un meneur ===
router.post('/', (req, res) => {
  const tid = tenantId(req);
  if (!tid) return res.status(400).json({ error: 'no_tenant_for_user' });

  const email = auth.normEmail(req.body?.email);
  const name = clean(req.body?.name, MAX_NAME) || null;
  const role = req.body?.role === 'admin' ? 'admin' : 'meneur';

  if (!auth.isValidEmail(email)) return res.status(400).json({ error: 'invalid_email' });

  // Email global unique (les anciens meneurs sans tenant pourraient deja exister)
  const existing = db.prepare(`SELECT id, tenant_id, role FROM meneurs WHERE email = ?`).get(email);
  if (existing) {
    if (existing.tenant_id === tid) {
      return res.status(409).json({ error: 'email_already_in_tenant' });
    }
    // Email existe dans un autre tenant — refuser silencieusement (anti-leak inter-tenant)
    return res.status(409).json({ error: 'email_already_exists' });
  }

  const info = db.prepare(`
    INSERT INTO meneurs (email, name, role, tenant_id)
    VALUES (?, ?, ?, ?)
  `).run(email, name, role, tid);

  const meneur = db.prepare(`
    SELECT id, email, name, role, created_at, last_login_at
    FROM meneurs WHERE id = ?
  `).get(info.lastInsertRowid);

  res.status(201).json({ meneur });
});

// === PATCH /api/admin/meneurs/:id/role — promouvoir/retrograder ===
router.patch('/:id/role', (req, res) => {
  const tid = tenantId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

  const newRole = req.body?.role;
  if (newRole !== 'admin' && newRole !== 'meneur') {
    return res.status(400).json({ error: 'invalid_role' });
  }

  const target = db.prepare(`SELECT id, tenant_id, role FROM meneurs WHERE id = ?`).get(id);
  if (!target || target.tenant_id !== tid) return res.status(404).json({ error: 'not_found' });

  // Garde-fou : impossible de se retrograder soi-meme (eviter de se locker dehors)
  if (target.id === req.user.id && newRole !== 'admin') {
    return res.status(400).json({ error: 'cannot_demote_self' });
  }

  // Garde-fou : impossible de retrograder le dernier admin
  if (target.role === 'admin' && newRole === 'meneur' && countAdmins(tid) <= 1) {
    return res.status(400).json({ error: 'cannot_demote_last_admin' });
  }

  if (target.role === newRole) return res.json({ ok: true, unchanged: true });

  db.prepare(`UPDATE meneurs SET role = ? WHERE id = ?`).run(newRole, id);
  res.json({ ok: true });
});

// === DELETE /api/admin/meneurs/:id ===
router.delete('/:id', (req, res) => {
  const tid = tenantId(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'invalid_id' });

  const target = db.prepare(`SELECT id, tenant_id, role FROM meneurs WHERE id = ?`).get(id);
  if (!target || target.tenant_id !== tid) return res.status(404).json({ error: 'not_found' });

  if (target.id === req.user.id) return res.status(400).json({ error: 'cannot_delete_self' });
  if (target.role === 'admin' && countAdmins(tid) <= 1) {
    return res.status(400).json({ error: 'cannot_delete_last_admin' });
  }

  // Sessions ON DELETE CASCADE supprime aussi ses sessions actives.
  db.prepare(`DELETE FROM meneurs WHERE id = ?`).run(id);
  res.json({ ok: true });
});

module.exports = router;
