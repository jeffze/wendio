# Recommandations d'Andrée — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Appliquer les recommandations culturelles d'Andrée (conseillère wendat) : réassigner les clans aux conditions de victoire selon le mythe de création, remplacer le vocabulaire du trophée, et indexer les images de prix par clan.

**Architecture :** Le mapping clan → condition de victoire est aujourd'hui dupliqué entre `data.js` (navigateur) et `server.js` (validation anti-triche). La tâche 1 supprime cette duplication en faisant de `data.js` un module requérable côté Node, ce qui rend la logique de victoire testable ; la réassignation (tâche 2) se fait alors sous filet de tests. Les tâches 3 à 7 sont des changements de contenu (SVG, images, textes) sans logique.

**Tech Stack :** Node ≥ 20.6 (déjà requis par `--env-file-if-exists`), `node:test` + `node:assert/strict` (runner intégré, aucune dépendance à ajouter), HTML/CSS/JS vanilla inline, i18n maison (`i18n.js`).

**Spec :** `docs/superpowers/specs/2026-07-21-recommandations-andree-design.md`

**Branche :** `feat/recommandations-andree` (déjà créée, part de `main`).

## Global Constraints

- **Double emplacement des textes.** Chaque chaîne FR visible existe deux fois : en dur dans le HTML (fallback si JS désactivé) et dans `i18n.js`. Le HTML est écrasé au `DOMContentLoaded` par la valeur i18n. **Toujours modifier les deux.**
- **Toujours traduire l'EN.** Toute clé modifiée dans `i18n.js` a une valeur `en:` à mettre à jour dans le même geste.
- **Ne PAS renommer les identifiants internes** : clés i18n (`clan.Chevreuil`, `trophees.*`), noms de clans dans les events Socket.io et en base, classes CSS (`.trophee-titre`, `.win-trophee`), IDs (`#win-trophee`), nom de fichier `imprimer-trophees.html`. Invisibles pour l'utilisateur.
- **Nouveau mapping canonique**, à respecter partout :

  | Clan | Wendat | `victoire` | Points | Image |
  |---|---|---|---|---|
  | Chevreuil 🦌 | `Ohskënonton'` | `pleine` | 4 | `cartes/clan-chevreuil.jpg` |
  | Tortue 🐢 | `Yāndia'wich` | `carre` | 3 | `cartes/clan-tortue.jpg` |
  | Ours 🐻 | `Yānionyen'` | `coins` | 2 | `cartes/clan-ours.jpg` |
  | Loup 🐺 | `Yānariskwa'` | `ligne` | 1 | `cartes/clan-loup.jpg` |

- **Ordre d'affichage partout : Chevreuil → Tortue → Ours → Loup** (préséance du mythe de création). Dans `data.js`, l'ordre des clés de `CLANS` fait foi et se propage à `meneur.html`, `imprimer.html` et `imprimer-trophees.html` via `Object.keys` / `Object.entries`.
- **Vocabulaire imposé :**
  - « imposé » → « proposé » ; « devront viser » → « devront choisir »
  - « rare (et exigeant) » → « défi … grand »
  - « s'incrémente » → « augmente »
  - « ne peut rejoindre » → « ne peut se joindre à la partie »
  - « sidebar » → « barre latérale »
  - « Couronnement » → « Accomplissement »
  - « Trophée WENDIO » → « Gagnant ou gagnante Wendio »
  - « carte-trophée » / « le trophée » → « carte-gagnant·e »
  - « Trophées à imprimer » → « Cartes-gagnant·e à imprimer »
  - 🏆 → 🌽
- **Le travail en cours sur `auth.js` / `server.js` / `_modele-financier/` n'est pas commité et ne t'appartient pas.** Ne jamais faire `git add -A` ni `git commit -a` : `git add` uniquement les fichiers listés dans chaque étape de commit.

---

## File Structure

| Fichier | Rôle après ce plan |
|---|---|
| `data.js` | **Source unique** du mapping clans, des cases cœur et de la logique de victoire. Requérable en Node via un garde `module.exports`, toujours chargeable par `<script>` dans le navigateur. |
| `server.js` | Consomme `data.js` au lieu de le dupliquer. Ne contient plus `CLAN_VICTOIRE`, `estCoeur`, `valeurCase`, `victoireValide`, `LIGNES`, `CONFIG`. |
| `test/regles.test.js` | **Créé.** Épingle le mapping clan ↔ condition ↔ points et vérifie `victoireValide()` pour les 4 conditions. |
| `package.json` | Gagne le script `test`. |
| `i18n.js` | Textes FR/EN. |
| `aide-meneur.html`, `meneur-config.html`, `meneur.html`, `joueur.html`, `lobby.html`, `imprimer-trophees.html` | Textes en dur + ordre des clans + chemins d'images. |
| `cartes/clan-{chevreuil,tortue,ours,loup}.jpg` | **Renommés** depuis `clan-{4,3,2,1}pt.jpg`. |
| `cartes/README-images-clans.md` | **Créé.** Spec des vrais visuels à fournir. |
| `CLAUDE.md` | Doc du mapping et de la validation serveur. |

---

## Task 1 : rendre la logique de victoire testable (aucun changement de comportement)

**Files:**
- Modify: `data.js` (ajout en fin de fichier + déplacement de `victoireValide`)
- Modify: `server.js:320-343` (remplacer le bloc miroir par un `require`), et supprimer `victoireValide` (`server.js:345-...`)
- Modify: `package.json` (script `test`)
- Create: `test/regles.test.js`

**Interfaces:**
- Produces : `require('./data')` expose `{ LIGNES, CONFIG, CLANS, COEUR, COEUR_CLAN, NOMBRES, ligneDeNumero, genererCarte, valeurCase, estCoeur, victoireValide }`.
  - `victoireValide(carte, clan, tirages) → boolean` — `carte` = `{W:[…], E:[…], N:[…], D:[…], I:[…], O:[…]}`, `clan` = clé de `CLANS`, `tirages` = tableau de numéros.
  - `valeurCase(carte, ligne, colIdx) → number | null` (`null` = case cœur).
- Consumes : rien.

- [ ] **Step 1 : déplacer `victoireValide` de `server.js` vers `data.js`**

Dans `data.js`, insérer **après** la fonction `estCoeur` (actuellement `data.js:74-76`) le bloc suivant. C'est le corps exact de `server.js`, à une seule différence près : la condition est lue directement dans `CLANS[clan].victoire` au lieu de la table `CLAN_VICTOIRE`, ce qui supprime la duplication à la racine.

```js
// Vérifie qu'une carte remplit la condition de victoire pour un clan donné.
// Répliqué nulle part ailleurs : server.js require ce fichier (validation
// anti-triche), joueur.html a sa propre verifierVictoire() côté UI.
function victoireValide(carte, clan, tirages) {
  const cond = CLANS[clan] && CLANS[clan].victoire;
  if (!cond) return false;
  const tireSet = new Set(tirages);
  const has = (l, c) => {
    if (estCoeur(l, c)) return false;
    return tireSet.has(valeurCase(carte, l, c));
  };
  if (cond === 'coins') {
    return has('W', 0) && has('W', 5) && has('O', 0) && has('O', 5);
  }
  if (cond === 'pleine') {
    let n = 0;
    for (const l of LIGNES) for (let c = 0; c < 6; c++) if (!estCoeur(l, c) && has(l, c)) n++;
    return n >= 32;
  }
  if (cond === 'carre') {
    for (let li = 1; li <= 4; li++) for (let ci = 1; ci <= 4; ci++) {
      const l = LIGNES[li];
      if (!estCoeur(l, ci) && !has(l, ci)) return false;
    }
    return true;
  }
  if (cond === 'ligne') {
    // Horizontale : une des 6 rangées
    for (let li = 0; li < 6; li++) {
      const l = LIGNES[li]; let ok = true;
      for (let ci = 0; ci < 6; ci++) if (!estCoeur(l, ci) && !has(l, ci)) { ok = false; break; }
      if (ok) return true;
    }
    // Verticale : une des 6 colonnes
    for (let ci = 0; ci < 6; ci++) {
      let ok = true;
      for (let li = 0; li < 6; li++) {
        const l = LIGNES[li];
        if (!estCoeur(l, ci) && !has(l, ci)) { ok = false; break; }
      }
      if (ok) return true;
    }
    // Diagonale principale (\) : (0,0) à (5,5)
    let okDiag = true;
    for (let i = 0; i < 6; i++) {
      const l = LIGNES[i];
      if (!estCoeur(l, i) && !has(l, i)) { okDiag = false; break; }
    }
    if (okDiag) return true;
    // Diagonale anti (/) : (0,5) à (5,0)
    okDiag = true;
    for (let i = 0; i < 6; i++) {
      const l = LIGNES[i]; const ci = 5 - i;
      if (!estCoeur(l, ci) && !has(l, ci)) { okDiag = false; break; }
    }
    return okDiag;
  }
  return false;
}
```

- [ ] **Step 2 : rendre `data.js` requérable en Node**

Ajouter tout à la fin de `data.js` (après `jouerSon`) :

```js
// Export Node — le fichier reste chargeable tel quel par <script> dans le
// navigateur, où `module` est undefined et ce bloc est ignoré.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LIGNES, CONFIG, CLANS, COEUR, COEUR_CLAN, NOMBRES,
    ligneDeNumero, genererCarte, valeurCase, estCoeur, victoireValide,
  };
}
```

- [ ] **Step 3 : ajouter le script de test**

Dans `package.json`, section `scripts`, ajouter la ligne `test` :

```json
  "scripts": {
    "start": "node --env-file-if-exists=.env server.js",
    "start:nodot": "node server.js",
    "test": "node --test"
  },
```

- [ ] **Step 4 : écrire les tests (ils épinglent le mapping ACTUEL, pas encore le nouveau)**

Créer `test/regles.test.js` :

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

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
  const actuel = Object.entries(CLANS).map(([nom, c]) => [nom, c.victoire, c.points]);
  assert.deepEqual(actuel, [
    ['Chevreuil', 'ligne',  1],
    ['Loup',      'coins',  2],
    ['Ours',      'carre',  3],
    ['Tortue',    'pleine', 4],
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
```

- [ ] **Step 5 : lancer les tests**

Run : `npm test`
Expected : **PASS**, 5 tests. Si `mapping clan → condition → points` échoue, c'est que `data.js` a déjà été modifié — revenir en arrière, cette tâche ne doit rien changer au comportement.

- [ ] **Step 6 : brancher `server.js` sur `data.js`**

Dans `server.js`, remplacer intégralement le bloc `server.js:320-343` (du commentaire `// ── Config grille (miroir de data.js) ──` jusqu'à la fermeture de `valeurCase`) par :

```js
// ── Config grille + règles de victoire : source unique dans data.js ──
const { LIGNES, CONFIG, CLANS, estCoeur, valeurCase, victoireValide } = require('./data');
const CLANS_VALIDES = new Set(Object.keys(CLANS));
```

Puis **supprimer** la fonction `victoireValide` de `server.js` (le commentaire `// Vérifie qu'une carte remplit la condition de victoire pour un clan donné` et tout le corps de la fonction, jusqu'à son `}` final) — elle vit désormais dans `data.js`.

- [ ] **Step 7 : vérifier qu'aucun symbole n'est resté orphelin**

Run : `grep -n "CLAN_VICTOIRE" server.js data.js`
Expected : aucune sortie.

Run : `node --check server.js && node --check data.js`
Expected : aucune sortie (syntaxe valide). Ne pas tenter `node -e "require('./server')"` : `server.js` ouvre un port au chargement.

- [ ] **Step 8 : smoke test du serveur**

Run : `npm start`
Expected : le serveur démarre sans exception et log son port. Ouvrir `http://localhost:3000/imprimer.html` : les 4 cartes s'affichent avec leurs clans (preuve que `data.js` est toujours chargeable côté navigateur). Puis `Ctrl+C`.

- [ ] **Step 9 : relancer les tests**

Run : `npm test`
Expected : **PASS**, 5 tests.

- [ ] **Step 10 : commit**

```bash
git add data.js server.js package.json test/regles.test.js
git commit -m "refactor: data.js devient la source unique des regles de victoire

server.js requiert data.js au lieu de dupliquer CLANS, CLAN_VICTOIRE,
estCoeur, valeurCase et victoireValide. Ajoute test/regles.test.js
(node:test) qui epingle le mapping clan/condition/points avant sa
reassignation."
```

---

## Task 2 : réassigner clan ↔ condition ↔ points

**Files:**
- Modify: `test/regles.test.js` (attentes du test `mapping clan → condition → points`)
- Modify: `data.js:14-19` (objet `CLANS`)

**Interfaces:**
- Consumes : `CLANS`, `victoireValide` de la tâche 1.
- Produces : le mapping canonique de la section « Global Constraints », y compris l'ordre des clés.

- [ ] **Step 1 : mettre à jour l'attente du test**

Dans `test/regles.test.js`, remplacer le corps du test `mapping clan → condition → points` par :

```js
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
```

- [ ] **Step 2 : lancer les tests pour les voir échouer**

Run : `npm test`
Expected : **FAIL** sur `mapping clan → condition → points` (diff `deepEqual` : `Chevreuil/ligne/1` attendu `Chevreuil/pleine/4`). Les 4 autres tests passent encore (ils sont écrits en fonction de `CLANS`, pas de valeurs en dur).

- [ ] **Step 3 : réassigner dans `data.js`**

Remplacer intégralement `data.js:14-19` par :

```js
// Ordre = préséance du mythe de création wendat (Chevreuil, Tortue, Ours, Loup).
// Il fait foi partout : meneur.html, imprimer.html et imprimer-trophees.html
// itèrent sur Object.keys/Object.entries(CLANS).
const CLANS = {
  Chevreuil: { icon: '🦌', wendat: "Ohskënonton'", victoire: 'pleine', points: 4, label: 'Carte pleine (32 cases)',  image: 'cartes/clan-chevreuil.jpg' },
  Tortue:    { icon: '🐢', wendat: "Yāndia'wich",  victoire: 'carre',  points: 3, label: 'Carré protecteur (12 cases)', image: 'cartes/clan-tortue.jpg' },
  Ours:      { icon: '🐻', wendat: "Yānionyen'",   victoire: 'coins',  points: 2, label: 'Les 4 coins',              image: 'cartes/clan-ours.jpg' },
  Loup:      { icon: '🐺', wendat: "Yānariskwa'",  victoire: 'ligne',  points: 1, label: 'Ligne complète (horizontale, verticale ou diagonale)', image: 'cartes/clan-loup.jpg' },
};
```

Le champ `image` est ajouté ici mais n'est consommé qu'à la tâche 5 ; les fichiers qu'il pointe n'existent pas encore.

- [ ] **Step 4 : lancer les tests**

Run : `npm test`
Expected : **PASS**, 5 tests. Le test `une condition partielle ne valide que le clan qui lui correspond` est la vraie preuve : il vérifie qu'un joueur ne peut plus gagner avec l'ancien mapping.

- [ ] **Step 5 : commit**

```bash
git add data.js test/regles.test.js
git commit -m "feat: reassigne les clans aux conditions selon le mythe de creation

Loup=ligne(1), Ours=coins(2), Tortue=carre(3), Chevreuil=pleine(4).
L'ordre des cles de CLANS devient l'ordre de presence du mythe et se
propage a toutes les pages qui iterent dessus. Recommandation d'Andree."
```

---

## Task 3 : fiches clans illustrées de l'aide

Les 4 SVG de `aide-meneur.html` dessinent chacun une **condition** ; c'est donc l'en-tête (icône, nom, mot wendat, classe CSS, clé i18n, points) qui change de bloc, pas le dessin. Puis les blocs sont réordonnés.

**Files:**
- Modify: `aide-meneur.html:433-560` (les 4 `.clan-carte`)
- Modify: `i18n.js:398-404` (`aide.s4.<clan>.victoire`)

**Interfaces:**
- Consumes : le mapping de la tâche 2.
- Produces : rien (contenu statique).

- [ ] **Step 1 : échanger les textes de victoire dans `i18n.js`**

Remplacer `i18n.js:398-404` par :

```js
  'aide.s4.chevreuil.victoire':{ fr: 'Les 32 cases numérotées de la carte.',
                                 en: 'All 32 numbered cells of the card.' },
  'aide.s4.tortue.victoire':   { fr: "L'anneau de 12 cases qui entoure le Cœur.",
                                 en: 'The 12-cell ring around the Heart.' },
  'aide.s4.ours.victoire':     { fr: 'Les 4 coins de la carte.',
                                 en: 'The 4 corners of the card.' },
  'aide.s4.loup.victoire':     { fr: 'Une ligne complète : horizontale, verticale ou diagonale.',
                                 en: 'One complete line: horizontal, vertical or diagonal.' },
```

- [ ] **Step 2 : échanger les textes de victoire dans `i18n.js` (clés `clan.*`)**

Remplacer `i18n.js:145-152` par :

```js
  'clan.Chevreuil.victoire':   { fr: 'Carte pleine (32 cases)',
                                 en: 'Full card (32 cells)' },
  'clan.Tortue.victoire':      { fr: 'Carré protecteur (12 cases)',
                                 en: 'Protective square (12 cells)' },
  'clan.Ours.victoire':        { fr: 'Les 4 coins',
                                 en: 'All 4 corners' },
  'clan.Loup.victoire':        { fr: 'Ligne complète (horizontale, verticale ou diagonale)',
                                 en: 'Full line (horizontal, vertical or diagonal)' },
```

Remplacer aussi `i18n.js:136-143` pour que l'ordre des noms suive le mythe (aucun texte ne change, seulement l'ordre des lignes) :

```js
  'clan.Chevreuil':            { fr: 'Chevreuil',
                                 en: 'Deer' },
  'clan.Tortue':               { fr: 'Tortue',
                                 en: 'Turtle' },
  'clan.Ours':                 { fr: 'Ours',
                                 en: 'Bear' },
  'clan.Loup':                 { fr: 'Loup',
                                 en: 'Wolf' },
```

- [ ] **Step 3 : réaffecter les en-têtes des 4 blocs SVG**

Dans `aide-meneur.html`, pour chacun des 4 blocs `.clan-carte`, **ne toucher ni au `<svg>` ni à son `aria-label`** ; remplacer seulement le commentaire, la ligne `<div class="clan-carte …">`, le `<h4>`, la `.wendat`, la `.victoire` et les `.points` :

| Bloc actuel (par son SVG) | Lignes | Nouvel en-tête | Nouveau pied |
|---|---|---|---|
| `aria-label="Ligne horizontale"` (`aide-meneur.html:434-471`) | 434-437 / 469-470 | `<!-- Loup -->`<br>`<div class="clan-carte loup">`<br>`<h4>🐺 Loup</h4>`<br>`<div class="wendat">Yānariskwa'</div>` | `<div class="victoire" data-i18n="aide.s4.loup.victoire">Une ligne complète : horizontale, verticale ou diagonale.</div>`<br>`<div class="points">1 pt</div>` |
| `aria-label="Quatre coins"` (`aide-meneur.html:473-499`) | 473-476 / 497-498 | `<!-- Ours -->`<br>`<div class="clan-carte ours">`<br>`<h4>🐻 Ours</h4>`<br>`<div class="wendat">Yānionyen'</div>` | `<div class="victoire" data-i18n="aide.s4.ours.victoire">Les 4 coins de la carte.</div>`<br>`<div class="points">2 pts</div>` |
| `aria-label="Anneau central"` (`aide-meneur.html:501-535`) | 501-504 / 533-534 | `<!-- Tortue -->`<br>`<div class="clan-carte tortue">`<br>`<h4>🐢 Tortue</h4>`<br>`<div class="wendat">Yāndia'wich</div>` | `<div class="victoire" data-i18n="aide.s4.tortue.victoire">L'anneau de 12 cases qui entoure le Cœur.</div>`<br>`<div class="points">3 pts</div>` |
| `aria-label="Carte pleine"` (`aide-meneur.html:537-559`) | 537-540 / 557-558 | `<!-- Chevreuil -->`<br>`<div class="clan-carte chevreuil">`<br>`<h4>🦌 Chevreuil</h4>`<br>`<div class="wendat">Ohskënonton'</div>` | `<div class="victoire" data-i18n="aide.s4.chevreuil.victoire">Les 32 cases numérotées de la carte.</div>`<br>`<div class="points">4 pts</div>` |

- [ ] **Step 4 : réordonner les 4 blocs**

Dans `<div class="clans-grille">`, déplacer les blocs pour obtenir l'ordre **Chevreuil (carte pleine) → Tortue (anneau) → Ours (quatre coins) → Loup (ligne horizontale)**. Aucun contenu de bloc ne change à cette étape, seulement leur ordre.

- [ ] **Step 5 : corriger l'astuce « Quel clan choisir ? »**

Ce texte devient faux avec le nouveau mapping (Chevreuil était le plus rapide, il devient le plus long).

Dans `i18n.js`, remplacer `aide.s4.astuce.txt` (`i18n.js:406-407`) par :

```js
  'aide.s4.astuce.txt':        { fr: "Pour une partie courte (5-10 min), choisis Loup ou Ours. Pour une partie pédagogique longue qui fait entendre tous les numéros, choisis Chevreuil. Tortue est un bon équilibre.",
                                 en: 'For a short game (5-10 min), choose Wolf or Bear. For a long pedagogical game that lets all numbers be heard, choose Deer. Turtle is a good balance.' },
```

Et dans `aide-meneur.html:564`, remplacer le `<span data-i18n="aide.s4.astuce.txt">…</span>` par :

```html
      <span data-i18n="aide.s4.astuce.txt">Pour une partie courte (5-10 min), choisis <strong>Loup</strong> ou <strong>Ours</strong>. Pour une partie pédagogique longue qui fait entendre tous les numéros, choisis <strong>Chevreuil</strong>. <strong>Tortue</strong> est un bon équilibre.</span>
```

- [ ] **Step 6 : corriger l'ordre des icônes du Cœur**

Dans `aide-meneur.html:430`, remplacer `🦌🐺🐻🐢` par `🦌🐢🐻🐺`. Idem dans `i18n.js` clé `aide.s4.coeur` (`i18n.js:396-397`), FR **et** EN.

- [ ] **Step 7 : vérifier visuellement**

Run : `npm start` puis ouvrir `http://localhost:3000/aide-meneur.html#clans`
Expected : les 4 fiches apparaissent dans l'ordre Chevreuil / Tortue / Ours / Loup ; chaque dessin correspond bien à la condition écrite sous lui (Chevreuil = grille verte pleine + 4 pts, Loup = une rangée dorée + 1 pt). Basculer en EN via le toggle : les textes de victoire suivent. Puis `Ctrl+C`.

- [ ] **Step 8 : commit**

```bash
git add aide-meneur.html i18n.js
git commit -m "feat: fiches clans de l'aide alignees sur le nouveau mapping

Chaque SVG illustre une condition : c'est l'en-tete du bloc qui change
de clan, pas le dessin. Blocs reordonnes selon le mythe de creation et
astuce « quel clan choisir » corrigee (Chevreuil est desormais le plus
long, Loup le plus rapide)."
```

---

## Task 4 : ordre des clans dans les pages restantes

**Files:**
- Modify: `meneur-config.html:261-…` (4 boutons de clan en dur)
- Modify: `imprimer-trophees.html:262` (commentaire d'ordre)

**Interfaces:**
- Consumes : le mapping de la tâche 2.

- [ ] **Step 1 : réordonner les boutons de `meneur-config.html`**

Les 4 `<button class="opt" data-key="clan" data-value="…">` de l'étape 3 sont écrits en dur. Les déplacer pour obtenir l'ordre `Chevreuil`, `Tortue`, `Ours`, `Loup`. Ne changer aucun attribut : les `data-value` et les `data-i18n` (`clan.<Nom>`, `clan.<Nom>.victoire`) restent attachés à leur clan.

⚠️ Le texte de fallback en dur de chaque `.desc` (ex. `meneur-config.html:267` : `Une ligne`) doit suivre son clan : `Chevreuil` → `Carte pleine`, `Tortue` → `Carré protecteur`, `Ours` → `Les 4 coins`, `Loup` → `Une ligne`.

- [ ] **Step 2 : corriger le commentaire d'ordre**

Dans `imprimer-trophees.html:262`, remplacer :

```js
    // Ordre fixe : on respecte l'ordre WENDIO logique (Chevreuil → Loup → Ours → Tortue)
```

par :

```js
    // Ordre fixe : préséance du mythe de création (Chevreuil → Tortue → Ours → Loup),
    // porté par l'ordre des clés de CLANS dans data.js.
```

- [ ] **Step 3 : vérifier**

Run : `npm start`, puis ouvrir successivement :
- `http://localhost:3000/meneur-config.html` → étape 3 : ordre Chevreuil / Tortue / Ours / Loup, chaque description correspond à la bonne condition
- `http://localhost:3000/meneur.html?mode=local&tirage=aleatoire` → les boutons de clan de la barre latérale suivent le même ordre (générés depuis `CLANS`)
- `http://localhost:3000/imprimer-trophees.html` → les cases à cocher de clan suivent le même ordre
- `http://localhost:3000/imprimer.html` → générer des cartes, vérifier que l'objectif affiché correspond au bon clan

Puis `Ctrl+C`.

- [ ] **Step 4 : commit**

```bash
git add meneur-config.html imprimer-trophees.html
git commit -m "feat: ordre des clans du mythe de creation dans config et trophees"
```

---

## Task 5 : images de prix indexées par clan

**Files:**
- Rename: `cartes/clan-{1,2,3,4}pt.jpg` → `cartes/clan-{loup,ours,tortue,chevreuil}.jpg`
- Modify: `imprimer-trophees.html:299`, `joueur.html:1563`, `meneur.html:1432`
- Create: `cartes/README-images-clans.md`

**Interfaces:**
- Consumes : `CLANS[clan].image` ajouté à la tâche 2.

- [ ] **Step 1 : renommer les fichiers**

Le renommage préserve le chiffre dessiné dans chaque image (le « 1 » va au clan à 1 point).

```bash
git mv cartes/clan-1pt.jpg cartes/clan-loup.jpg
git mv cartes/clan-2pt.jpg cartes/clan-ours.jpg
git mv cartes/clan-3pt.jpg cartes/clan-tortue.jpg
git mv cartes/clan-4pt.jpg cartes/clan-chevreuil.jpg
```

Ne pas toucher à `cartes-orig/` (archive du lot source).

- [ ] **Step 2 : brancher les 3 sites d'appel sur `CLANS[…].image`**

`imprimer-trophees.html:299` — remplacer :

```js
    img.src = 'cartes/clan-' + clan.points + 'pt.jpg';
```

par :

```js
    img.src = clan.image;
```

`joueur.html:1563` — remplacer :

```js
      trophee.src = 'cartes/clan-' + c.points + 'pt.jpg';
```

par :

```js
      trophee.src = c.image;
```

`meneur.html:1432` — remplacer :

```js
      trophee.src = 'cartes/clan-' + c.points + 'pt.jpg';
```

par :

```js
      trophee.src = c.image;
```

- [ ] **Step 3 : vérifier qu'aucun chemin `Npt.jpg` ne subsiste**

Run : `grep -rn "pt.jpg" --include="*.html" --include="*.js" . | grep -v node_modules`
Expected : aucune sortie (les seules références à `cartes-orig/` sont dans `scripts/`, qui ne construit pas ces chemins).

- [ ] **Step 4 : documenter la spec des vrais visuels**

Créer `cartes/README-images-clans.md` :

```markdown
# Cartes-gagnant·e — images par clan

Une image par clan, affichée dans l'overlay de victoire (meneur + joueur) et
imprimée par `imprimer-trophees.html`. Le chemin est déclaré dans `data.js`
(`CLANS[<clan>].image`).

## Contrainte

**Le chiffre du nombre de points est dessiné dans l'illustration elle-même.**
Une image destinée au Chevreuil doit donc porter un « 4 », celle du Loup un « 1 ».

| Fichier | Clan | Points | Chiffre à intégrer |
|---|---|---|---|
| `clan-chevreuil.jpg` | Chevreuil 🦌 | 4 | 4 |
| `clan-tortue.jpg` | Tortue 🐢 | 3 | 3 |
| `clan-ours.jpg` | Ours 🐻 | 2 | 2 |
| `clan-loup.jpg` | Loup 🐺 | 1 | 1 |

Format actuel : JPEG portrait, ~830×1200 px, fond blanc/dégradé clair, coins
arrondis, objet en haut et chiffre en bas.

## État : images provisoires

Les 4 fichiers actuels sont **hérités de l'ancienne indexation par points** et
l'objet représenté ne correspond **pas** au clan. C'est assumé : on ne peut pas
à la fois respecter le chiffre dessiné et l'objet du clan avec les images
existantes.

| Fichier | Objet actuel | Objet demandé par Andrée |
|---|---|---|
| `clan-chevreuil.jpg` | bracelet ⚠️ | pointe de flèche au bout d'un bois de chevreuil ; sac ; hochets à sabots de chevreuil |
| `clan-tortue.jpg` | pointe de flèche ⚠️ | hochets en écaille, en corne, en courge ; coiffe wendat |
| `clan-ours.jpg` | peau ⚠️ | panier de petits fruits ; graisse d'ours en poterie ; collier de griffes ou de dents ; mocassins brodés wendat |
| `clan-loup.jpg` | perles de céramique ⚠️ | collier de griffes de loup ; peau de loup ou de castor |

## Comment remplacer

Ces images ne doivent **pas** être générées par IA : c'est ce qui a produit le
bracelet de style sud-ouest américain actuellement affiché pour le Chevreuil.
Elles doivent venir d'Andrée, de Sylvain ou d'une source validée par la Nation
(objets de collection, musée huron-wendat, illustration commandée).

Déposer le nouveau fichier sous le même nom, au même format. Aucun code à
modifier.
```

- [ ] **Step 5 : vérifier visuellement**

Run : `npm start`, ouvrir `http://localhost:3000/imprimer-trophees.html`, cocher les 4 clans.
Expected : 4 pages, chacune avec son image, et le chiffre de l'image correspond au nombre de points affiché sous le clan (Chevreuil → image avec « 4 » et « 4 points WENDIO »). Puis `Ctrl+C`.

- [ ] **Step 6 : commit**

```bash
git add cartes/ imprimer-trophees.html joueur.html meneur.html
git commit -m "feat: images de prix indexees par clan au lieu des points

clan-Npt.jpg -> clan-<nom>.jpg, chemin declare dans CLANS[].image.
README documente que les objets representes ne correspondent pas encore
aux clans et attend les visuels valides par la Nation."
```

---

## Task 6 : vocabulaire et philosophie

Toutes les chaînes ci-dessous existent **deux fois** : en dur dans le HTML et dans `i18n.js`. Chaque étape traite une paire.

**Files:**
- Modify: `i18n.js`, `aide-meneur.html`, `aide-joueur.html`, `meneur-config.html`, `meneur.html`, `joueur.html`, `lobby.html`, `imprimer-trophees.html`

- [ ] **Step 1 : « imposé » → « proposé »**

`i18n.js` :

```js
  'config.clan':               { fr: 'Clan proposé aux joueurs',
                                 en: 'Clan proposed to players' },
```
```js
  'meneur.clan_impose_prefix': { fr: 'Clan proposé : ',
                                 en: 'Proposed clan: ' },
```
```js
  'joueur.rejoindre.info_clan':{ fr: 'Le clan est proposé par le meneur — il sera affiché dès que vous rejoignez.',
                                 en: 'The clan is proposed by the game master — it will be shown as soon as you join.' },
```
```js
  'aide.s4.intro':             { fr: "Chaque partie se joue avec un seul clan proposé par toi. Tous les joueurs ont la même condition de victoire. Plus le défi du clan est grand, plus il rapporte de points.",
                                 en: 'Each game is played with a single clan proposed by you. All players have the same victory condition. The greater the clan challenge, the more points it scores.' },
```
```js
  'aide.s5.e2.p':              { fr: "Mode En ligne, Tirage Aléatoire (sauf si tu as reçu un paquet de cartes à jouer du conseil de bande), et le clan proposé que tous les joueurs devront choisir.",
                                 en: 'Online mode, Random draw (unless your band council provided you with a deck of playing cards), and the proposed clan that all players will choose.' },
```

HTML correspondants :
- `meneur-config.html:261` : `<h2 data-step="3" data-i18n="config.clan">Clan proposé aux joueurs</h2>`
- `joueur.html:783` : `Le clan est proposé par le meneur — il sera affiché dès que vous rejoignez.`
- `aide-meneur.html:427` : `Chaque partie se joue avec <strong>un seul clan proposé par toi</strong>. Tous les joueurs ont la même condition de victoire. Plus le défi du clan est grand, plus il rapporte de points.`
- `aide-meneur.html:582` : `…et le <strong>clan proposé</strong> que tous les joueurs devront choisir.`

- [ ] **Step 2 : « s'incrémente » et « ne peut rejoindre »**

`i18n.js` :

```js
  'aide.s5.e5.p':              { fr: "Le compteur de joueurs augmente à chaque arrivée. Vérifie que personne n'a été oublié — une fois la partie démarrée, plus aucun nouveau joueur ne peut se joindre à la partie.",
                                 en: "The player counter goes up with each arrival. Make sure no one is forgotten — once the game starts, no new players can join." },
```

`aide-meneur.html:594` : reprendre le même texte FR.

Même formulation côté joueur — `i18n.js` (`aidej.s1.l3`) :

```js
  'aidej.s1.l3':               { fr: 'Tu ne peux pas te joindre à une partie déjà commencée.',
                                 en: "You can't join a game that has already started." },
```

et `aide-joueur.html:201` : `<strong>Tu ne peux pas te joindre à une partie déjà commencée</strong>.`

- [ ] **Step 3 : « sidebar » → « barre latérale »**

`i18n.js` (`aide.s7.demo.p1`) : remplacer `qui apparaît dans la sidebar quand` par `qui apparaît dans la barre latérale quand`. L'EN garde `in the sidebar` (terme correct en anglais).

`aide-meneur.html:662` : même remplacement côté FR.

- [ ] **Step 4 : « Couronnement » → « Accomplissement »**

`i18n.js` :

```js
  'aide.s5.intro':             { fr: "Voici les étapes du point de vue du meneur, du moment où tu ouvres l'app jusqu'à l'accomplissement du gagnant ou de la gagnante.",
                                 en: "Here are the steps from the Master's point of view, from opening the app to the winner's achievement." },
```
```js
  'aide.s5.e8.t':              { fr: 'Accomplissement',               en: 'Achievement' },
```

`aide-meneur.html:572` et `aide-meneur.html:605` : reprendre les mêmes textes FR.

- [ ] **Step 5 : « trophée » → « gagnant·e »**

`i18n.js` :

```js
  'lobby.trophees.label':      { fr: 'Cartes-gagnant·e à imprimer',
                                 en: 'Winner Cards to Print' },
  'lobby.trophees.desc':       { fr: 'Imprimez une carte-gagnant·e par clan, avec nom et date — idéal pour souligner l’accomplissement à l’école ou en salle.',
                                 en: 'Print a winner card per clan, with name and date — perfect for celebrating the achievement at school or in a hall.' },
```
```js
  'trophees.titre':            { fr: 'Gagnant ou gagnante Wendio', en: 'Wendio Winner' },
```
```js
  'trophees.empty':            { fr: 'Choisissez un ou plusieurs clans ci-dessus pour générer les cartes-gagnant·e.',
                                 en: 'Choose one or more clans above to generate winner cards.' },
```
```js
  'trophees.nom_titre':        { fr: 'Nom du gagnant ou de la gagnante (optionnel)',
                                 en: 'Winner’s name (optional)' },
  'trophees.bravo_default':    { fr: '(nom du gagnant ou de la gagnante)',
                                 en: '(winner’s name)' },
```
```js
  'aide.s5.e8.p':              { fr: "Dès qu'un joueur déclare une victoire valide, la partie se termine pour tout le monde. Un overlay vert apparaît avec son nom et sa carte-gagnant·e. Tu peux imprimer la carte-gagnant·e ou démarrer une nouvelle partie.",
                                 en: 'As soon as a player declares a valid victory, the game ends for everyone. A green overlay appears with their name and winner card. You can print the winner card or start a new game.' },
```
```js
  'aide.s7.avant.l4':          { fr: "Imprime les cartes-gagnant·e à l'avance si tu veux les remettre physiquement à la fin (page « Cartes-gagnant·e à imprimer » dans le lobby).",
                                 en: 'Print the winner cards in advance if you want to hand them out physically at the end (« Winner cards to print » page in the lobby).' },
  'aide.s7.apres.l1':          { fr: 'Imprime la carte-gagnant·e avec le nom et la date (depuis le lobby → « Cartes-gagnant·e à imprimer »).',
                                 en: "Print the winner card with the name and the date (from the lobby → « Winner cards to print »)." },
```

HTML correspondants :
- `lobby.html:193-197` : le label et la description de la carte de navigation
- `imprimer-trophees.html:5` : `<title>WENDIO — Cartes-gagnant·e à imprimer</title>`
- `imprimer-trophees.html` : le texte de l'empty-state et le titre de page en dur
- `joueur.html:816` : `<img class="win-trophee" id="win-trophee" alt="Carte-gagnant·e du clan">`
- `meneur.html:845` : `<img class="win-trophee" id="win-trophee" alt="Carte-gagnant·e du clan">`
- `aide-meneur.html:606`, `:644`, `:657` : reprendre les textes FR ci-dessus

Dans `imprimer-trophees.html:295-300`, l'`alt` de l'image générée en JS :

```js
      img.alt = 'Carte-gagnant·e ' + clanNom;
```

- [ ] **Step 6 : 🏆 → 🌽**

`joueur.html:1545` et `meneur.html:1419` — remplacer :

```js
  const TROPHEE = '🏆';
```

par :

```js
  // Grain de maïs : même marqueur que les cases cochées (grain-mais.svg).
  // Le trophée n'existe pas dans la philosophie wendat (recommandation d'Andrée).
  const TROPHEE = '🌽';
```

Ne pas renommer la constante (utilisée à 5 endroits, purement interne).

⚠️ Le littéral actuel est écrit en séquence d'échappement (`'🏆'`), pas en emoji : chercher `TROPHEE = ` pour le trouver.

Vérifier ensuite qu'aucun trophée ne subsiste dans une page servie :

Run : `grep -rn "TROPHEE = \|uDFC6" --include="*.html" --include="*.js" . | grep -v node_modules`
Expected : deux lignes seulement, `joueur.html` et `meneur.html`, toutes deux avec `'🌽'`.

- [ ] **Step 7 : corriger les mentions de clans devenues fausses**

Trois textes citent un clan en fonction de sa durée ; le nouveau mapping les invalide.

`i18n.js` :

```js
  'aide.s7.avant.l2':          { fr: 'Branche l\'appareil — une partie peut durer 20-30 min en mode Chevreuil.',
                                 en: 'Plug in the device — a game can last 20-30 min in Deer mode.' },
```
```js
  'aide.s7.demo.p2':           { fr: "Le serveur ajoute 3 joueurs « bots » avec des cartes aléatoires (Alice, Bob, Carla...). Tu démarres la partie, tu tires des numéros, et l'un d'eux finit par gagner naturellement (le clan Loup est le plus rapide pour une démo, en ~10-15 tirages).",
                                 en: 'The server adds 3 « bot » players with random cards (Alice, Bob, Carla...). You start the game, draw numbers, and one of them eventually wins naturally (the Wolf clan is the fastest for a demo, around 10-15 draws).' },
  'aide.s7.demo.astuce.txt':   { fr: 'Lobby → Meneur → En ligne → Aléatoire → Loup → « Créer la partie » → « 🤖 Simuler 3 joueurs » → « Commencer la partie » → tirer rapidement jusqu\'à la victoire (l\'overlay gagnant apparaît tout seul).',
                                 en: 'Lobby → Master → Online → Random → Wolf → « Create game » → « 🤖 Simulate 3 players » → « Start the game » → draw quickly until victory (the winner overlay appears by itself).' },
```

`aide-meneur.html` : reprendre les mêmes textes FR aux emplacements `data-i18n="aide.s7.avant.l2"`, `aide.s7.demo.p2`, `aide.s7.demo.astuce.txt`.

- [ ] **Step 8 : vérifier qu'aucun terme banni ne subsiste dans le texte visible**

Run : `grep -rniE "imposé|incrémente|couronnement|trophée|sidebar" --include="*.html" --include="i18n.js" . | grep -v node_modules`
Expected : chaque ligne retournée doit être un **identifiant interne ou un commentaire de code**, jamais du texte affiché. Sont acceptables : classes CSS `.trophee-*` / `.win-trophee`, IDs `#win-trophee`, clés i18n `trophees.*`, `href="imprimer-trophees.html"`, commentaires JS/CSS, et la classe CSS `.sidebar`. Toute chaîne entre `>` et `<`, ou dans un `fr:` / `en:` de `i18n.js`, est un échec — la corriger.

- [ ] **Step 9 : vérifier visuellement en FR et en EN**

Run : `npm start`, puis parcourir `lobby.html`, `aide-meneur.html` (sections 4, 5, 7), `meneur-config.html`, `imprimer-trophees.html`, en basculant le toggle FR/EN sur chaque page.
Expected : plus aucune mention de trophée ni de couronnement ; le titre imprimé affiche « GAGNANT OU GAGNANTE WENDIO » (le `text-transform: uppercase` de `.trophee-titre` est conservé). Puis `Ctrl+C`.

- [ ] **Step 10 : commit**

```bash
git add i18n.js aide-meneur.html aide-joueur.html meneur-config.html meneur.html joueur.html lobby.html imprimer-trophees.html
git commit -m "feat: vocabulaire et philosophie wendat (recommandations d'Andree)

impose -> propose, rare -> defi, s'incremente -> augmente, rejoindre ->
se joindre a la partie, sidebar -> barre laterale, Couronnement ->
Accomplissement, trophee -> carte-gagnant.e, emoji trophee -> grain de
mais. Corrige aussi les 3 textes qui citaient un clan selon sa duree."
```

---

## Task 7 : documentation du dépôt

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1 : mettre à jour le tableau des clans**

Dans `CLAUDE.md`, section « The 4 Clans », remplacer le tableau par :

```markdown
| Clan | Wendat Name | Victory | Points |
|------|-------------|---------|--------|
| Chevreuil 🦌 | Ohskënonton' | All 32 numbered cells | 4 pts |
| Tortue 🐢 | Yāndia'wich | 12-cell protective ring around center | 3 pts |
| Ours 🐻 | Yānionyen' | All 4 corners | 2 pts |
| Loup 🐺 | Yānariskwa' | One complete line: horizontal, vertical, or main diagonal (4–6 cells, hearts count as free) | 1 pt |

Order follows the Wendat creation myth (Chevreuil, Tortue, Ours, Loup) — the key
order of `CLANS` in `data.js` is the single source of truth and propagates to
every page that iterates over it.
```

- [ ] **Step 2 : corriger la section validation serveur**

Remplacer le paragraphe qui commence par `` `CLAN_VICTOIRE = { Chevreuil: 'ligne', … }` reproduit côté serveur `` par :

```markdown
`server.js` require `data.js` — il n'y a plus de miroir. `victoireValide(carte,
clan, tirages)` vit dans `data.js`, lit la condition dans `CLANS[clan].victoire`
et est couverte par `test/regles.test.js` (`npm test`, runner `node --test`).

Pour `'ligne'` (Loup), la victoire accepte : (1) toute rangée horizontale,
(2) toute colonne verticale, (3) la diagonale principale `\` (0,0)→(5,5),
(4) la diagonale anti `/` (0,5)→(5,0). Les cases cœur (N2, N3, D2, D3) comptent
comme libres dans toutes ces lignes.
```

Remplacer aussi, dans la ligne de la règle invariante n°1 du flow online, « Clan imposé » par « Clan proposé ».

- [ ] **Step 3 : documenter les images et les tests**

Dans le tableau `### Files`, remplacer la ligne de `cartes/` par :

```markdown
| `cartes/` | 72 cartes numérotées + 4 cartes-gagnant·e par clan (`clan-<nom>.jpg`, chemin déclaré dans `CLANS[].image`). Voir `cartes/README-images-clans.md` |
```

Ajouter, après la ligne de `data.js` :

```markdown
| `test/regles.test.js` | Tests `node:test` du mapping clan ↔ condition ↔ points et de `victoireValide()`. Lancer avec `npm test` |
```

Dans la section « Running the Project », ajouter après le bloc `npm start` :

```markdown
```bash
# Tests (runner intégré Node, aucune dépendance)
npm test
```
```

- [ ] **Step 4 : commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md aligne sur le nouveau mapping et les tests"
```

---

## Task 8 : vérification finale

**Files:** aucun (vérification seule)

- [ ] **Step 1 : suite de tests**

Run : `npm test`
Expected : **PASS**, 5 tests.

- [ ] **Step 2 : partie en ligne de bout en bout**

Run : `npm start`, puis :
1. `http://localhost:3000/meneur-config.html` → En ligne → Aléatoire → **Loup** → Commencer
2. Créer la partie, noter le code
3. Dans un second onglet, `http://localhost:3000/joueur.html?code=<CODE>`, rejoindre avec un prénom
4. Côté meneur : « Simuler 3 joueurs », « Commencer la partie », puis tirer jusqu'à une victoire

Expected :
- L'objectif affiché côté joueur est « Ligne complète (horizontale, verticale ou diagonale) » — la nouvelle condition du Loup
- La victoire est acceptée par le serveur (preuve que `victoireValide` lit bien le nouveau mapping)
- L'overlay affiche 🌽, la carte-gagnant·e `clan-loup.jpg` (celle qui porte le « 1 »), et « 1 point WENDIO »

- [ ] **Step 3 : diff de contrôle**

Run : `git status --short`
Expected : seuls `auth.js`, `server.js`, `_modele-financier/*` apparaissent comme modifiés non commités **si et seulement si** le travail en cours sur le magic link n'a pas été touché. `server.js` est légitimement modifié par la tâche 1 — vérifier avec `git diff main -- server.js` que le diff commité ne contient que le remplacement du bloc miroir, et rien du chantier magic link.

- [ ] **Step 4 : arrêter le serveur**

`Ctrl+C`.

---

## Livrable hors code (à faire après le merge)

Rédiger le courriel à Sylvain (pour Andrée). Contenu attendu, décrit dans la spec :

- confirmation de la prise en compte de chaque recommandation ;
- avertissement que le mapping clan ↔ condition a changé → le PPTX, les PDF de règles et les cartes déjà imprimées sont à revoir ;
- demande des 4 visuels d'objets anciens wendat validés par la Nation, avec la contrainte du chiffre à intégrer (voir `cartes/README-images-clans.md`) ;
- explication de pourquoi les images provisoires ne correspondent pas encore aux clans.

Envisager aussi une entrée de release dans le tracker Support et une annonce via `/announce-change`.
