# QR mobile en aléatoire + masquer tirage Physique — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le bouton « 📱 QR carte mobile » visible en mode local aléatoire (#21/#22) et masquer l'option de tirage Physique derrière un flag réactivable (#29).

**Architecture:** Un flag unique `TIRAGE_PHYSIQUE_ACTIF` dans `data.js` (source de vérité partagée). `meneur-config.html` masque l'étape « Type de tirage » et force `aleatoire` quand le flag est faux. `meneur.html` affiche le bouton QR en mode local via CSS et neutralise tout passage en physique. Aucun code Physique n'est supprimé — flip du flag = restauration complète.

**Tech Stack:** HTML/CSS/JS vanilla inline, Node/Express static server (`npm start` → http://localhost:3000). Pas de framework de test DOM dans ce repo → vérification par exécution manuelle.

**Spec de référence :** `docs/superpowers/specs/2026-06-09-wendio-qr-mobile-masquer-physique-design.md`

---

## File Structure

| Fichier | Rôle dans ce lot |
|---|---|
| `data.js` | Déclare le flag `TIRAGE_PHYSIQUE_ACTIF` (source unique de vérité), à côté de `CONFIG`/`CLANS`. |
| `meneur-config.html` | Charge `data.js` ; masque l'étape « Type de tirage », force `tirage=aleatoire`, renumérote l'étape Clan quand le flag est faux. |
| `meneur.html` | CSS : bouton QR visible en mode local. JS : garde-fou anti-physique + masque la pastille tirage du bandeau quand le flag est faux. |

**Note testing :** ce repo n'a pas de harnais de test DOM. Chaque tâche se termine par une vérification manuelle (lancer le serveur + observer), pas par un test automatisé. C'est la discipline réaliste ici ; ne pas inventer de framework de test pour un flag temporaire.

---

## Task 1 : Flag `TIRAGE_PHYSIQUE_ACTIF` dans `data.js`

**Files:**
- Modify: `data.js` (après le bloc `CLANS`, ~ligne 19)

- [ ] **Step 1 : Ajouter le flag**

Insérer juste après la fermeture de la constante `CLANS` (la ligne `};` à la ligne 19), avant le commentaire `// Cases cœur` :

```js

// support #29 — masquer le mode « tirage physique » avant présentation.
// Repasser à true pour tout restaurer (config + meneur) ; aucun code Physique n'est supprimé.
const TIRAGE_PHYSIQUE_ACTIF = false;
```

- [ ] **Step 2 : Vérifier la syntaxe**

Run: `node -e "require('./data.js'); " 2>&1 | head -5` depuis `D:/Wendio`
(Note : `data.js` n'a pas de `module.exports`, donc `require` charge et exécute sans erreur de parse. Une erreur de syntaxe ferait échouer le `node -e`.)
Expected : aucune sortie d'erreur (le fichier se parse). Si « SyntaxError », corriger.

- [ ] **Step 3 : Commit**

```bash
git add data.js
git commit -m "feat(data): flag TIRAGE_PHYSIQUE_ACTIF pour masquer le tirage physique (#29)"
```

---

## Task 2 : Bouton QR mobile visible en mode local — `meneur.html` (CSS, #21/#22)

**Files:**
- Modify: `meneur.html:620-622` (commentaire) et `meneur.html:637` (règle CSS)

- [ ] **Step 1 : Mettre à jour le commentaire CSS**

Remplacer le commentaire actuel (lignes 620-622) :

```css
    /* ── Bouton « QR carte mobile » + popup QR (support #16)
       Visible UNIQUEMENT en mode physique (le meneur veut offrir une carte
       numerique aux joueurs qui scannent — equivalent mobile des cartes papier). */
```

par :

```css
    /* ── Bouton « QR carte mobile » + popup QR (support #16, élargi #21/#22)
       Visible en mode LOCAL (tout tirage) — le meneur offre une carte numerique
       aux joueurs qui scannent. Masqué en online (les joueurs rejoignent via le
       code/QR de la vraie partie). */
```

- [ ] **Step 2 : Changer la règle d'affichage**

Remplacer la ligne 637 :

```css
    body.mode-physique .btn-qr-mobile { display: inline-flex; }
```

par :

```css
    body:not(.mode-online) .btn-qr-mobile { display: inline-flex; }
```

- [ ] **Step 3 : Vérification manuelle**

Lancer `npm start` (terminal séparé), ouvrir :
`http://localhost:3000/meneur.html?mode=local&tirage=aleatoire&clan=Chevreuil`
Expected : le bouton « 📱 QR carte mobile » est **visible**. Cliquer → popup avec un QR. (Le QR pointe vers `joueur.html?mode=local&clan=Chevreuil`.)
Puis ouvrir `http://localhost:3000/meneur.html?mode=online&tirage=aleatoire&clan=Chevreuil`
Expected : le bouton « 📱 QR carte mobile » est **masqué** (seul l'écran code/QR online subsiste).

- [ ] **Step 4 : Commit**

```bash
git add meneur.html
git commit -m "fix(meneur): QR carte mobile visible en mode local aléatoire (#21/#22)"
```

---

## Task 3 : Garde-fou anti-physique + bandeau — `meneur.html` (JS)

**Files:**
- Modify: `meneur.html:1539` (apply config) et `meneur.html:1604` (bandeau compact)

- [ ] **Step 1 : Garde-fou dans l'IIFE de config-URL**

Remplacer la ligne 1539 :

```js
    setModePhysique(tirage === 'physique');
```

par :

```js
    // support #29 — si le tirage physique est désactivé, ignorer le param `tirage`
    // (protège contre un vieux localStorage / URL bookmarkée ?tirage=physique).
    setModePhysique(TIRAGE_PHYSIQUE_ACTIF ? tirage === 'physique' : false);
```

(`data.js` est déjà chargé dans `meneur.html` → `TIRAGE_PHYSIQUE_ACTIF` est défini.)

- [ ] **Step 2 : Masquer la pastille tirage du bandeau quand le flag est faux**

Remplacer la ligne 1604 :

```js
    bandeau.append(span1, sep1, span2, sep2, span3);
```

par :

```js
    // Pastille tirage masquée quand le physique est désactivé (toujours aléatoire = bruit).
    if (TIRAGE_PHYSIQUE_ACTIF) {
      bandeau.append(span1, sep1, span2, sep2, span3);
    } else {
      bandeau.append(span1, sep1, span2);
    }
```

(`span3`/`sep2` restent créés au-dessus mais non ajoutés au DOM — inoffensif.)

- [ ] **Step 3 : Vérification manuelle**

Avec le serveur lancé, ouvrir :
`http://localhost:3000/meneur.html?mode=local&tirage=physique&clan=Loup`
Expected : la page **n'entre PAS** en mode physique — le bouton « Tirer » est présent et les cases du tableau ne sont pas en « deck cliquable » physique. Le bandeau compact affiche seulement le clan + « 📡 Local » (pas de « 🃏 Physique »).
Ouvrir aussi `http://localhost:3000/meneur.html?mode=local&tirage=aleatoire&clan=Chevreuil`
Expected : bandeau « 🦌 Chevreuil · 📡 Local » sans pastille tirage ; bouton Tirer présent ; bouton QR mobile visible (régression Task 2 toujours OK).

- [ ] **Step 4 : Commit**

```bash
git add meneur.html
git commit -m "fix(meneur): garde-fou anti-physique + bandeau sans pastille tirage (#29)"
```

---

## Task 4 : Masquer l'étape « Type de tirage » — `meneur-config.html` (#29)

**Files:**
- Modify: `meneur-config.html` (ajout `<script src="data.js">` avant le script inline ~ligne 297 ; bloc logique en fin de script inline ~ligne 331)

- [ ] **Step 1 : Charger `data.js` avant le script inline**

Le script inline commence à la ligne 297 (`<script>` suivi de `const choices = ...`). Juste **avant** cette balise `<script>` d'ouverture, insérer :

```html
<script src="data.js"></script>
```

(Garantit que `TIRAGE_PHYSIQUE_ACTIF` est défini quand le script inline s'exécute. `data.js` est du pur const/fonctions, sans effet de bord DOM.)

- [ ] **Step 2 : Masquer l'étape + forcer aléatoire + renuméroter**

Dans le script inline, **après** le listener `document.getElementById('btn-start').addEventListener(...)` (qui se termine ligne 331), avant la balise `</script>` fermante, ajouter :

```js

  // support #29 — masquer le tirage Physique (réactivable via TIRAGE_PHYSIQUE_ACTIF dans data.js).
  if (typeof TIRAGE_PHYSIQUE_ACTIF !== 'undefined' && !TIRAGE_PHYSIQUE_ACTIF) {
    const h2Tirage = document.querySelector('h2[data-i18n="config.tirage"]');
    const secTirage = h2Tirage && h2Tirage.closest('.section');
    if (secTirage) secTirage.style.display = 'none';
    // L'étape Clan devient l'étape 2 (le numéro est rendu via content: attr(data-step)).
    const h2Clan = document.querySelector('h2[data-i18n="config.clan"]');
    if (h2Clan) h2Clan.setAttribute('data-step', '2');
    // Force le tirage et réactive le bouton Commencer (Mode + Clan suffisent).
    selectOpt('tirage', 'aleatoire');
  }
```

(`selectOpt` est une déclaration de fonction → hoistée, disponible ici. Elle pose `choices.tirage='aleatoire'` et appelle `updateStartBtn()`.)

- [ ] **Step 3 : Vérification manuelle**

Avec le serveur lancé, ouvrir `http://localhost:3000/meneur-config.html`
Expected :
- L'étape « Type de tirage » **n'apparaît plus**.
- Les en-têtes lisent **1** (Mode de jeu) puis **2** (Clan imposé) — pas 1 puis 3.
- Choisir un Mode + un Clan → le bouton « Commencer ▶ » **s'active** (sans avoir à choisir un tirage).
- Cliquer « Commencer » → redirige vers `meneur.html?mode=…&tirage=aleatoire&clan=…`.

- [ ] **Step 4 : Commit**

```bash
git add meneur-config.html
git commit -m "feat(config): masquer l'étape de tirage Physique, forcer aléatoire (#29)"
```

---

## Task 5 : Passe de vérification complète (les 3 tickets + réactivation)

**Files:** aucun (vérification de bout en bout)

- [ ] **Step 1 : Parcours utilisateur complet**

Serveur lancé (`npm start`). Depuis `http://localhost:3000/lobby.html` → « Meneur de Jeu » :
- La page de config ne montre que Mode + Clan (#29). ✅
- Lancer une partie **locale** → sur `meneur.html`, le bouton « 📱 QR carte mobile » est visible (#21/#22). ✅
- Le popup QR pointe vers `joueur.html?mode=local&clan=<clan>` ; scanner/ouvrir cette URL charge bien une carte joueur locale. ✅

- [ ] **Step 2 : Vérifier la réactivation du flag**

Éditer `data.js` → `const TIRAGE_PHYSIQUE_ACTIF = true;`, recharger `meneur-config.html`.
Expected : l'étape « Type de tirage » réapparaît (étapes 1-2-3), comportement physique d'origine restauré.
**Puis remettre `false`** (état livré pour la présentation) et recharger pour confirmer le retour à l'état masqué.

- [ ] **Step 3 : Pas de commit** (vérification seule ; le flag reste à `false`).

---

## Hors plan (étapes post-implémentation, à confirmer avec JF)

- **Déploiement VPS** : `deploy/deploy.sh` (rsync + restart `wendio` + healthcheck). Vérifier NordVPN Threat Protection avant (casse Tailscale/downloads).
- **Annonce Support à Sylvain** : tickets #29/#21/#22 — commenter « livré, à tester » et demander fermeture après test (cf. skill `announce-change` / `fix-ticket`).
- **Merge** : `feat/qr-mobile-aleatoire-masquer-physique` → `main` une fois validé en prod.

---

## Self-Review

**Spec coverage :**
- #21 (QR absent en local aléatoire) → Task 2 (CSS `:not(.mode-online)`). ✅
- #22 (QR dispo en aléatoire) → Task 2 (même règle). ✅
- #29 (masquer Physique, réactivable) → Task 1 (flag) + Task 4 (config) + Task 3 (garde-fou). ✅
- Vérification spec §Vérification points 1-5 → couverts Tasks 2/3/4 Step 3 + Task 5. ✅

**Placeholder scan :** aucun TODO/TBD ; tout le code est fourni intégralement. ✅

**Type consistency :** `TIRAGE_PHYSIQUE_ACTIF` défini Task 1, utilisé Tasks 3/4 avec la même casse. `selectOpt`/`updateStartBtn` référencés Task 4 existent déjà dans `meneur-config.html` (lignes 308/316). `setModePhysique` Task 3 existe déjà (`meneur.html`). Sélecteurs `h2[data-i18n="config.tirage"]` / `[data-i18n="config.clan"]` correspondent au HTML existant (meneur-config.html:245/261). ✅
