'use strict';
// Câblage base du magic link : colonnes migrées, nonce jamais stocké en clair,
// compteur d'essais, et la porte de confirmation qui lit de vraies lignes.
// La règle elle-même est testée sans base dans magic-link-gate.test.js.
// Style : DB-layer, base temporaire via DB_PATH.

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wendio-magic-'));
process.env.DB_PATH = path.join(TMP_DIR, 'test.db');

let db, auth, gate;
before(() => {
  db = require('../db');
  auth = require('../auth');
  gate = require('../auth-gate');
});

after(() => {
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (_) {}
});

function colonnes() {
  return db.prepare(`PRAGMA table_info(magic_tokens)`).all().map(c => c.name);
}

test('la migration ajoute les colonnes de confirmation', () => {
  const cols = colonnes();
  for (const c of ['code', 'nonce_hash', 'code_attempts']) {
    assert.ok(cols.includes(c), `colonne ${c} absente`);
  }
});

test('le nonce n est jamais stocké en clair', () => {
  const nonce = 'nonce-en-clair-a-ne-jamais-retrouver';
  const { token } = auth.createMagicToken('a@test.local', { confirmNonce: nonce });
  const row = db.prepare(`SELECT * FROM magic_tokens WHERE token = ?`).get(token);
  assert.notStrictEqual(row.nonce_hash, nonce);
  assert.strictEqual(row.nonce_hash, gate.hashNonce(nonce));
  assert.match(row.nonce_hash, /^[0-9a-f]{64}$/);
});

test('un jeton frais porte un code à 6 chiffres', () => {
  const { token, code } = auth.createMagicToken('b@test.local', {});
  assert.match(code, /^[0-9]{6}$/);
  assert.strictEqual(db.prepare(`SELECT code FROM magic_tokens WHERE token = ?`).get(token).code, code);
});

test('sans nonce la colonne reste nulle et le code fait foi', () => {
  const { token, code } = auth.createMagicToken('c@test.local', {});
  const row = auth.peekMagicToken(token);
  assert.strictEqual(row.nonce_hash, null);
  assert.strictEqual(gate.confirmationGate(row, 'nimporte-quoi', null), 'need_code');
  assert.strictEqual(gate.confirmationGate(row, null, code), 'ok');
});

test('le geste du scanner ne consomme rien', () => {
  const nonce = 'le-nonce-du-navigateur-demandeur';
  const { token } = auth.createMagicToken('d@test.local', { confirmNonce: nonce });

  // Le scanner affiche la page puis soumet le formulaire : ni cookie ni code.
  const row = auth.peekMagicToken(token);
  assert.strictEqual(gate.confirmationGate(row, null, null), 'need_code');
  assert.strictEqual(db.prepare(`SELECT consumed_at FROM magic_tokens WHERE token = ?`).get(token).consumed_at, null);

  // L'humain, lui, arrive avec le cookie.
  assert.strictEqual(gate.confirmationGate(auth.peekMagicToken(token), nonce, null), 'ok');
  assert.ok(auth.consumeMagicToken(token));
  assert.strictEqual(auth.peekMagicToken(token), null, 'le jeton doit être consommé');
});

test('le compteur d essais monte et finit par verrouiller', () => {
  const { token, code } = auth.createMagicToken('e@test.local', {});
  for (let i = 0; i < gate.MAX_CODE_ATTEMPTS; i++) {
    assert.strictEqual(gate.confirmationGate(auth.peekMagicToken(token), null, '000000'), 'bad_code');
    auth.bumpCodeAttempts(token);
  }
  assert.strictEqual(auth.peekMagicToken(token).code_attempts, gate.MAX_CODE_ATTEMPTS);
  assert.strictEqual(gate.confirmationGate(auth.peekMagicToken(token), null, code), 'locked',
    'même le bon code doit être refusé une fois verrouillé');
});
