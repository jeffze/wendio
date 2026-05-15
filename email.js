'use strict';
// Wendio — email magic link (Resend), même esthétique que Support.

const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || 'noreply@jeuxlirlok.com';
const fromName = process.env.EMAIL_FROM_NAME || 'WENDIO · Jeux Lirlok';
const FROM = `${fromName} <${fromAddress}>`;

const client = apiKey ? new Resend(apiKey) : null;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function send({ to, subject, html }) {
  if (!to) return { skipped: 'no-recipient' };
  if (!client) {
    console.log('[email:dev]', { to, subject, text: stripHtml(html) });
    return { skipped: 'no-api-key' };
  }
  try {
    const r = await client.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject, html,
      text: stripHtml(html),
    });
    if (r.error) console.error('[email] resend error', r.error);
    return r;
  } catch (err) {
    console.error('[email] send failed', err);
    return { error: err.message };
  }
}

const C = {
  bg: '#1a1008', surface: '#221710', text: '#f4e7d3',
  amber: '#c8843a', emberLt: '#f39c12', ember: '#d35400',
  inkSoft: '#b89978', muted: '#7a5a3a', line: '#3e2510',
};

function shell({ title, body, ctaUrl, ctaLabel }) {
  const cta = ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0">
         <tr><td style="border-radius:8px;background:${C.ember};">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:13px 26px;font-family:'Cinzel',Georgia,serif;font-size:14px;font-weight:600;letter-spacing:.06em;color:#1a0e02;text-decoration:none;border-radius:8px;background:linear-gradient(135deg,${C.emberLt} 0%,${C.ember} 100%);">${escapeHtml(ctaLabel || 'Continuer')}</a>
         </td></tr>
       </table>`
    : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:${C.text};line-height:1.55">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${C.bg};padding:40px 16px">
  <tr><td align="center">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;width:100%">
      <tr><td style="padding:0 0 14px 8px">
        <span style="font-family:'Cinzel',Georgia,serif;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${C.amber}">WENDIO · Feu de conseil</span>
      </td></tr>
      <tr><td style="background:${C.surface};border:1px solid ${C.line};border-radius:14px;padding:32px;box-shadow:0 4px 20px rgba(0,0,0,.4)">
        <h1 style="margin:0 0 14px;font-family:'Cinzel',Georgia,serif;font-size:22px;font-weight:600;color:${C.text};letter-spacing:.02em">${escapeHtml(title)}</h1>
        ${body}
        ${cta}
      </td></tr>
      <tr><td style="padding:18px 8px 0;color:${C.muted};font-size:12px;line-height:1.5">
        WENDIO · <a href="${escapeHtml(process.env.PUBLIC_URL || 'https://wendio.jeuxlirlok.com')}" style="color:${C.amber}">${escapeHtml((process.env.PUBLIC_URL || 'https://wendio.jeuxlirlok.com').replace(/^https?:\/\//, ''))}</a>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function p(text) { return `<p style="margin:0 0 12px;color:${C.inkSoft};font-size:15px;line-height:1.6">${text}</p>`; }

function sendMagicLink({ to, link }) {
  const body = p('Bonjour,') +
    p('Voici ton lien pour te connecter à WENDIO comme meneur. Il expire dans <strong>15 minutes</strong> et ne fonctionne qu\'une seule fois.') +
    p(`<span style="color:${C.muted}">Si tu n'as pas demandé cette connexion, ignore ce courriel.</span>`);
  return send({
    to,
    subject: 'Ton lien de connexion · WENDIO',
    html: shell({ title: 'Connexion meneur', body, ctaUrl: link, ctaLabel: 'Se connecter' }),
  });
}

module.exports = { send, sendMagicLink };
