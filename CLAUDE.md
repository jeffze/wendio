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

**`index.html`** — Cover splash (concept « Feu de conseil ») : la couverture client `couverture.png` encadrée et flottante sur fond chaud avec particules braises animées. Bouton « COMMENCER → » ou clic / tap / Entrée / Espace → `lobby.html`. L'ancienne landing animée 4 clans est sauvée dans `accueil.html` (non liée).

**`lobby.html`** — Hub de navigation (atteint après la couverture) :
- Meneur de Jeu (`meneur.html`)
- Cartes à imprimer (`imprimer.html`)
- Trophées à imprimer (`imprimer-trophees.html`)
- Carte numérique joueur (`joueur.html`)
- Mode Démo (`demo.html`)

### Files

| File | Role |
|------|------|
| `index.html` | Page de couverture client (splash « Feu de conseil ») |
| `accueil.html` | Backup : ancienne landing animée 4 clans (non liée mais accessible) |
| `couverture.png` | Image officielle de couverture fournie par le client |
| `lobby.html` | Hub de navigation après la couverture |
| `meneur.html` | Game master: draws numbers, broadcasts via Socket.io |
| `joueur.html` | Player card: marks numbers, declares victory |
| `imprimer.html` | Generates 4 random cards on an A4 page for printing |
| `imprimer-trophees.html` | Page d'impression des cartes-trophées par clan, avec nom du gagnant optionnel + date (1 trophée par page A4, sélection multi-clans = N pages) |
| `demo.html` | Mode démo : sélection de scénario avec config automatique |
| `data.js` | Shared game data: grid config, clans, Wendat vocabulary, card generation |
| `i18n.js` | Toggle FR/EN injecté automatiquement en haut à droite de chaque page ; dictionnaire centralisé, persistance `localStorage['wendio-lang']`, hook `i18n.onLangChange(cb)` pour ré-render les textes composés (cf. section i18n) |
| `server.js` | Node.js + Express + Socket.io multiplayer server (bind `HOST` env var, défaut `0.0.0.0` en dev, `127.0.0.1` en prod via systemd) |
| `qrcode.min.js` | QR code generation library (used by meneur to share game code) |
| `script.js` / `style.css` | Legacy stubs — **not used**; all logic and styles are inline |
| `cartes/` | 72 cartes numérotées + 4 cartes-trophées clan (`clan-{1..4}pt.jpg`) |
| `sound/` | WAV audio files named `Wendat numbers {num}.wav` |
| `sources/` | PNG des 4 animaux clans (utilisés dans `accueil.html`) |
| `scripts/export-cartes.js` | Conversion `D:/Carte Wendio/*.png` → `cartes/*.jpg` (sharp, qualité 85). Sans filtre — le client gère le rendu côté source |
| `deploy/` | Scripts de déploiement VPS Ubuntu 24.04 dédié jeux Sylvain : `setup-vps.sh`, `Caddyfile`, `wendio.service`, `install-wendio.sh`, `deploy.sh` (cf. section Déploiement) |
| `Manual/` | Documents de référence (gitignored) : PPTX, PDFs règles, vidéo démo |

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
| Chevreuil 🦌 | Ohskënonton' | One complete line: horizontal, vertical, or main diagonal (4–6 cells, hearts count as free) | 1 pt |
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
- `setMode(mode)` — toggles `local` ↔ `online`. Pose `body.mode-online` (CSS cache `#btn-creer-partie` hors online). Le bouton TIRER reste désactivé tant que la partie n'est pas prête (online : jusqu'à `commencerPartie()` ; local : jusqu'au choix de clan)
- `setModePhysique(physique)` — toggles between `aléatoire` and `physique` draw modes; adds/removes `body.mode-physique` class
- `genererBoutonsClanMeneur()` / `choisirClanMeneur(nom)` — UI de sélection du clan **imposé** (4 boutons radio), **en local comme en online** (Sylvain feedback 2026-05-04 : « aucun numéro ne peut être tiré sans ce choix »). Les boutons sont toujours visibles dans la sidebar
- `creerPartie()` — emits `creer` with `{ clan: clanChoisi }` (bouton désactivé tant qu'aucun clan choisi, visible uniquement en mode online)
- `commencerPartie()` — emits `demarrer` ; cache `#zone-code` (code + lien), `#qr-bloc`, `#barre-connexion` (toggle Local/En ligne) et `#barre-tirage` (toggle Aléatoire/Physique) ; affiche le pill `#status-online` « 🌐 Partie en ligne » à la place ; **active `#btn-tirer`**. Toggles immutables une fois la partie lancée. Restauration auto via `nouvellePartieMeneur()`.
- `actionTirer()` — draws a random number (locally or via socket); hidden in physical mode ; early return si `partieTerminee` ou `!clanChoisi`
- `clanLabel(nom)` — helper i18n : retourne le label de victoire traduit (`t('clan.<nom>.victoire')`) avec fallback sur `CLANS[nom].label`
- `afficherCarte(num)` — adds `.visible` class to `#carte-numero` (never sets `style.display` directly — the class drives both portrait `display:block` and landscape `display:flex`)
- `afficherGagnant(nom, clan)` — shows win overlay (un seul gagnant par partie, plus de rang) ; affiche aussi la carte-trophée `cartes/clan-{points}pt.jpg` dans `#win-trophee` selon `CLANS[clan].points`
- `terminerCoteMeneur(raison)` — handler de `partie-terminee` ; désactive btn-tirer ; transforme btn-arreter en bouton vert "🔄 Nouvelle partie" ; **fallback overlay** si raison='gagnant' et overlay non visible
- `nouvellePartieMeneur({ skipTerminer })` — reset complet, retour à l'écran de choix de clan ; restaure btn-arreter dans son état initial
- `resetJeu()` — resets game state; removes `.visible` from `#carte-numero`

**Mode physique** (`body.mode-physique`) : le bouton "Tirer" est caché via CSS. Chaque case non-tirée de `#suivi-grille` est cliquable (cursor pointer + hover doré). Cliquer une case non-tirée appelle `tirages.push(num)` + `afficherCarte` + `jouerSon` + `mettreAJourSuivi`. Cliquer une case déjà tirée rejoue le son (comportement identique aux deux modes).

### `joueur.html`
- `setMode(mode)` — toggles local/online setup panels
- `commencerLocal()` — generates card, switches to game view (clear les selections persistées d'une éventuelle partie précédente)
- `basculerVersJeu()` — hides title/toggle/setup, shows `#vue-jeu`
- `nouvellePartie()` — resets all state, returns to setup view (mode local uniquement — voir `quitterPartie()` pour le mode online) ; clear `selectionnees` + `sessionStorage`
- `quitterPartie()` — disconnect socket + clear `sessionStorage['wendio-token']` + `clearSelections()` + redirect vers `lobby.html`. Appelé depuis le win-overlay.
- `demarrer()` — init; auto-activates online mode if `?code=` param present
- `validerFormulaire()` — validates name only (le clan est imposé par le meneur en mode online)
- `rejoindrePartie()` — emits `rejoindre` with `{ code, nom, sessionToken }` ; le bouton est désactivé après le 1er click (anti double-click)
- `setClan(nom)` — local mode only ; sets active clan, highlights target cells via `estCible()` ; pose `dataset.clan` sur `#objectif` pour la re-traduction i18n ; en online le clan vient du serveur via l'event `rejoint`
- `clanLabel(nom)` / `objectifTexte(nom)` — helpers i18n pour les textes composés (label victoire, objectif complet avec points)
- `rendreGrille()` — renders the card grid into the DOM
- `verifierVictoire()` — checks win condition for active clan after each mark ; affiche le bouton WENDIO! (online) ou directement le win-overlay (local)
- `declarerVictoire()` — emits `victoire { code }` ; le serveur valide la carte avant d'accepter
- `afficherGagnant(nom, clan, isMoi)` — overlay vert ; texte différent si `isMoi` (« Bravo X ! ») ou non (« X a gagné ») ; affiche la carte-trophée `cartes/clan-{points}pt.jpg` (Chevreuil=1pt, Loup=2pt, Ours=3pt, Tortue=4pt) avec animation pop ; persiste `{nom, clan, isMoi}` dans `dataset.gagnant` pour re-traduction
- `afficherInfoNumero(num)` — affiche la carte complète du numéro dans `#annonce` ; appelée au clic sur toute case non-cœur et à chaque `numero-tire` online
- `rejouerSon()` — rejoue le son du `dernierNumeroClique`
- `persistSelections()` / `loadSelections()` / `clearSelections()` — persistance `selectionnees` dans `sessionStorage['wendio-selections-<sessionToken>']` (cf. section ci-dessous)

#### Marquage manuel + anti-triche (Sylvain feedback 2026-05-04)

Le joueur marque sa carte **lui-même** au tap (et non plus auto-marquage sur `numero-tire`). Le tap appelle `cell.onclick` qui valide `peutMarquer = !modeOnline || tiresOnline.includes(val)` avant de toggle `selectionnees`. Le son et l'affichage de la carte restent libres. La case devient `.auto-marque` (fond pâle) tant que le joueur n'a pas cliqué — visuellement distincte de `.marque` (grain de maïs en coin haut-droit).

Le handler `socket.on('numero-tire')` ne joue plus le son ni n'auto-marque : seulement `tiresOnline.push` + `rendreGrille`. Évite la cascade de sons sur tous les téléphones d'une même salle.

#### Persistance des sélections joueur

Les cases marquées par le joueur sont sauvées dans `sessionStorage['wendio-selections-<sessionToken>']` (JSON array). Restaurées par `loadSelections()` à la reconnexion silencieuse (téléphone qui sort de veille). Nettoyées par `clearSelections()` à `nouvellePartie()`, `commencerLocal()`, `quitterPartie()`.

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

Côté joueur, le son ne se déclenche qu'au **tap** d'une case ou de l'annonce-image — jamais en réponse à `numero-tire` broadcast. Sinon, dans une salle avec plusieurs téléphones, le son joue en cascade et devient parasite (Sylvain feedback 2026-05-04).

## i18n FR/EN

Toggle injecté automatiquement en haut à droite de chaque page via `i18n.js`. Persistance dans `localStorage['wendio-lang']`. Pages traduites : `lobby`, `meneur`, `joueur`, `imprimer`, `imprimer-trophees`, `demo`. Pages non traduites : `accueil.html` (backup non lié).

### API

- `data-i18n="key"` sur un élément → son `textContent` est traduit (pas d'innerHTML, XSS-safe)
- `data-i18n-attr="placeholder:key,title:key2"` → attributs traduits
- `t('key')` ou `t('key', { vars })` dans le JS → texte traduit avec placeholders `{var}`
- `i18n.setLang(lang)` → change la langue, persiste, ré-applique
- `i18n.onLangChange(cb)` → enregistre un callback appelé au changement de langue. Utilisé par les pages pour ré-render les textes composés (genre `Objectif : <label clan>`) qui ne sont pas couverts par `data-i18n` seul
- `i18n.applyTranslations()` → re-scan le DOM et applique. Appelé auto sur DOMContentLoaded et après `setLang`

### Conventions

- Les **noms de clans** (Chevreuil, Loup, Ours, Tortue) restent en français — termes culturels Wendat
- Les **mots Wendat** (Ohskënonton', etc.) restent inchangés
- Les **phonétiques** dans `data.js` (NOMBRES) restent FR pour le moment ; l'UI autour est traduite
- Les **labels de victoire** sont traduits via `clan.<Nom>.victoire` (les fonctions `clanLabel(nom)` côté meneur/joueur encapsulent le fallback sur `CLANS[nom].label`)
- Le texte hard-codé dans le HTML sert de **fallback français** : si JS désactivé OU clé absente du dictionnaire, on garde l'original

### Impression

Le toggle est masqué via `@media print { .lang-toggle { display: none !important; } }` (cf. CSS injecté par `i18n.js`).

## Déploiement (`deploy/`)

Cible : VPS WHC Ubuntu 24.04 LTS **dédié aux jeux Sylvain** (séparé du VPS compta pour isolation sécurité). Convention multi-jeux : chaque jeu vit dans `~/jeux/<jeu>/`, son propre service systemd, son port loopback dédié (5000, 5001, 5002…), un bloc Caddy par sous-domaine.

### Fichiers

| Fichier | Rôle | Où l'exécuter |
|---|---|---|
| `setup-vps.sh` | Bootstrap idempotent : Node 20 LTS + Caddy + UFW + fail2ban + Tailscale + structure dossiers | **1× sur le VPS**, en `darkvador` avec sudo |
| `Caddyfile` | Reverse proxy HTTPS auto (Let's Encrypt). Bloc `wendio.jeuxlirlok.com → 127.0.0.1:5000`, commentaire pour ajouter futurs jeux | Copié en `/etc/caddy/Caddyfile` par `install-wendio.sh` |
| `wendio.service` | systemd unit : `User=darkvador`, `Environment=PORT=5000 HOST=127.0.0.1 NODE_ENV=production`, durcissement (`ProtectSystem=strict`, `ProtectHome=read-only`, `NoNewPrivileges`) | Copié en `/etc/systemd/system/` par `install-wendio.sh` |
| `install-wendio.sh` | 1re installation : copie systemd unit + Caddyfile, activate au boot, démarre le service | **1× sur le VPS** après le 1er deploy |
| `deploy.sh` | rsync code (exclut `node_modules`, `.git`, `Manual/`, `deploy/`) + `npm ci --omit=dev` + restart systemd + healthcheck HTTP. Variables : `VPS_HOST=100.84.108.49`, `VPS_PORT=2243` | **Depuis le poste local**, à chaque push |
| `template-jeu.service` | Squelette systemd pour ajouter un futur jeu (placeholders `<JEU>`, `<PORT>`, etc.) | À copier-renommer-éditer puis déposer dans `/etc/systemd/system/<jeu>.service` |

### Note sécurité

UFW ouvre 80/443 **avant** le 1er démarrage Caddy (sinon Let's Encrypt rate-limite). UFW ouvre aussi `2243/tcp` (port SSH custom WHC) et autorise `tailscale0` + `100.64.0.0/10` (sinon la session Tailscale tombe dès l'activation du firewall). Le service tourne sous `darkvador` (jamais root).

### État du déploiement (2026-05-13)

**VPS WHC** « Apps VPS 2G » Ubuntu 24.04 LTS, conteneur **LXC** (pas KVM — visible via `zzz-lxc-service.conf` drop-in systemd) :
- Hostname : `cloud288212.mywhc.ca`
- IP publique : `23.27.253.63`
- IP Tailscale : `100.84.108.49` (device `cloud288212-wendio`, expiry désactivée, même tailnet que VPS Compta)
- Port SSH : **`2243`** (custom WHC après essais ratés du 11-13 mai, **pas 22**)
- User : `darkvador` (sudo avec mdp), root login désactivé, password auth désactivée — uniquement clé SSH
- Connexion : `ssh darkvador@100.84.108.49 -p 2243` (via Tailscale, indépendant du VPN)

**Services tournants** :
- `wendio.service` : Node 20.20.2 / server.js, écoute `127.0.0.1:5000`
- `caddy.service` : reverse proxy HTTPS auto sur ports 80/443, config dans `/etc/caddy/Caddyfile`
- `tailscaled.service` : mesh VPN, interface `tailscale0`
- `fail2ban.service` : actif, jail sshd par défaut (ban 1h après 5 tentatives ratées)

**DNS** :
- Domaine `jeuxlirlok.com` enregistré chez WHC (registrar), zone DNS gérée par **Cloudflare** depuis le 2026-05-14
- Nameservers actuels : `drew.ns.cloudflare.com` + `kelly.ns.cloudflare.com` (uniques au compte CF de JF)
- Historique : `parking1/2.whc.ca` → `ns1/2.whc.ca` (2026-05-13) → `drew/kelly.ns.cloudflare.com` (2026-05-14)
- A record : `wendio.jeuxlirlok.com → 23.27.253.63` (TTL 300), **proxifié via CF**
- Cert : 2 couches HTTPS — Cloudflare Universal SSL côté visiteur + Let's Encrypt en backend (Caddy)

**⚠ Limitation persistante — accès direct bloqué pour l'IP de JF** (depuis 2026-05-11) :
L'IP publique de JF (`207.96.200.53`, ISP COC Charlesbourg) reste droppée par le réseau iWeb/WHC au hop 6 (`184.107.194.135`) pour `23.27.253.63` tous protocoles. Ticket WHC stagne. **Workaround permanent en place** :
- **HTTP/HTTPS** : passe par Cloudflare anycast (`104.x` / `172.x`) que WHC ne bloque pas → accès admin restauré sans VPN depuis 2026-05-14
- **SSH** : via Tailscale `100.84.108.49:2243` (filet de secours indépendant)

**Étapes de bootstrap historiques (1× exécutées le 2026-05-13)** :
1. SSH root via VPN Toronto sur `23.27.253.63:2243`
2. Création user `darkvador` + sudo + dépose clé SSH `~/.ssh/id_ed25519.pub`
3. Installation Tailscale + `tailscale up`, IP `100.84.108.49` reçue
4. Validation SSH via Tailscale depuis hors VPN
5. Durcissement SSH : drop-in `/etc/ssh/sshd_config.d/99-hardening.conf` (`PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes`) + restart
6. Lancement `setup-vps.sh` (apt upgrade, Node 20, Caddy, UFW, fail2ban, Tailscale idempotent)
7. `git clone github.com/jeffze/wendio.git ~/jeux/wendio`, `npm ci --omit=dev`
8. `install-wendio.sh` (systemd unit + Caddyfile + démarrage service)
9. Caddyfile : `caddy:caddy` ownership sur `/var/log/caddy/wendio.log` (sinon reload fail permission denied)
10. DNS : NS du domaine basculés vers ns1/ns2.whc.ca + A record `wendio` → `23.27.253.63`

### Ajouter un nouveau jeu sur ce VPS

Convention multi-jeux : chaque jeu occupe un port loopback distinct (5001, 5002...), son propre service systemd, son propre sous-domaine `*.jeuxlirlok.com`. Procédure :

1. **DNS** (panel WHC cPanel → DNS Zone Editor) :
   - A record : `<jeu>.jeuxlirlok.com → 23.27.253.63` (TTL 300)
2. **Code** (sur le VPS) :
   ```bash
   cd ~/jeux && git clone <repo> <jeu>
   cd <jeu> && npm ci --omit=dev
   ```
3. **systemd** : copier `deploy/template-jeu.service` en remplaçant `<JEU>` et `<PORT>`, installer dans `/etc/systemd/system/<jeu>.service`
4. **Caddyfile** : ajouter un bloc dans `/etc/caddy/Caddyfile` :
   ```
   <jeu>.jeuxlirlok.com {
     reverse_proxy 127.0.0.1:<port>
     log { output file /var/log/caddy/<jeu>.log { roll_size 10mb roll_keep 5 } format console }
     encode gzip zstd
   }
   ```
   Puis : `sudo touch /var/log/caddy/<jeu>.log && sudo chown caddy:caddy /var/log/caddy/<jeu>.log`
5. **Activer** :
   ```bash
   sudo systemctl daemon-reload && sudo systemctl enable --now <jeu>
   sudo systemctl reload caddy
   ```
6. **Vérifier** : `curl -I https://<jeu>.jeuxlirlok.com` (laisse 30-60s à Caddy pour le cert Let's Encrypt)

### Cloudflare devant Caddy (livré 2026-05-14)

Ajouté pour contourner le blocage WHC persistant de l'IP de JF. Bonus : DDoS protection, cache edge, analytics.

**Architecture** :
```
Visiteur → CF anycast (104.x / 172.x) → 23.27.253.63:443 (Caddy + LE cert)
                                       → 127.0.0.1:5000 (Wendio Node)
```

**Mode SSL/TLS Cloudflare** : **Full (strict)** — CF présente son cert Universal au visiteur et valide le cert Let's Encrypt de Caddy en backend. Double HTTPS bout-en-bout. `Always Use HTTPS` ON (CF fait aussi sa propre redirection HTTP→HTTPS au niveau edge, redondant avec Caddy mais OK).

**Records DNS — proxy status** :

| Record | Proxy | Pourquoi |
|---|---|---|
| `wendio` (A → `23.27.253.63`) | **Proxied ☁️ (orange)** | Le seul qui bénéficie de l'anycast CF + DDoS protection |
| `jeuxlirlok.com` apex (A → `158.69.17.252`) | DNS only | Hébergement WHC shared de Sylvain — site vitrine |
| `www` (CNAME) | DNS only | Idem apex |
| `mail`, `webmail`, `cpanel`, `cpcalendars`, `cpcontacts`, `webdisk`, `whm`, `ftp` | **DNS only OBLIGATOIRE** | CF proxy ne supporte que HTTP/HTTPS. IMAP/SMTP/FTP/cPanel/WebDAV cassent si proxifiés |
| `MX`, `SPF`, `DKIM`, `DMARC` (TXT) | DNS only (auto) | CF ne proxifie jamais ces types |

⚠️ **Risque connu — bypass possible** : l'origine `23.27.253.63` reste accessible publiquement. Un attaquant qui la connaît peut bypass CF et taper Caddy en direct. Pour sceller (todo plus tard, pas urgent) : restreindre Caddy aux IPs Cloudflare via UFW + `trusted_proxies cloudflare` Caddyfile. Liste des IPs CF : `https://www.cloudflare.com/ips-v4/`.

#### Ajouter un nouveau jeu — étape Cloudflare en plus

Quand tu ajoutes un 2ᵉ jeu (voir section « Ajouter un nouveau jeu sur ce VPS » plus haut), au moment du DNS :

1. **Dashboard Cloudflare** → site `jeuxlirlok.com` → **DNS → Records** → **Add record**
2. Type `A`, Name `<jeu>`, IPv4 `23.27.253.63`, **Proxy status : Proxied (orange)**, TTL Auto
3. Save. La propagation est instantanée côté CF (pas d'attente NS).
4. Cert SSL : CF Universal SSL couvre `*.jeuxlirlok.com` automatiquement, valide en quelques minutes.

### Troubleshoot DNS / cache — patterns observés

Quand tu changes un record dans Cloudflare ou bascules un proxy status, et que le ping/navigateur retourne encore l'ancienne IP :

**1. Confirmer que CF a bien la nouvelle valeur** (vérité externe via check-host.net) :
```bash
curl -s "https://check-host.net/check-http?host=https://wendio.jeuxlirlok.com&max_nodes=6" -H "Accept: application/json"
# attendre 10s
curl -s "https://check-host.net/check-result/<request_id>"
```
Si check-host retourne des IPs CF depuis tous les nœuds, le proxy CF fonctionne — c'est local qui cache.

**2. Cache `1.1.1.1` est lent à invalider** sur ses propres zones (paradoxal). Tester avec un autre résolveur :
```powershell
Resolve-DnsName <domaine> -Server 8.8.8.8 -DnsOnly
Resolve-DnsName <domaine> -Server 9.9.9.9 -DnsOnly
```
`8.8.8.8` ou `9.9.9.9` propagent souvent plus vite que `1.1.1.1` lui-même.

**3. DNS Windows hérité du router DHCP** : `ipconfig /flushdns` ne suffit pas si le router pousse son DNS. Changer manuellement DNS Windows à `8.8.8.8` / `8.8.4.4` (Settings → Network → Edit DNS server → Manual IPv4).

**4. Chrome marche en incognito mais pas en mode normal → HSTS sticky** dans le profil utilisateur. Fix :
- `chrome://net-internals/#hsts` → « Delete domain security policies » → entrer `<domaine>`
- `chrome://net-internals/#dns` → « Clear host cache »
- `chrome://net-internals/#sockets` → « Flush socket pools »
- Fermer **tous** les processus `chrome.exe` (Task Manager) et relancer

Firefox utilise son propre store et n'a généralement pas ce problème (à utiliser pour valider que le serveur est OK pendant qu'on debug le cache Chrome).

**5. Hosts override oublié** : vérifier `C:\Windows\System32\drivers\etc\hosts` pour des lignes manuelles qui pin une IP (héritage de tests précédents).

### Audit sécurité approfondi (livré 2026-05-13)

VPS durci niveau CIS Benchmark adapté à un container LXC. Tout est rejouable via `deploy/post-bootstrap.sh` après un rebuild from scratch.

**Système** :
- Sudoers `90-incus` vidé (le template cloud image WHC créait une règle `ubuntu ALL=(ALL) NOPASSWD:ALL` — piège latent même si user inexistant)
- `unattended-upgrades` installé, security patches seulement (Tailscale/Caddy/Node exclus par pinning, restent manuels via `sudo apt update && sudo apt upgrade`)
- SSH durci via drop-in `/etc/ssh/sshd_config.d/99-hardening.conf` : `PermitRootLogin no`, `PasswordAuthentication no`, `PubkeyAuthentication yes`
- Sysctl strict via `/etc/sysctl.d/99-security.conf` : `rp_filter=1`, `tcp_syncookies=1`. `kernel.kptr_restrict` et `kernel.dmesg_restrict` rejetés en LXC (kernel shared host), fichier conservé pour fallback KVM
- fail2ban : 2 jails actives — `sshd` (5 essais en 10 min → ban 10 min) + **`recidive`** (5 bans en 24h → ban 1 semaine, via UFW)
- UFW : `2243/tcp`, `80/tcp`, `443/tcp` + autorisation totale sur `tailscale0` et `100.64.0.0/10`

**Caddy** :
- `admin off` dans options globales (l'API admin sur 127.0.0.1:2019 est désactivée — utiliser `sudo systemctl restart caddy` au lieu de `reload`)
- Snippet `(security-headers)` réutilisable : HSTS 6 mois, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy (caméra/micro/geo/payment/usb/cohort désactivés), `-Server` (header caché)
- CSP par site : `default-src 'self'` + Google Fonts + WebSocket `wss://`. `'unsafe-inline'` conservé pour les `<script>`/`<style>` inline (refactor nonces = chantier futur)

**App Wendio** :
- `app.disable('x-powered-by')` : cache le header Express
- `MAX_PARTIES = 50` : limite anti-DOS sur création de parties simultanées
- Système feedback **supprimé** (était `/api/feedback`, `/api/feedback-list`, `feedback-admin.html` — exposait publiquement les commentaires sans auth)
- Validation inputs : whitelist clan, slice nom 20 char, slice token 64 char, body JSON 100kb max
- Anti-troll victoire : validation serveur-side (`victoireValide()`)
- `npm audit` prod : 0 vulnérabilités

**Wendio systemd** drop-in `/etc/systemd/system/wendio.service.d/limits.conf` :
- `MemoryMax=512M` : OOM-kill si Node leak ou attaque
- `TasksMax=100` : empêche fork-bomb

### Runbook incident

**Si Wendio crash en pleine partie** :
- `systemd` Restart=always → recovery automatique en 3 sec
- Vérifier : `sudo journalctl -u wendio -n 50` (logs des 50 dernières lignes)
- Si crash répété : `sudo systemctl status wendio` pour voir Restart count, puis lire les logs Node

**Si Caddy down (HTTPS inaccessible)** :
- `sudo systemctl status caddy` puis `sudo journalctl -u caddy -n 30`
- Si problème de cert Let's Encrypt : `sudo journalctl -u caddy | grep -i acme | tail -20`
- Restart : `sudo systemctl restart caddy`

**Si compromis suspecté** :
1. **Couper l'accès public** : `sudo ufw disable` (HTTPS down mais SSH via Tailscale reste OK)
2. **Inspecter** : `sudo fail2ban-client banned`, `sudo last`, `sudo journalctl -u ssh --since "24 hours ago"`, `sudo ss -tnp`
3. **Snapshot des logs** : `sudo cp -r /var/log /tmp/forensic-$(date +%s)` puis `tar czf` + télécharger
4. **Rotation des secrets** : changer mdp `darkvador`, regen clé SSH côté local, redéployer
5. **Nuclear option** : détruire le VPS via panel WHC, recréer un nouveau VPS, rejouer `setup-vps.sh` + `post-bootstrap.sh` + `git clone wendio` + `install-wendio.sh`. Temps de recovery ≈ 30 min.

**Monitoring externe à mettre en place (todo)** :
- UptimeRobot (gratuit, 50 monitors) : ping HTTPS sur chaque jeu toutes les 5 min, alerte email si down
- Healthcheck simple : `GET https://wendio.jeuxlirlok.com` doit retourner 200

**Rebuild from scratch** (référence) :
```bash
# Sur un nouveau VPS Ubuntu 24.04 LTS, en darkvador avec sudo :
bash setup-vps.sh          # Bootstrap : Node + Caddy + UFW + Tailscale + fail2ban
sudo tailscale up          # Lier au compte Tailscale
bash post-bootstrap.sh     # Durcissement (sudoers, SSH, sysctl, fail2ban recidive, wendio limits)
cd ~/jeux && git clone https://github.com/jeffze/wendio.git
cd wendio && npm ci --omit=dev
sudo bash deploy/install-wendio.sh  # systemd unit + Caddyfile + start
```
