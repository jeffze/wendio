'use strict';

const LIGNES = ['W', 'E', 'N', 'D', 'I', 'O'];

const CONFIG = {
  W: { min:  1, max: 12, count: 6, couleur: '#d35400' },
  E: { min: 13, max: 24, count: 6, couleur: '#27ae60' },
  N: { min: 25, max: 36, count: 4, couleur: '#2980b9' },  // 4 chiffres + 2 cœurs
  D: { min: 37, max: 48, count: 4, couleur: '#8e44ad' },  // 4 chiffres + 2 cœurs
  I: { min: 49, max: 60, count: 6, couleur: '#f39c12' },
  O: { min: 61, max: 72, count: 6, couleur: '#c0392b' },
};

const CLANS = {
  Chevreuil: { icon: '🦌', wendat: "Ohskënonton'", victoire: 'ligne',  points: 1, label: 'Ligne complète (horizontale, verticale ou diagonale)' },
  Loup:      { icon: '🐺', wendat: "Yānariskwa'",  victoire: 'coins',  points: 2, label: 'Les 4 coins' },
  Ours:      { icon: '🐻', wendat: "Yānionyen'",   victoire: 'carre',  points: 3, label: 'Carré protecteur (12 cases)' },
  Tortue:    { icon: '🐢', wendat: "Yāndia'wich",  victoire: 'pleine', points: 4, label: 'Carte pleine (32 cases)' },
};

// support #29 — masquer le mode « tirage physique » avant présentation.
// Repasser à true pour tout restaurer (config + meneur) ; aucun code Physique n'est supprimé.
const TIRAGE_PHYSIQUE_ACTIF = false;

// Cases cœur : lignes N et D, colonnes 2 et 3 (centre de la grille)
// Grille 6×6 : W-E-N-D-I-O en lignes, positions 0-5 en colonnes
//       col: 0   1  [2]  [3]  4   5
//  N       [ n ][ n ][🐢][🐻][ n ][ n ]
//  D       [ n ][ n ][🐺][🦌][ n ][ n ]
const COEUR      = { 'N2': '🐢', 'N3': '🐻', 'D2': '🐺', 'D3': '🦌' };
const COEUR_CLAN = { 'N2': 'Tortue', 'N3': 'Ours', 'D2': 'Loup', 'D3': 'Chevreuil' };

// Vocabulaire Wendat — à compléter pour tous les numéros
const NOMBRES = {
   9: { wendat: "En'tron'",                           phon: "An-tron",                                 fr: "Neuf",           en: "Nine" },
  14: { wendat: "Ahsenh ndahk iskare'",               phon: "a-sin-n-darc is-ka-ré",                   fr: "Quatorze",       en: "Fourteen" },
  20: { wendat: "Tëndih tewahsenh",                   phon: "tin-di tô-oua-sin-in",                    fr: "Vingt",          en: "Twenty" },
  40: { wendat: "Ndahk iwahsenh",                     phon: "Ah-sanh n-dak is-ka-ré",                  fr: "Quarante",       en: "Forty" },
  60: { wendat: "Wahia' iwahsenh",                    phon: "Wah-hya eo-wah-sunh",                     fr: "Soixante",       en: "Sixty" },
  72: { wendat: "Tsoutare' iwahsenh tëndih teskare'", phon: "Tsou-ta-re' i-wa-sanh ten-di tes-ka-ré", fr: "Soixante-douze", en: "Seventy-two" },
};

// Retourne la ligne (W/E/N/D/I/O) d'un numéro
function ligneDeNumero(num) {
  return LIGNES.find(l => num >= CONFIG[l].min && num <= CONFIG[l].max);
}

// Génère une carte joueur aléatoire
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

// Valeur d'une case (ligne=W/E/.., colIdx=0-5). null = case cœur.
// Lignes N et D : cols 0,1 → indices 0,1 ; cols 4,5 → indices 2,3
function valeurCase(carte, ligne, colIdx) {
  if (estCoeur(ligne, colIdx)) return null;
  if (ligne === 'N' || ligne === 'D') {
    return colIdx < 2 ? carte[ligne][colIdx] : carte[ligne][colIdx - 2];
  }
  return carte[ligne][colIdx];
}

function estCoeur(ligne, colIdx) {
  return (ligne === 'N' || ligne === 'D') && (colIdx === 2 || colIdx === 3);
}

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

// Chemin audio
function cheminAudio(num) {
  return `sound/Wendat numbers ${num}.wav`;
}

function jouerSon(num) {
  new Audio(cheminAudio(num)).play().catch(() => {});
}

// Export Node — le fichier reste chargeable tel quel par <script> dans le
// navigateur, où `module` est undefined et ce bloc est ignoré.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LIGNES, CONFIG, CLANS, COEUR, COEUR_CLAN, NOMBRES,
    ligneDeNumero, genererCarte, valeurCase, estCoeur, victoireValide,
  };
}
