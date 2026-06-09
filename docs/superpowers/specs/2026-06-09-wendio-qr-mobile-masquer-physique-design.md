# Wendio — QR mobile en mode aléatoire + masquer le tirage Physique

**Date** : 2026-06-09
**Tickets Support** : #21 (bug), #22 (question), #29 (bug)
**Fichiers touchés** : `data.js`, `meneur-config.html`, `meneur.html`

## Contexte

Trois tickets Sylvain forment un seul lot cohérent :

- **#29** — « Cartes physiques : cacher cette option avant la prochaine présentation. »
- **#22** — Le choix du **Code QR** (carte mobile) doit aussi être disponible en **mode local aléatoire**, pas seulement en tirage physique.
- **#21** — Régression : sur ordinateur en mode local aléatoire, le QR pour obtenir une carte sur cellulaire ne s'affiche plus.

### Cause racine

Le bouton **« 📱 QR carte mobile »** (`#btn-qr-mobile`, ajouté en support #16) ouvre une popup avec un QR pointant vers `joueur.html?mode=local&clan=<clan>` — chaque scan donne au joueur une carte numérique aléatoire. Il est masqué par défaut (`.btn-qr-mobile { display:none }`) et révélé **uniquement** en mode physique :

```css
body.mode-physique .btn-qr-mobile { display: inline-flex; }   /* meneur.html:637 */
```

Donc en mode local **aléatoire**, le bouton est invisible → c'est #21/#22.

L'option **Physique** se choisit à l'étape 2 « Type de tirage » de `meneur-config.html` (lignes 244-258) et pose `body.mode-physique` dans `meneur.html` via `setModePhysique()`.

**Conséquence** : si on masque Physique (#29) sans rien changer d'autre, le QR — gaté sur `mode-physique` — disparaît complètement. Il faut donc **découpler le QR du mode physique** dans le même lot.

## Décisions de design (validées)

1. **Masquer Physique** = cacher **toute l'étape 2** « Type de tirage » + le toggle, et forcer `tirage=aleatoire`. (Pas juste cacher le bouton — une étape à un seul choix serait absurde.)
2. **Temporaire / flag** : un seul flag réactivable en 1 ligne. **Aucun code Physique supprimé.**
3. **QR mobile** : visible en **mode local, tout tirage** (le QR pointe vers une carte locale ; il n'a de sens qu'en jeu local en personne, pas en online où les joueurs rejoignent déjà la vraie partie).

## Conception

### 1. Flag unique — `data.js`

Source unique de vérité, à côté de `CONFIG`/`CLANS` (le foyer de config partagé du jeu) :

```js
// support #29 — masquer le mode « tirage physique » avant présentation.
// Repasser à true pour tout restaurer (config + meneur), aucun code n'est supprimé.
const TIRAGE_PHYSIQUE_ACTIF = false;
```

`data.js` est du pur `const`/fonctions sans effet de bord DOM → chargeable sans risque dans la page de config.

### 2. `meneur-config.html` — masquer l'étape « Type de tirage » (#29)

- Charger `data.js` **avant** le script inline (sinon `TIRAGE_PHYSIQUE_ACTIF` indéfini). Actuellement la page charge seulement `i18n.js`, `auth-widget.js`, `_widget-loader.js`.
- Au chargement, si `!TIRAGE_PHYSIQUE_ACTIF` :
  - masquer toute la section de l'étape 2 (le `<div class="section">` contenant `<h2 data-step="2" data-i18n="config.tirage">`) ;
  - forcer `choices.tirage = 'aleatoire'` puis `updateStartBtn()` → le bouton « Commencer » s'active avec Mode + Clan seuls ;
  - renuméroter l'étape Clan : passer son `data-step` de `"3"` à `"2"` (le numéro est rendu via `content: attr(data-step)` en CSS, meneur-config.html:82-83), pour afficher 1 → 2 et non 1 → 3.
- Le pré-remplissage existant depuis URL/localStorage reste inchangé ; si un `tirage` traîne en localStorage, on le neutralise en forçant `aleatoire`.

### 3. `meneur.html` — QR mobile en local + garde-fou Physique

- **CSS** : remplacer la règle d'affichage du bouton par une règle « mode local » :

  ```css
  /* avant */
  body.mode-physique .btn-qr-mobile { display: inline-flex; }
  /* après */
  body:not(.mode-online) .btn-qr-mobile { display: inline-flex; }
  ```

  `setMode('online')` pose `body.mode-online`, `setMode('local')` le retire (toggle). Donc `:not(.mode-online)` = mode local, quel que soit le tirage → règle #21 + #22. Mettre à jour le commentaire CSS au-dessus (lignes 620-622) qui dit « Visible UNIQUEMENT en mode physique ».

- **Garde-fou** dans l'IIFE de config-URL (meneur.html:1516-1570) : si `!TIRAGE_PHYSIQUE_ACTIF`, ignorer le param `tirage` et appeler `setModePhysique(false)` quoi qu'il arrive — protège contre un vieux `localStorage` ou une URL bookmarkée `?tirage=physique`.

- **Bandeau compact** (`insertCompactBandeau`, span3 ~meneur.html:1597 affiche `tirage === 'physique' ? '🃏 Physique' : '🎲 Aléatoire'`) : si `!TIRAGE_PHYSIQUE_ACTIF`, masquer la pastille tirage (toujours aléatoire = bruit). `meneur.html` charge déjà `data.js` → le flag est disponible.

## Couverture des tickets

| Ticket | Résolu par |
|---|---|
| #21 — QR absent en local aléatoire | §3 CSS (`:not(.mode-online)`) |
| #22 — QR doit être dispo en aléatoire | §3 CSS (même règle) |
| #29 — masquer Physique | §1 flag + §2 config, réactivable en 1 ligne |

## Vérification

Pas de framework de test DOM dans ce repo → vérification manuelle en lançant localement (`npm start`, http://localhost:3000) :

1. **Config** (`meneur-config.html`) : l'étape « Type de tirage » n'apparaît plus ; les étapes lisent 1 (Mode) puis 2 (Clan) ; « Commencer » s'active après avoir choisi Mode + Clan.
2. **QR en aléatoire** : ouvrir `meneur.html?mode=local&tirage=aleatoire&clan=Chevreuil` → le bouton « 📱 QR carte mobile » est visible ; le popup affiche un QR pointant vers `joueur.html?mode=local&clan=Chevreuil`.
3. **Online inchangé** : en `mode=online`, le bouton QR mobile reste masqué (l'écran code/QR de jonction online est l'unique partage).
4. **Garde-fou** : `meneur.html?mode=local&tirage=physique&clan=Loup` ne doit PAS entrer en mode physique (pas de cases cliquables « deck », bouton Tirer présent).
5. **Réactivation** : repasser `TIRAGE_PHYSIQUE_ACTIF = true` restaure l'étape 2 et le comportement physique d'origine.

## Hors scope

- Aucune suppression du code/CSS du mode physique (il reste dormant).
- Pas de refonte du flux de tirage ni de la popup QR.
- Annonce Support à Sylvain (#29/#21/#22) et déploiement VPS : étapes post-implémentation, pas dans cette spec.
