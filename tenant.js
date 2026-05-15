'use strict';
// Wendio — middleware multi-tenant. Détermine le tenant courant à partir
// du hostname de la requête. Stratégie de lookup :
//   1. Hostname complet présent dans tenants.hostnames (liste CSV) → match exact
//      (utilisé pour wendio.jeuxlirlok.com qui pointe sur le tenant wendat)
//   2. Premier segment du hostname comme slug → match par tenants.slug
//      (utilisé pour wendat.wendio.app, cree.wendio.app, etc.)
//   3. Aucun match → req.tenant reste null
//
// Surcharge dev : en NODE_ENV != production, on accepte un header
// X-Tenant-Slug pour tester sans config DNS locale.

const db = require('./db');

const stmtByHostname = db.prepare(`
  SELECT * FROM tenants
  WHERE active = 1
    AND hostnames IS NOT NULL
    AND (',' || lower(hostnames) || ',') LIKE ('%,' || lower(?) || ',%')
  LIMIT 1
`);

const stmtBySlug = db.prepare(`
  SELECT * FROM tenants WHERE active = 1 AND slug = ? LIMIT 1
`);

function lookupTenant(hostname) {
  if (!hostname) return null;
  const h = String(hostname).toLowerCase();

  // 1. Hostname complet
  let t = stmtByHostname.get(h);
  if (t) return t;

  // 2. Premier segment du hostname (sous-domaine)
  const parts = h.split('.');
  if (parts.length < 2) return null;
  let slug = parts[0];
  if (slug === 'www') slug = parts[1];
  // Ignorer IP
  if (/^\d+$/.test(slug)) return null;

  return stmtBySlug.get(slug) || null;
}

function attachTenant(req, _res, next) {
  // Dev override : header X-Tenant-Slug autorisé en non-prod
  let slug = null;
  if (process.env.NODE_ENV !== 'production') {
    const override = req.get('X-Tenant-Slug');
    if (override) slug = override.trim().toLowerCase();
  }
  if (slug) {
    req.tenant = stmtBySlug.get(slug) || null;
  } else {
    req.tenant = lookupTenant(req.hostname);
  }
  next();
}

// Renvoie une page d'erreur sobre quand un visiteur arrive sur un sous-domaine
// non reconnu (ex: typo, ancien lien, nation pas encore onboardée).
function renderTenantNotFound(hostname) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Communauté introuvable</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;900&family=Inter:wght@400;500&display=swap">
<style>
body{margin:0;background:#1a1008;background-image:radial-gradient(ellipse 100% 50% at 50% 0%,#2a1808 0%,#1a1008 65%);color:#f4e7d3;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{background:#2c1a0e;border:1px solid rgba(244,231,211,.10);padding:40px 36px;border-radius:14px;max-width:440px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.5)}
.label{font-family:'Cinzel',serif;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#8a5c2a;margin-bottom:10px}
h1{margin:0 0 14px;font-family:'Cinzel',Georgia,serif;font-size:24px;font-weight:900;background:linear-gradient(135deg,#d35400 0%,#f39c12 50%,#d35400 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
p{margin:0 0 14px;color:#b89978;line-height:1.6}
code{font-family:ui-monospace,SF Mono,Menlo,monospace;background:rgba(0,0,0,.3);padding:2px 8px;border-radius:4px;color:#e8a85a;font-size:.92em}
a{color:#e8a85a;text-decoration:none;font-weight:500}
a:hover{color:#f39c12;text-decoration:underline}
.small{font-size:.86rem;opacity:.75}
</style></head>
<body><div class="card">
<div class="label">WENDIO · Feu de conseil</div>
<h1>Communauté introuvable</h1>
<p>Le sous-domaine <code>${esc(hostname || '')}</code> ne correspond à aucune communauté inscrite.</p>
<p class="small">Si tu es animateur ou membre d'une Première Nation qui souhaite utiliser WENDIO pour sa langue, contacte <a href="mailto:jfzahnen@gmail.com">jfzahnen@gmail.com</a>.</p>
</div></body></html>`;
}

module.exports = { attachTenant, lookupTenant, renderTenantNotFound };
