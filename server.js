'use strict';
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app        = express();
const httpServer = http.createServer(app);
const io         = new Server(httpServer);

// Sert tous les fichiers statiques (HTML, JS, CSS, audio…)
app.use(express.static(path.join(__dirname)));

// ── Config grille (miroir de data.js) ────────────────────────────────
const LIGNES = ['W', 'E', 'N', 'D', 'I', 'O'];
const CONFIG = {
  W: { min:  1, max: 12, count: 6 },
  E: { min: 13, max: 24, count: 6 },
  N: { min: 25, max: 36, count: 4 },
  D: { min: 37, max: 48, count: 4 },
  I: { min: 49, max: 60, count: 6 },
  O: { min: 61, max: 72, count: 6 },
};
const CLANS_VALIDES   = new Set(['Chevreuil', 'Loup', 'Ours', 'Tortue']);
const CLAN_VICTOIRE   = { Chevreuil: 'ligne', Loup: 'coins', Ours: 'carre', Tortue: 'pleine' };

// Mêmes règles que data.js côté client (cases cœur N2,N3,D2,D3)
function estCoeur(ligne, colIdx) {
  return (ligne === 'N' || ligne === 'D') && (colIdx === 2 || colIdx === 3);
}
function valeurCase(carte, ligne, colIdx) {
  if (estCoeur(ligne, colIdx)) return null;
  if (ligne === 'N' || ligne === 'D') {
    return colIdx < 2 ? carte[ligne][colIdx] : carte[ligne][colIdx - 2];
  }
  return carte[ligne][colIdx];
}

// Vérifie qu'une carte remplit la condition de victoire pour un clan donné
function victoireValide(carte, clan, tirages) {
  const cond = CLAN_VICTOIRE[clan];
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

function genererCarte() {
  const carte = {};
  LIGNES.forEach(ligne => {
    const { min, max, count } = CONFIG[ligne];
    const pool = [];
    for (let i = min; i <= max; i++) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    carte[ligne] = pool.slice(0, count);
  });
  return carte;
}

function carteHash(carte) {
  return LIGNES.map(l => carte[l].join(',')).join('|');
}

// ── Stockage des parties en mémoire ──────────────────────────────────
// Map : code → { maitre, clan, tirages, joueurs, cartes(Set), terminee }
const parties = new Map();

function genererCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (parties.has(code));
  return code;
}

// ── Gestion des connexions Socket.io ─────────────────────────────────
io.on('connection', socket => {
  let codePartie = null;

  // Meneur : créer une nouvelle partie (clan imposé)
  socket.on('creer', payload => {
    const clan = payload && payload.clan;
    if (!CLANS_VALIDES.has(clan)) {
      socket.emit('erreur', 'Clan invalide.');
      return;
    }
    codePartie = genererCode();
    parties.set(codePartie, {
      maitre:     socket.id,
      clan,
      tirages:    [],
      joueurs:    new Map(),       // socketId → { nom, clan, carte, token, deconnecte }
      tokenIndex: new Map(),       // sessionToken → socketId (pour reconnexion)
      cartes:     new Set(),
      demarree:   false,            // false = lobby ouvert, true = nouveaux joueurs refusés
      terminee:   false
    });
    socket.join(codePartie);
    socket.emit('partie-creee', { code: codePartie, clan });
    console.log(`[${codePartie}] Partie créée — clan imposé : ${clan}`);
  });

  // Joueur : rejoindre une partie existante (clan imposé par la partie, sessionToken pour reconnexion)
  socket.on('rejoindre', ({ code, nom, sessionToken }) => {
    const partie = parties.get(code);
    if (!partie) {
      socket.emit('erreur', 'Code de partie invalide. Vérifiez le code et réessayez.');
      return;
    }
    if (partie.terminee) {
      socket.emit('erreur', 'Cette partie est terminée.');
      return;
    }
    const nomPropre = String(nom || '').trim().slice(0, 20);
    if (!nomPropre) {
      socket.emit('erreur', 'Prénom requis.');
      return;
    }
    const token = String(sessionToken || '').slice(0, 64);
    codePartie = code;
    socket.join(code);

    // ── Reconnexion : même sessionToken déjà connu dans la partie ──────
    if (token) {
      const oldSocketId = partie.tokenIndex.get(token);
      if (oldSocketId && partie.joueurs.has(oldSocketId)) {
        const data = partie.joueurs.get(oldSocketId);
        // Migre l'entrée vers le nouveau socketId
        partie.joueurs.delete(oldSocketId);
        data.nom        = nomPropre;
        data.deconnecte = false;
        partie.joueurs.set(socket.id, data);
        partie.tokenIndex.set(token, socket.id);

        socket.emit('rejoint', {
          tirages: partie.tirages,
          clan:    partie.clan,
          carte:   data.carte
        });
        io.to(partie.maitre).emit('joueur-reconnecte', {
          nom: nomPropre, count: partie.joueurs.size
        });
        console.log(`[${code}] ${nomPropre} reconnecté (${partie.joueurs.size} joueur(s))`);
        return;
      }
    }

    // ── Nouveau joueur : refusé si la partie a déjà commencé ───────────
    if (partie.demarree) {
      socket.emit('erreur', 'La partie a déjà commencé. Demande au meneur de t’ajouter à la prochaine.');
      return;
    }

    // ── Nouveau joueur : nom unique dans la partie ─────────────────────
    const nomDejaPris = Array.from(partie.joueurs.values()).some(j =>
      j.nom.toLowerCase() === nomPropre.toLowerCase()
    );
    if (nomDejaPris) {
      socket.emit('erreur', 'Ce prénom est déjà pris dans cette partie. Choisissez-en un autre.');
      return;
    }

    // ── Nouveau joueur : carte unique ──────────────────────────────────
    let carte, hash, attempts = 0;
    do {
      carte = genererCarte();
      hash  = carteHash(carte);
      attempts++;
    } while (partie.cartes.has(hash) && attempts < 50);
    partie.cartes.add(hash);

    partie.joueurs.set(socket.id, { nom: nomPropre, clan: partie.clan, carte, token, deconnecte: false });
    if (token) partie.tokenIndex.set(token, socket.id);

    socket.emit('rejoint', {
      tirages: partie.tirages,
      clan:    partie.clan,
      carte
    });
    io.to(partie.maitre).emit('joueur-connecte', {
      nom: nomPropre, clan: partie.clan, count: partie.joueurs.size
    });
    console.log(`[${code}] ${nomPropre} (${partie.clan}) connecté — ${partie.joueurs.size} joueur(s)`);
  });

  // Meneur : tirer un numéro
  socket.on('tirer', ({ code }) => {
    const partie = parties.get(code);
    if (!partie || partie.maitre !== socket.id || partie.terminee) return;

    const restants = [];
    for (let i = 1; i <= 72; i++) {
      if (!partie.tirages.includes(i)) restants.push(i);
    }
    if (!restants.length) {
      io.to(code).emit('tous-tires');
      return;
    }
    const num = restants[Math.floor(Math.random() * restants.length)];
    partie.tirages.push(num);

    io.to(code).emit('numero-tire', { num });
    console.log(`[${code}] Numéro tiré : ${num}`);
  });

  // Meneur : démarrer la partie (clôt les inscriptions, code+QR cachés côté UI)
  socket.on('demarrer', ({ code }) => {
    const partie = parties.get(code);
    if (!partie || partie.maitre !== socket.id || partie.demarree) return;
    partie.demarree = true;
    io.to(code).emit('partie-demarree');
    console.log(`[${code}] Partie démarrée — ${partie.joueurs.size} joueur(s) verrouillé(s)`);
  });

  // Meneur : terminer la partie explicitement
  socket.on('terminer', ({ code }) => {
    const partie = parties.get(code);
    if (!partie || partie.maitre !== socket.id) return;
    io.to(code).emit('partie-terminee', { raison: 'meneur' });
    parties.delete(code);
    console.log(`[${code}] Partie terminée par le meneur`);
  });

  // Joueur : déclarer victoire — premier gagnant valide = fin de partie immédiate
  socket.on('victoire', ({ code }) => {
    const partie = parties.get(code);
    if (!partie || partie.terminee) return;

    // Doit être un joueur inscrit dans cette partie (pas un client malveillant)
    const joueur = partie.joueurs.get(socket.id);
    if (!joueur) {
      socket.emit('erreur', 'Vous n’êtes pas inscrit dans cette partie.');
      return;
    }

    // Anti-troll : vérifie que la carte du joueur remplit vraiment la condition
    if (!victoireValide(joueur.carte, partie.clan, partie.tirages)) {
      socket.emit('erreur', 'Votre carte ne remplit pas encore la condition de victoire.');
      console.log(`[${code}] Victoire refusée pour ${joueur.nom} (carte non gagnante)`);
      return;
    }

    partie.terminee = true;
    // Compte les sockets effectivement dans la room (debug — meneur + joueurs)
    const room = io.sockets.adapter.rooms.get(code);
    const nbSockets = room ? room.size : 0;
    console.log(`[${code}] Broadcast 'gagnant' à ${nbSockets} socket(s) dans la room`);
    io.to(code).emit('gagnant', { nom: joueur.nom, clan: partie.clan });
    io.to(code).emit('partie-terminee', { raison: 'gagnant' });
    parties.delete(code);
    console.log(`[${code}] WENDIO ! ${joueur.nom} (${partie.clan})`);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    if (!codePartie) return;
    const partie = parties.get(codePartie);
    if (!partie) return;

    if (partie.maitre === socket.id) {
      io.to(codePartie).emit('partie-terminee', { raison: 'meneur-deco' });
      parties.delete(codePartie);
      console.log(`[${codePartie}] Partie terminée (meneur déconnecté)`);
    } else {
      // Joueur déconnecté : on garde l'entrée pour permettre la reconnexion via sessionToken.
      // Le compteur ne décrémente PAS — le meneur voit juste un statut "en veille" potentiel.
      const joueur = partie.joueurs.get(socket.id);
      if (joueur) {
        joueur.deconnecte = true;
        io.to(partie.maitre).emit('joueur-deconnecte', {
          nom:   joueur.nom,
          count: partie.joueurs.size
        });
        console.log(`[${codePartie}] ${joueur.nom} déconnecté (peut se reconnecter)`);
      }
    }
  });
});

// ── Démarrage ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   ✅  Serveur WENDIO démarré          ║');
  console.log(`║   Local  : http://localhost:${PORT}       ║`);
  console.log('║   Réseau : http://[votre-ip]:' + PORT + '      ║');
  console.log('╚══════════════════════════════════════╝\n');
});
