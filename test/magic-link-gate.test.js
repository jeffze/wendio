// Ce que le scanner de courriels peut et ne peut pas faire.
// Contexte complet dans auth-gate.js.
const { test } = require('node:test');
const assert = require('node:assert');

const { confirmationGate, hashNonce, generateCode, MAX_CODE_ATTEMPTS } = require('../auth-gate');

const NONCE = 'a'.repeat(32);
const CODE = '428193';

function row(over = {}) {
  return {
    nonce_hash: hashNonce(NONCE),
    code: CODE,
    code_attempts: 0,
    ...over,
  };
}

// --- Le scanner : il affiche la page et soumet le formulaire, sans plus ---

test('POST sans cookie ni code : ne consomme pas', () => {
  assert.strictEqual(confirmationGate(row(), null, null), 'need_code');
});

test('POST avec un cookie inconnu : ne consomme pas', () => {
  assert.strictEqual(confirmationGate(row(), 'b'.repeat(32), null), 'need_code');
});

test('le scanner ne peut pas deviner le code', () => {
  assert.strictEqual(confirmationGate(row(), null, '000000'), 'bad_code');
});

// --- L'humain ---

test('même navigateur : le cookie suffit', () => {
  assert.strictEqual(confirmationGate(row(), NONCE, null), 'ok');
});

test('autre appareil : le code suffit', () => {
  assert.strictEqual(confirmationGate(row(), null, CODE), 'ok');
});

test('le code tolère les espaces de copier-coller', () => {
  assert.strictEqual(confirmationGate(row(), null, `  ${CODE} `), 'ok');
});

test('lien ouvert sur un autre appareil (aucun nonce utile) : le code est le seul chemin', () => {
  const r = row({ nonce_hash: null });
  assert.strictEqual(confirmationGate(r, null, null), 'need_code');
  assert.strictEqual(confirmationGate(r, NONCE, null), 'need_code');
  assert.strictEqual(confirmationGate(r, null, CODE), 'ok');
});

// --- Jeton inutilisable ---

test('jeton inconnu, consommé ou expiré : peekMagicToken renvoie null', () => {
  assert.strictEqual(confirmationGate(null, NONCE, CODE), 'invalid');
});

// --- Force brute ---

test('trop d essais : le code est verrouillé', () => {
  assert.strictEqual(confirmationGate(row({ code_attempts: MAX_CODE_ATTEMPTS }), null, CODE), 'locked');
});

test('le verrouillage ne bloque pas le bon cookie', () => {
  assert.strictEqual(confirmationGate(row({ code_attempts: MAX_CODE_ATTEMPTS }), NONCE, null), 'ok');
});

test('le dernier essai est encore permis', () => {
  assert.strictEqual(confirmationGate(row({ code_attempts: MAX_CODE_ATTEMPTS - 1 }), null, CODE), 'ok');
});

// --- Génération ---

test('le code fait toujours 6 chiffres, zéros de tête compris', () => {
  for (let i = 0; i < 500; i++) {
    assert.match(generateCode(), /^[0-9]{6}$/);
  }
});
