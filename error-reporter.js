'use strict';

// Envoie les crashes Node de Wendio vers le service Support.
// Activé seulement si SUPPORT_URL + SUPPORT_API_KEY sont posés en env.
//
// Ne plante jamais le process si Support est down — l'erreur est juste loggée.

const SUPPORT_URL = process.env.SUPPORT_URL;
const SUPPORT_API_KEY = process.env.SUPPORT_API_KEY;
const GAME_ID = process.env.SUPPORT_GAME_ID || 'wendio';

if (!SUPPORT_URL || !SUPPORT_API_KEY) {
  console.log('[error-reporter] SUPPORT_URL ou SUPPORT_API_KEY absent — error tracking serveur désactivé.');
  module.exports = { report: () => {} };
  return;
}

function report(message, stack) {
  const body = JSON.stringify({
    message: String(message || 'unknown').slice(0, 2000),
    stack: String(stack || '').slice(0, 10000),
    user_agent: `node/${process.version}`,
    url: `node:${GAME_ID}`,
  });

  fetch(`${SUPPORT_URL}/api/errors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': SUPPORT_API_KEY,
    },
    body,
  }).catch(err => {
    console.error('[error-reporter] envoi échoué :', err.message);
  });
}

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  report(err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  const msg = (reason && reason.message) || String(reason);
  const stack = reason && reason.stack;
  console.error('[unhandledRejection]', reason);
  report(msg, stack);
});

console.log(`[error-reporter] actif → ${SUPPORT_URL} (game=${GAME_ID})`);

module.exports = { report };
