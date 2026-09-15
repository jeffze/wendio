// Règle de consommation d'un magic link — logique pure, sans accès base.
//
// Pourquoi : les protections de liens des messageries institutionnelles
// (Microsoft 365 et équivalents) ne se contentent pas de pré-ouvrir les liens en
// GET — elles affichent la page de confirmation et SOUMETTENT le formulaire.
// Observé en production : un jeton consommé moins d'une minute après l'envoi,
// depuis une adresse appartenant à l'hébergeur de messagerie, avant que le
// destinataire ait cliqué. Il voit alors « Lien déjà utilisé ».
// Le patron GET-peek / POST-confirm ne suffit donc pas, et le nonce verify_csrf
// non plus : il est posé AU GET, donc le scanner le reçoit avec la page.
//
// On ne consomme que sur une preuve qu'un serveur tiers ne peut pas fabriquer :
//   - le cookie de confirmation, posé dans le navigateur qui a DEMANDÉ le lien ;
//   - ou le code à 6 chiffres du courriel, tapé à la main.

const crypto = require('node:crypto');

const MAX_CODE_ATTEMPTS = 5; // au-delà, le code de ce jeton est mort

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

// La base ne stocke jamais le nonce en clair.
function hashNonce(nonce) {
  if (!nonce) return null;
  return crypto.createHash('sha256').update(String(nonce)).digest('hex');
}

function sameSecret(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// row : ligne magic_tokens déjà filtrée par peekMagicToken (ni consommée, ni
// expirée), ou null. Retourne 'ok' | 'need_code' | 'bad_code' | 'locked' | 'invalid'.
function confirmationGate(row, cookieNonce, submittedCode) {
  if (!row) return 'invalid';

  // 1) Même navigateur que la demande : le cookie fait foi.
  if (row.nonce_hash && cookieNonce && sameSecret(hashNonce(cookieNonce), row.nonce_hash)) {
    return 'ok';
  }

  // 2) Sinon il faut le code du courriel. Sans code on ne consomme RIEN :
  //    c'est ce qui rend le POST du scanner inoffensif.
  const code = String(submittedCode || '').trim();
  if (!code) return 'need_code';
  if ((row.code_attempts || 0) >= MAX_CODE_ATTEMPTS) return 'locked';
  if (row.code && sameSecret(code, row.code)) return 'ok';
  return 'bad_code';
}

module.exports = { MAX_CODE_ATTEMPTS, generateCode, hashNonce, confirmationGate };
