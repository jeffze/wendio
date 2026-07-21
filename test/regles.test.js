'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { LIGNES, CONFIG, CLANS, valeurCase, estCoeur, victoireValide } = require('../data');

// Carte déterministe : chaque ligne prend les `count` premiers numéros de sa plage.
function carteFixe() {
  const carte = {};
  for (const l of LIGNES) {
    const { min, count } = CONFIG[l];
    carte[l] = Array.from({ length: count }, (_, i) => min + i);
  }
  return carte;
}

// Toutes les cases [ligne, colIdx] de la grille 6x6
function toutesLesCases() {
  const cases = [];
  for (const l of LIGNES) for (let c = 0; c < 6; c++) cases.push([l, c]);
  return cases;
}

// Jeux de cases minimaux qui remplissent chaque condition
const CASES = {
  ligne:  [0, 1, 2, 3, 4, 5].map(c => ['W', c]),
  coins:  [['W', 0], ['W', 5], ['O', 0], ['O', 5]],
  carre:  [1, 2, 3, 4].flatMap(li => [1, 2, 3, 4].map(ci => [LIGNES[li], ci])),
  pleine: toutesLesCases(),
};

// Numéros à tirer pour couvrir ces cases (les cœurs sont ignorés : valeur null)
function tiragesPour(carte, cond) {
  return CASES[cond]
    .filter(([l, c]) => !estCoeur(l, c))
    .map(([l, c]) => valeurCase(carte, l, c));
}

test('mapping clan → condition → points', () => {
  // Ordre et points fixés par la recommandation d'Andrée : préséance du mythe
  // de création (Chevreuil, Tortue, Ours, Loup) = ordre décroissant de points.
  const actuel = Object.entries(CLANS).map(([nom, c]) => [nom, c.victoire, c.points]);
  assert.deepEqual(actuel, [
    ['Chevreuil', 'pleine', 4],
    ['Tortue',    'carre',  3],
    ['Ours',      'coins',  2],
    ['Loup',      'ligne',  1],
  ]);
});

test('chaque clan valide sa propre condition', () => {
  const carte = carteFixe();
  for (const [nom, clan] of Object.entries(CLANS)) {
    const tirages = tiragesPour(carte, clan.victoire);
    assert.equal(victoireValide(carte, nom, tirages), true,
      `${nom} devrait gagner avec la condition ${clan.victoire}`);
  }
});

test('une condition partielle ne valide que le clan qui lui correspond', () => {
  const carte = carteFixe();
  // 'pleine' est exclu : c'est un sur-ensemble, il valide forcément tout le monde.
  for (const cond of ['ligne', 'coins', 'carre']) {
    const tirages = tiragesPour(carte, cond);
    for (const [nom, clan] of Object.entries(CLANS)) {
      const attendu = clan.victoire === cond;
      assert.equal(victoireValide(carte, nom, tirages), attendu,
        `tirages « ${cond} » → ${nom} (${clan.victoire}) devrait valoir ${attendu}`);
    }
  }
});

test('une carte pleine valide les 4 clans', () => {
  const carte = carteFixe();
  const tirages = tiragesPour(carte, 'pleine');
  for (const nom of Object.keys(CLANS)) {
    assert.equal(victoireValide(carte, nom, tirages), true);
  }
});

test('un clan inconnu ne gagne jamais', () => {
  const carte = carteFixe();
  const tirages = tiragesPour(carte, 'pleine');
  assert.equal(victoireValide(carte, 'Castor', tirages), false);
  assert.equal(victoireValide(carte, undefined, tirages), false);
});

test('chaque clan pointe vers sa carte-gagnant·e existante', () => {
  for (const [nom, clan] of Object.entries(CLANS)) {
    const attendu = `cartes/clan-${nom.toLowerCase()}.jpg`;
    assert.equal(clan.image, attendu, `${nom}.image devrait valoir ${attendu}`);
    const chemin = path.join(__dirname, '..', clan.image);
    assert.equal(fs.existsSync(chemin), true, `${chemin} devrait exister`);
  }
});
