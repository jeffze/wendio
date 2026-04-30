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

The server manages game sessions identified by a 4-character code (e.g. `AB3K`).
État stocké en mémoire dans `parties: Map<code, { maitre, clan, tirages, joueurs, tokenIndex, cartes, demarree, terminee }>`.

#### Events client → serveur

| Event | Payload | Émetteur | Effet |
|-------|---------|----------|-------|
| `creer` | `{ clan }` | meneur | crée la partie avec le clan **imposé** ; reply `partie-creee` |
| `rejoindre` | `{ code, nom, sessionToken }` | joueur | rejoint ou **se reconnecte** ; reply `rejoint` avec `{ tirages, clan, carte }` |
| `demarrer` | `{ code }` | meneur | clôt les inscriptions ; broadcast `partie-demarree` |
| `tirer` | `{ code }` | meneur | tire un numéro ; broadcast `numero-tire` |
| `victoire` | `{ code }` | joueur | déclare victoire ; **validée serveur-side** ; broadcast `gagnant` + `partie-terminee` au 1er valide |
| `terminer` | `{ code }` | meneur | force la fin ; broadcast `partie-terminee` |

#### Events serveur → clients

| Event | Cible | Payload |
|-------|-------|---------|
| `partie-creee` | meneur | `{ code, clan }` |
| `rejoint` | joueur | `{ tirages, clan, carte }` |
| `joueur-connecte` | meneur | `{ nom, clan, count }` |
| `joueur-reconnecte` | meneur | `{ nom, count }` (token retrouvé, pas de doublon) |
| `joueur-deconnecte` | meneur | `{ nom, count }` (count stable — peut revenir via token) |
| `partie-demarree` | tous | (sans payload) |
| `numero-tire` | tous | `{ num }` |
| `gagnant` | tous | `{ nom, clan }` |
| `partie-terminee` | tous | `{ raison: 'gagnant' \| 'meneur' \| 'meneur-deco' }` |
| `tous-tires` | tous | (72 numéros tirés) |
| `erreur` | émetteur | `string` |

#### Règles invariantes du flow online

1. **Clan imposé** : le meneur choisit un clan unique avant `creer`. Tous les joueurs jouent ce clan. Pas de sélection de clan côté joueur.
2. **Cartes uniques** : générées côté serveur avec déduplication par hash dans `partie.cartes` (Set). Pas de doublon possible dans une même partie.
3. **Premier gagnant = fin** : `victoire` valide → broadcast `gagnant` + `partie-terminee` immédiats, `partie.terminee = true`, partie supprimée. Plus aucune autre victoire acceptée.
4. **Anti-troll** : `victoire` est validée côté serveur — le socket doit être inscrit dans la partie ET sa carte doit réellement remplir la condition (`victoireValide(carte, clan, tirages)` reproduit la logique de `verifierVictoire` côté client).
5. **Reconnexion via sessionToken** : chaque joueur génère un UUID stocké en `sessionStorage` (clé `wendio-token`). À chaque `rejoindre`, le serveur cherche le token dans `partie.tokenIndex`. Si trouvé, il **migre l'entrée** vers le nouveau `socket.id` et renvoie la même carte. Le téléphone qui passe en veille retrouve sa partie sans perdre sa carte ni créer de doublon.
6. **Démarrage = inscriptions closes** : après `demarrer`, les nouveaux `rejoindre` sont refusés (sauf reconnexions par token déjà connu). Le code et le QR sont cachés côté UI meneur.
7. **Noms uniques par partie** (case-insensitive). Refus avec erreur claire si conflit.
8. **Disconnect joueur ≠ kick** : on garde l'entrée dans `partie.joueurs` avec `deconnecte: true`. Le compteur reste stable. Permet la reconnexion via token.
9. **Disconnect meneur = fin de partie** : si le meneur se déconnecte, broadcast `partie-terminee` raison `meneur-deco`, partie supprimée.

#### Validation côté serveur

- `creer.clan` : whitelist `{Chevreuil, Loup, Ours, Tortue}` (sinon `erreur`)
- `rejoindre.nom` : trim + slice(0, 20) + non vide
- `rejoindre.sessionToken` : slice(0, 64)
- `tirer` : `partie.maitre === socket.id` && `!partie.terminee`
- `victoire` : socket inscrit && carte remplit la condition pour `partie.clan`
- `terminer`, `demarrer` : `partie.maitre === socket.id`

`CLAN_VICTOIRE = { Chevreuil: 'ligne', Loup: 'coins', Ours: 'carre', Tortue: 'pleine' }` reproduit côté serveur. `victoireValide(carte, clan, tirages)` parcourt la grille selon le mode et retourne `true` ssi la condition est remplie. Idem `estCoeur` et `valeurCase` répliqués (depuis `data.js`).

Pour `'ligne'` (Chevreuil), la victoire accepte : (1) toute rangée horizontale, (2) toute colonne verticale, (3) la diagonale principale `\` (0,0)→(5,5), (4) la diagonale anti `/` (0,5)→(5,0). Les cases cœur (N2, N3, D2, D3) comptent comme libres dans toutes ces lignes — d'où des lignes effectives de 4 ou 6 cases selon le tracé.

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
| Chevreuil 🦌 | Ohskénonton' | One complete line: horizontal, vertical, or main diagonal (4–6 cells, hearts count as free) | 1 pt |
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
- `genererBoutonsClanMeneur()` / `choisirClanMeneur(nom)` — UI de sélection du clan **imposé** (4 boutons radio), avant la création de la partie
- `creerPartie()` — emits `creer` with `{ clan: clanChoisi }` (bouton désactivé tant qu'aucun clan choisi)
- `commencerPartie()` — emits `demarrer` ; cache `#zone-code` (code + lien) et `#qr-bloc` ; ne reste visible que la bannière clan + liste joueurs + bouton TIRER
- `actionTirer()` — draws a random number (locally or via socket); hidden in physical mode ; early return si `partieTerminee`
- `afficherCarte(num)` — adds `.visible` class to `#carte-numero` (never sets `style.display` directly — the class drives both portrait `display:block` and landscape `display:flex`)
- `afficherGagnant(nom, clan)` — shows win overlay (un seul gagnant par partie, plus de rang)
- `terminerCoteMeneur(raison)` — handler de `partie-terminee` ; désactive btn-tirer ; transforme btn-arreter en bouton vert "🔄 Nouvelle partie" ; **fallback overlay** si raison='gagnant' et overlay non visible
- `nouvellePartieMeneur({ skipTerminer })` — reset complet, retour à l'écran de choix de clan ; restaure btn-arreter dans son état initial
- `resetJeu()` — resets game state; removes `.visible` from `#carte-numero`

**Mode physique** (`body.mode-physique`) : le bouton "Tirer" est caché via CSS. Chaque case non-tirée de `#suivi-grille` est cliquable (cursor pointer + hover doré). Cliquer une case non-tirée appelle `tirages.push(num)` + `afficherCarte` + `jouerSon` + `mettreAJourSuivi`. Cliquer une case déjà tirée rejoue le son (comportement identique aux deux modes).

### `joueur.html`
- `setMode(mode)` — toggles local/online setup panels
- `commencerLocal()` — generates card, switches to game view
- `basculerVersJeu()` — hides title/toggle/setup, shows `#vue-jeu`
- `nouvellePartie()` — resets all state, returns to setup view (mode local uniquement — voir `quitterPartie()` pour le mode online)
- `quitterPartie()` — disconnect socket + clear `sessionStorage['wendio-token']` + redirect vers `lobby.html`. Appelé depuis le win-overlay.
- `demarrer()` — init; auto-activates online mode if `?code=` param present
- `validerFormulaire()` — validates name only (le clan est imposé par le meneur en mode online)
- `rejoindrePartie()` — emits `rejoindre` with `{ code, nom, sessionToken }` ; le bouton est désactivé après le 1er click (anti double-click)
- `marquerNumero(num)` — marks a called number on the card
- `setClan(nom)` — local mode only ; sets active clan, highlights target cells via `estCible()` ; en online le clan vient du serveur via l'event `rejoint`
- `rendreGrille()` — renders the card grid into the DOM
- `verifierVictoire()` — checks win condition for active clan after each mark ; affiche le bouton WENDIO! (online) ou directement le win-overlay (local)
- `declarerVictoire()` — emits `victoire { code }` ; le serveur valide la carte avant d'accepter
- `afficherGagnant(nom, clan, isMoi)` — overlay vert ; texte différent si `isMoi` (« Bravo X ! ») ou non (« X a gagné »)
- `afficherInfoNumero(num)` — affiche la carte complète du numéro dans `#annonce` (image PDF de la carte) ; appelée au clic sur toute case non-cœur et à chaque `numero-tire` online
- `rejouerSon()` — rejoue le son du `dernierNumeroClique`

#### sessionToken / reconnexion

- Chaque onglet joueur génère un UUID au boot, stocké dans `sessionStorage['wendio-token']` (vidé à fermeture d'onglet).
- Envoyé à chaque `rejoindre`. Permet au serveur de retrouver l'entrée si le socket s'est déconnecté.
- Sur l'event `connect` Socket.io (reconnexion auto), si le joueur était déjà inscrit (`clanActuel && nomJoueur && codePartie && !partieTerminee`), on ré-emit `rejoindre` automatiquement.
- Le handler `rejoint` détecte la **reconnexion silencieuse** (déjà en `vue-jeu` + `clanActuel` set) et remet juste à jour `tiresOnline` + `carteActuelle` sans repasser par le setup.
- `visibilitychange` listener force `socket.connect()` quand l'onglet revient au premier plan (téléphone qui sort de veille).
- Sur fin de partie ou abandon volontaire (`quitterPartie`), le token est supprimé pour éviter de réintégrer une partie déjà finie.

#### body.partie-terminee

CSS qui désactive les clics sur la grille et applique `opacity:.82` à `.bingo-grid`. Posée par le handler `partie-terminee` côté joueur. Permet de regarder sa carte en lecture seule après la fin sans pouvoir la modifier.

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
