# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

**WENDIO** is a **trilingual linguistic revitalization game** — a bingo-style experience designed to teach Wendat numbers through play. Each number has three layers: the numeral, the authentic Wendat term, and a phonetic guide in French/English.

> **Naming**: The game was originally called WENDAO but was renamed **WENDIO** at the request of the Wendat people. All files and code use the WENDIO name.

## Dépôt

- GitHub : https://github.com/jeffze/wendio
- Branche principale : `main`

## Running the Project

The project requires a Node.js server for multiplayer (Socket.io). Static-only mode works without a server for offline play.

```bash
# Install dependencies (first time only)
npm install

# Start the server
npm start
# → http://localhost:3000
```

Then open `http://localhost:3000` (redirects to `lobby.html`).

## Architecture

### Entry Point

**`lobby.html`** — Landing page with navigation to the three modes:
- Meneur de Jeu (`meneur.html`)
- Cartes à imprimer (`imprimer.html`)
- Carte numérique joueur (`joueur.html`)

### Files

| File | Role |
|------|------|
| `lobby.html` | Main entry — navigation hub |
| `meneur.html` | Game master: draws numbers, broadcasts via Socket.io |
| `joueur.html` | Player card: marks numbers, declares victory |
| `imprimer.html` | Generates 4 random cards on an A4 page for printing |
| `data.js` | Shared game data: grid config, clans, Wendat vocabulary, card generation |
| `server.js` | Node.js + Express + Socket.io multiplayer server |
| `qrcode.min.js` | QR code generation library (used by meneur to share game code) |
| `script.js` / `style.css` | Legacy stubs — **not used**; all logic and styles are inline |
| `sound/` | WAV audio files named `Wendat numbers {num}.wav` |
| `Manual/` | Documents de référence : présentations PPTX, canevas carte, vidéo démo |

### Multiplayer (Socket.io)

The server manages game sessions identified by a 4-character code (e.g. `AB3K`):

| Event (client → server) | Meaning |
|--------------------------|---------|
| `creer` | Meneur creates a new game; server replies `partie-creee` with the code |
| `rejoindre` `{ code, nom, clan }` | Player joins; server replies `rejoint` with existing draws |
| `tirer` `{ code }` | Meneur draws a number; server broadcasts `numero-tire` to all |
| `victoire` `{ code, nom, clan }` | Player declares win; server broadcasts `gagnant` with rank |
| `terminer` `{ code }` | Meneur ends the game; server broadcasts `partie-terminee` |

If the meneur disconnects, the server automatically closes the game and notifies all players.

**Offline mode**: both `meneur.html` and `joueur.html` have a local/online toggle. In local mode, Socket.io is not used.

## Grid Anatomy

The grid is 6×6, columns labeled **W-E-N-D-I-O** (note: **I**, not A):

| Column | Range | Numbered cells |
|--------|-------|----------------|
| W | 1–12 | 6 |
| E | 13–24 | 6 |
| N | 25–36 | 4 (+ 2 heart cells at cols 2–3) |
| D | 37–48 | 4 (+ 2 heart cells at cols 2–3) |
| I | 49–60 | 6 |
| O | 61–72 | 6 |

**4 heart cells** (`Le Cœur`) sit at N×cols2-3 and D×cols2-3 — always free, show clan icons. `estCoeur(ligne, colIdx)` in `data.js` identifies them.

`valeurCase(carte, ligne, colIdx)` in `data.js` resolves cell values, handling the N/D column gap (cols 2–3 skipped → data indices shift).

## The 4 Clans

| Clan | Wendat Name | Victory | Points |
|------|-------------|---------|--------|
| Chevreuil 🦌 | Ohskénonton' | One complete row (6 cells) | 1 pt |
| Loup 🐺 | Yānariskwa' | All 4 corners | 2 pts |
| Ours 🐻 | Yānionyen' | 12-cell protective ring around center | 3 pts |
| Tortue 🐢 | Yāndia'wich | All 32 numbered cells | 4 pts |

The 4 center heart cells display clan icons (🐢🐻🐺🦌) — they are not just free spaces, they incarnate the clans.

## Key Functions

### `data.js` (shared)
- `genererCarte()` — generates a random player card
- `valeurCase(carte, ligne, colIdx)` — resolves cell value, null = heart cell
- `estCoeur(ligne, colIdx)` — true if the cell is a heart cell
- `ligneDeNumero(num)` — returns the column letter (W/E/N/D/I/O) for a given number
- `jouerSon(num)` — plays `Sound/Wendat numbers {num}.wav`, fails silently

### `meneur.html`
- `setMode(mode)` — toggles between `local` and `online` modes
- `setModePhysique(physique)` — toggles between `aléatoire` and `physique` draw modes; adds/removes `body.mode-physique` class
- `creerPartie()` — emits `creer` to server (online mode)
- `actionTirer()` — draws a random number (locally or via socket); hidden in physical mode
- `afficherCarte(num)` — adds `.visible` class to `#carte-numero` (never sets `style.display` directly — the class drives both portrait `display:block` and landscape `display:flex`)
- `afficherGagnant(nom, clan, rang)` — shows win overlay + adds entry to classement bandeau
- `resetJeu()` — resets game state; removes `.visible` from `#carte-numero`

**Mode physique** (`body.mode-physique`) : le bouton "Tirer" est caché via CSS. Chaque case non-tirée de `#suivi-grille` est cliquable (cursor pointer + hover doré). Cliquer une case non-tirée appelle `tirages.push(num)` + `afficherCarte` + `jouerSon` + `mettreAJourSuivi`. Cliquer une case déjà tirée rejoue le son (comportement identique aux deux modes).

### `joueur.html`
- `setMode(mode)` — toggles local/online setup panels
- `commencerLocal()` — generates card, switches to game view
- `basculerVersJeu()` — hides title/toggle/setup, shows `#vue-jeu`
- `nouvellePartie()` — resets all state, returns to setup view
- `demarrer()` — init; auto-activates online mode if `?code=` param present
- `validerFormulaire()` — validates name + clan before joining
- `rejoindrePartie()` — emits `rejoindre` to server
- `marquerNumero(num)` — marks a called number on the card
- `setClan(nom)` — sets active clan, highlights target cells via `estCible()`
- `rendreGrille()` — renders the card grid into the DOM
- `verifierVictoire()` — checks win condition for active clan after each mark
- `declarerVictoire()` — emits `victoire` to server
- `afficherInfoNumero(num)` — affiche la carte complète du numéro dans `#annonce` (badge colonne coloré, numéro, nom Wendat, phonétique, fr/en) ; appelée au clic sur toute case non-cœur et à chaque `numero-tire` online
- `rejouerSon()` — rejoue le son du `dernierNumeroClique`

## Layout paysage (tablette)

Les deux fichiers sont optimisés pour tablette en mode paysage (`@media (orientation: landscape) and (min-height: 400px)`).

**`meneur.html`** — deux colonnes via `body { display: flex; align-items: stretch }` :
- `#colonne-gauche` (260px) : titre, toggles (local/online + aléatoire/physique), bouton tirer, carte numéro tiré
- `#tableau` (flex: 1) : grille de suivi W-E-N-D-I-O avec `grid-auto-rows: 1fr` pour que les lignes remplissent toute la hauteur
- La hauteur totale est dictée par la colonne gauche (contenu naturel). Avant le premier tirage : aucun espace réservé pour la carte (`#carte-numero` reste `display:none` jusqu'à `.visible`)
- Après tirage : `#carte-numero.visible { flex: 1 }` remplit l'espace restant à gauche ; le tableau de droite s'étire à la même hauteur via `align-items: stretch`

**`joueur.html`** — deux phases :
- **Setup** : toggle local/en ligne + sélection clan ou saisie code, plein écran centré
- **Jeu** : `#vue-jeu` en flex-row (paysage) — sidebar gauche 200px (badges, `#annonce` avec info numéro complet, bouton WENDIO) + grille droite flex:1

## Grilles de jeu

Les chiffres dans les deux grilles utilisent la police **Cinzel** (même que le titre) en `font-weight: 900` pour maximiser la lisibilité dans un contexte d'apprentissage linguistique.

- `meneur.html` `.suivi-cell` : `font-size: 1rem`, Cinzel — 12 colonnes par ligne (plage 1–12 par lettre)
- `joueur.html` `.cell` : `font-size: 1.35rem`, Cinzel — 6 colonnes, `aspect-ratio: 1/1`

## Versions futures

L'architecture est prévue pour supporter plusieurs thèmes (animaux, couleurs, etc.) au-delà des chiffres. Le vocabulaire est centralisé dans `data.js` — chaque thème futur aura son propre fichier de données interchangeable.

## Audio

WAV files in `sound/` are named `Wendat numbers {num}.wav`. **All 72 numbers have audio (1–72), plus 3 bonus files (73, 74, 75).** `jouerSon(num)` plays the file and fails silently if missing. The full vision is **3-in-1 audio**: Wendat → French → English per number (current files are Wendat only).
