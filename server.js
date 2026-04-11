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

// ── Stockage des parties en mémoire ──────────────────────────────────
// Map : code → { maitre: socketId, tirages: number[], joueurs: Map<socketId, {nom, clan}> }
const parties = new Map();

function genererCode() {
  // Caractères sans ambiguïté visuelle (pas 0/O ni 1/I)
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

  // Meneur : créer une nouvelle partie
  socket.on('creer', () => {
    codePartie = genererCode();
    parties.set(codePartie, {
      maitre:  socket.id,
      tirages: [],
      joueurs: new Map()
    });
    socket.join(codePartie);
    socket.emit('partie-creee', { code: codePartie });
    console.log(`[${codePartie}] Partie créée`);
  });

  // Joueur : rejoindre une partie existante
  socket.on('rejoindre', ({ code, nom, clan }) => {
    const partie = parties.get(code);
    if (!partie) {
      socket.emit('erreur', 'Code de partie invalide. Vérifiez le code et réessayez.');
      return;
    }
    codePartie = code;
    socket.join(code);
    partie.joueurs.set(socket.id, { nom, clan });

    // Envoyer les numéros déjà tirés au nouveau joueur
    socket.emit('rejoint', { tirages: partie.tirages });

    // Notifier le meneur
    io.to(partie.maitre).emit('joueur-connecte', {
      nom, clan, count: partie.joueurs.size
    });
    console.log(`[${code}] ${nom} (${clan}) connecté — ${partie.joueurs.size} joueur(s)`);
  });

  // Meneur : tirer un numéro
  socket.on('tirer', ({ code }) => {
    const partie = parties.get(code);
    if (!partie || partie.maitre !== socket.id) return;

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

    // Diffuser à tous (meneur + joueurs)
    io.to(code).emit('numero-tire', { num });
    console.log(`[${code}] Numéro tiré : ${num}`);
  });

  // Meneur : terminer la partie explicitement
  socket.on('terminer', ({ code }) => {
    const partie = parties.get(code);
    if (!partie || partie.maitre !== socket.id) return;
    io.to(code).emit('partie-terminee');
    parties.delete(code);
    console.log(`[${code}] Partie terminée par le meneur`);
  });

  // Joueur : déclarer victoire
  socket.on('victoire', ({ code, nom, clan }) => {
    const partie = parties.get(code);
    if (!partie) return;
    io.to(code).emit('gagnant', { nom, clan });
    console.log(`[${code}] WENDIO ! ${nom} (${clan})`);
  });

  // Déconnexion
  socket.on('disconnect', () => {
    if (!codePartie) return;
    const partie = parties.get(codePartie);
    if (!partie) return;

    if (partie.maitre === socket.id) {
      // Meneur parti → on prévient tout le monde et on ferme la partie
      io.to(codePartie).emit('partie-terminee');
      parties.delete(codePartie);
      console.log(`[${codePartie}] Partie terminée (meneur déconnecté)`);
    } else {
      const joueur = partie.joueurs.get(socket.id);
      partie.joueurs.delete(socket.id);
      if (joueur) {
        io.to(partie.maitre).emit('joueur-deconnecte', {
          nom: joueur.nom,
          count: partie.joueurs.size
        });
        console.log(`[${codePartie}] ${joueur.nom} déconnecté — ${partie.joueurs.size} joueur(s)`);
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
