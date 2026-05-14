'use strict';
// WENDIO — i18n FR/EN
//
// Usage HTML :
//   <h1 data-i18n="lobby.title">WENDIO</h1>           ← textContent
//   <input data-i18n-attr="placeholder:form.name">    ← attribut
//   <button data-i18n-attr="title:btn.tip,aria-label:btn.tip">…</button>
//
// Usage JS :
//   t('lobby.subtitle')                               ← texte traduit
//   i18n.setLang('en')                                ← change langue + persiste
//
// Le texte hard-codé dans le HTML sert de fallback français : si JS est
// désactivé OU si la clé n'existe pas dans le dictionnaire, on garde le
// HTML d'origine.
//
// Pas de support HTML inline (XSS-safe) : pour mettre du markup au milieu
// d'un texte traduit, soit le découper en plusieurs clés, soit laisser le
// markup statique en HTML et ne traduire que les parties textuelles.

const TRANSLATIONS = {
  // ── Lobby ──────────────────────────────────────────────────────────
  'lobby.subtitle':            { fr: 'Le Jeu des Clans',
                                 en: 'The Game of Clans' },
  'lobby.devise':              { fr: '« Une main sur le passé, une oreille sur l’avenir. »',
                                 en: '« One hand on the past, one ear on the future. »' },
  'lobby.conseil_fs':          { fr: 'Pour une expérience optimale sur tablette, utilisez le mode plein écran — un bouton est disponible sur chaque écran de jeu.',
                                 en: 'For the best experience on tablet, use fullscreen mode — a button is available on each game screen.' },
  'lobby.meneur.label':        { fr: 'Meneur de Jeu',
                                 en: 'Game Master' },
  'lobby.meneur.desc':         { fr: 'Tirez les numéros, suivez les tirages et lancez les sons Wendat pour tous les joueurs.',
                                 en: 'Draw numbers, follow the calls, and play the Wendat sounds for all players.' },
  'lobby.imprimer.label':      { fr: 'Cartes à imprimer',
                                 en: 'Cards to Print' },
  'lobby.imprimer.desc':       { fr: 'Générez 4 cartes aléatoires sur une page A4. Régénérez autant de fois que nécessaire avant d’imprimer.',
                                 en: 'Generate 4 random cards on an A4 page. Regenerate as often as needed before printing.' },
  'lobby.trophees.label':      { fr: 'Trophées à imprimer',
                                 en: 'Trophies to Print' },
  'lobby.trophees.desc':       { fr: 'Imprimez une carte-trophée par clan, avec nom du gagnant et date — idéal pour récompenser à l’école ou en salle.',
                                 en: 'Print a trophy card per clan, with winner’s name and date — perfect for rewarding at school or in a hall.' },
  'lobby.joueur.label':        { fr: 'Carte numérique',
                                 en: 'Digital Card' },
  'lobby.joueur.desc':         { fr: 'Jouez directement sur tablette ou téléphone avec une carte générée aléatoirement.',
                                 en: 'Play directly on tablet or phone with a randomly generated card.' },
  'lobby.demo.label':          { fr: 'Mode Démo',
                                 en: 'Demo Mode' },
  'lobby.demo.desc':           { fr: 'Choisissez un scénario de démonstration — configuration automatique.',
                                 en: 'Choose a demonstration scenario — auto-configured.' },
  'lobby.footer.line1':        { fr: 'Une expérience de revitalisation linguistique hybride',
                                 en: 'A hybrid linguistic revitalization experience' },
  'lobby.footer.line2':        { fr: 'Wendat  →  Français  →  Anglais',
                                 en: 'Wendat  →  French  →  English' },
  // ── Toggle de langue ──────────────────────────────────────────────
  'lang.toggle.title':         { fr: 'Changer la langue',
                                 en: 'Change language' },

  // ── Labels victoire des clans (texte affiché, le nom du clan reste FR) ─
  'clan.Chevreuil.victoire':   { fr: 'Ligne complète (horizontale, verticale ou diagonale)',
                                 en: 'Full line (horizontal, vertical or diagonal)' },
  'clan.Loup.victoire':        { fr: 'Les 4 coins',
                                 en: 'All 4 corners' },
  'clan.Ours.victoire':        { fr: 'Carré protecteur (12 cases)',
                                 en: 'Protective square (12 cells)' },
  'clan.Tortue.victoire':      { fr: 'Carte pleine (32 cases)',
                                 en: 'Full card (32 cells)' },

  // ── Meneur ─────────────────────────────────────────────────────────
  'meneur.title':              { fr: 'WENDIO — Meneur',
                                 en: 'WENDIO — Game Master' },
  'meneur.tooltip.accueil':    { fr: 'Accueil',
                                 en: 'Home' },
  'meneur.tooltip.fullscreen': { fr: 'Plein écran',
                                 en: 'Fullscreen' },
  'meneur.status_online':      { fr: '🌐 Partie en ligne',
                                 en: '🌐 Online game' },
  'meneur.btn_local':          { fr: '📴 Local',
                                 en: '📴 Local' },
  'meneur.btn_online':         { fr: '🌐 En ligne',
                                 en: '🌐 Online' },
  'meneur.btn_auto':           { fr: '🎲 Aléatoire',
                                 en: '🎲 Random' },
  'meneur.btn_physique':       { fr: '🂡 Physique',
                                 en: '🂡 Physical' },
  'meneur.clan_choix_titre':   { fr: 'Choisissez le clan que les joueurs incarneront :',
                                 en: 'Choose the clan that players will play as:' },
  'meneur.btn_creer':          { fr: '✚ Créer la partie',
                                 en: '✚ Create game' },
  'meneur.code_label':         { fr: 'Code de la partie',
                                 en: 'Game code' },
  'meneur.joueurs_titre':      { fr: 'Joueurs connectés :',
                                 en: 'Connected players:' },
  'meneur.btn_commencer':      { fr: '▶️ Commencer la partie',
                                 en: '▶️ Start game' },
  'meneur.btn_arreter':        { fr: '▢ Terminer la partie',
                                 en: '▢ End game' },
  'meneur.qr_lien_joueur':     { fr: 'Lien joueur',
                                 en: 'Player link' },
  'meneur.btn_tirer':          { fr: '🎲 TIRER UN NUMÉRO',
                                 en: '🎲 DRAW A NUMBER' },
  'meneur.btn_reset':          { fr: '↻ Réinit.',
                                 en: '↻ Reset' },
  'meneur.tableau_titre':      { fr: 'Tableau des tirages',
                                 en: 'Calls board' },
  'meneur.bandeau_gagnant':    { fr: '🏆 Gagnant',
                                 en: '🏆 Winner' },
  'meneur.compteur':           { fr: '{n} / 72 numéros tirés',
                                 en: '{n} / 72 numbers called' },
  'meneur.win_titre':          { fr: '🌽 WENDIO ! 🌽',
                                 en: '🌽 WENDIO! 🌽' },
  'meneur.btn_fermer_partie':  { fr: '🏁 Fermer la partie',
                                 en: '🏁 Close game' },
  'meneur.btn_nouvelle_partie':{ fr: '🔄 Nouvelle partie',
                                 en: '🔄 New game' },
  'meneur.objectif_prefix':    { fr: 'Objectif des joueurs : ',
                                 en: 'Players’ objective: ' },
  'meneur.clan_impose_prefix': { fr: 'Clan imposé : ',
                                 en: 'Required clan: ' },
  'meneur.confirm_terminer':   { fr: 'Terminer la partie ? Tous les joueurs seront déconnectés.',
                                 en: 'End the game? All players will be disconnected.' },
  'meneur.serveur_introuvable':{ fr: 'Serveur introuvable. Lancez server.js avec Node.js.',
                                 en: 'Server not reachable. Run server.js with Node.js.' },
  'meneur.un_joueur_gagne':    { fr: 'Un joueur a gagné !',
                                 en: 'A player won!' },
  'meneur.partie_terminee_msg':{ fr: 'Partie terminée — cliquez « Nouvelle partie »',
                                 en: 'Game ended — click “New game”' },
  'meneur.carte_tooltip':      { fr: 'Carte WENDIO numéro {n} — clic pour rejouer le son',
                                 en: 'WENDIO card number {n} — click to replay the sound' },

  // ── Joueur ─────────────────────────────────────────────────────────
  'joueur.tooltip.accueil':    { fr: 'Accueil', en: 'Home' },
  'joueur.tooltip.fullscreen': { fr: 'Plein écran', en: 'Fullscreen' },
  'joueur.rejoindre.titre':    { fr: 'Rejoindre la partie',
                                 en: 'Join the game' },
  'joueur.rejoindre.info_clan':{ fr: 'Le clan est imposé par le meneur — il sera affiché dès que vous rejoignez.',
                                 en: 'The clan is set by the game master — it will be shown as soon as you join.' },
  'joueur.rejoindre.label_nom':{ fr: 'Votre prénom', en: 'Your first name' },
  'joueur.rejoindre.ph_nom':   { fr: 'ex : Marie', en: 'e.g. Marie' },
  'joueur.rejoindre.btn':      { fr: 'Rejoindre →', en: 'Join →' },
  'joueur.btn_local':          { fr: 'Local', en: 'Local' },
  'joueur.btn_online':         { fr: 'En ligne', en: 'Online' },
  'joueur.setup_local.titre':  { fr: 'Choisissez votre clan',
                                 en: 'Choose your clan' },
  'joueur.objectif_default':   { fr: 'Sélectionnez un clan pour voir votre objectif',
                                 en: 'Select a clan to see your objective' },
  'joueur.btn_jouer':          { fr: 'Jouer →', en: 'Play →' },
  'joueur.setup_online.titre': { fr: 'Rejoindre une partie en ligne',
                                 en: 'Join an online game' },
  'joueur.setup_online.ph_code':{ fr: 'CODE', en: 'CODE' },
  'joueur.setup_online.btn':   { fr: 'Rejoindre →', en: 'Join →' },
  'joueur.badge_online':       { fr: '🌐 En ligne', en: '🌐 Online' },
  'joueur.btn_nouvelle_carte': { fr: '↩ Nouvelle carte', en: '↩ New card' },
  'joueur.annonce.label':      { fr: 'Case sélectionnée', en: 'Selected cell' },
  'joueur.btn_wendio':         { fr: '🌽 WENDIO !', en: '🌽 WENDIO!' },
  'joueur.win.titre':          { fr: '🌽 WENDIO ! 🌽', en: '🌽 WENDIO! 🌽' },
  'joueur.win.btn_voir':       { fr: 'Voir ma carte', en: 'See my card' },
  'joueur.win.btn_quitter':    { fr: '🚪 Quitter la partie', en: '🚪 Leave the game' },
  'joueur.serveur_introuvable':{ fr: 'Impossible de joindre le serveur.',
                                 en: 'Unable to reach the server.' },
  'joueur.partie_terminee':    { fr: '⏹ Partie terminée',
                                 en: '⏹ Game ended' },
  'joueur.meneur_deco':        { fr: 'Le meneur s’est déconnecté.',
                                 en: 'The game master disconnected.' },
  'joueur.meneur_clos':        { fr: 'Le meneur a clos la partie.',
                                 en: 'The game master closed the game.' },
  'joueur.objectif_format':    { fr: 'Objectif : {label} — {n} pt{s} WENDIO',
                                 en: 'Objective: {label} — {n} pt{s} WENDIO' },
  'joueur.bravo':              { fr: 'Bravo {nom} !', en: 'Bravo {nom}!' },
  'joueur.bravo_anon':         { fr: 'Bravo !', en: 'Bravo!' },
  'joueur.a_gagne':            { fr: '{nom} a gagné', en: '{nom} won' },
  'joueur.carte_tooltip':      { fr: 'Carte WENDIO {n} — clic pour rejouer le son',
                                 en: 'WENDIO card {n} — click to replay the sound' },

  // ── Imprimer (cartes) ──────────────────────────────────────────────
  'imprimer.nb_titre':         { fr: 'Nombre de cartes', en: 'Number of cards' },
  'imprimer.nb_1':             { fr: '1 carte', en: '1 card' },
  'imprimer.nb_2':             { fr: '2 cartes — paysage', en: '2 cards — landscape' },
  'imprimer.nb_4':             { fr: '4 cartes', en: '4 cards' },
  'imprimer.clan_titre':       { fr: 'Clan', en: 'Clan' },
  'imprimer.btn_regen':        { fr: '🔄 Nouvelles cartes', en: '🔄 New cards' },
  'imprimer.btn_print':        { fr: '🖨️ Imprimer', en: '🖨️ Print' },
  'imprimer.generique':        { fr: 'Générique', en: 'Generic' },
  'imprimer.melange':          { fr: 'Un de chaque', en: 'One of each' },
  'imprimer.carte_titre':      { fr: 'WENDIO — Le Jeu des Clans',
                                 en: 'WENDIO — The Game of Clans' },
  'imprimer.carte_consigne':   { fr: 'Marquez les cases avec un grain de maïs 🌽',
                                 en: 'Mark cells with a corn kernel 🌽' },

  // ── Imprimer (trophées) ────────────────────────────────────────────
  'trophees.clan_titre':       { fr: 'Clan(s) à imprimer', en: 'Clan(s) to print' },
  'trophees.nom_titre':        { fr: 'Nom du gagnant (optionnel)',
                                 en: 'Winner’s name (optional)' },
  'trophees.nom_ph':           { fr: 'ex : Marie, Jean…',
                                 en: 'e.g. Mary, John…' },
  'trophees.date_titre':       { fr: 'Date', en: 'Date' },
  'trophees.date_ph':          { fr: 'JJ/MM/AAAA', en: 'DD/MM/YYYY' },
  'trophees.btn_print':        { fr: '🖨️ Imprimer', en: '🖨️ Print' },
  'trophees.empty':            { fr: 'Choisissez un ou plusieurs clans ci-dessus pour générer les pages-trophées.',
                                 en: 'Choose one or more clans above to generate trophy pages.' },
  'trophees.titre':            { fr: 'Trophée WENDIO', en: 'WENDIO Trophy' },
  'trophees.bravo':            { fr: 'Bravo {nom} !', en: 'Bravo {nom}!' },
  'trophees.bravo_default':    { fr: '(nom du gagnant)', en: '(winner’s name)' },
  'trophees.clan_prefix':      { fr: 'Clan ', en: 'Clan ' },
  'trophees.points':           { fr: '{n} point{s} WENDIO', en: '{n} point{s} WENDIO' },
  'trophees.footer':           { fr: 'Une main sur le passé, une oreille sur l’avenir',
                                 en: 'One hand on the past, one ear on the future' },

  // ── Démo ───────────────────────────────────────────────────────────
  'demo.sous_titre':           { fr: 'Mode Démo', en: 'Demo Mode' },
  'demo.consigne':             { fr: 'Choisissez un scénario — la configuration s’applique automatiquement.',
                                 en: 'Choose a scenario — settings are applied automatically.' },
  'demo.physique.label':       { fr: 'Cartes physiques', en: 'Physical cards' },
  'demo.physique.desc':        { fr: 'Le meneur clique sur les numéros tirés du deck. Projection sur grand écran.',
                                 en: 'The game master clicks numbers drawn from the deck. Projected on a big screen.' },
  'demo.physique.tag':         { fr: 'Meneur · Local · Physique',
                                 en: 'Game master · Local · Physical' },
  'demo.aleatoire.label':      { fr: 'Tirage aléatoire', en: 'Random draw' },
  'demo.aleatoire.desc':       { fr: 'Le meneur tire les numéros au hasard. Joueurs avec cartes imprimées.',
                                 en: 'The game master draws numbers randomly. Players with printed cards.' },
  'demo.aleatoire.tag':        { fr: 'Meneur · Local · Automatique',
                                 en: 'Game master · Local · Automatic' },
  'demo.online.label':         { fr: 'Partie en ligne', en: 'Online game' },
  'demo.online.desc':          { fr: 'Joueurs connectés sur leur propre appareil via QR code.',
                                 en: 'Players connect on their own device via QR code.' },
  'demo.online.tag':           { fr: 'Meneur · En ligne',
                                 en: 'Game master · Online' },
  'demo.joueur.label':         { fr: 'Carte joueur', en: 'Player card' },
  'demo.joueur.desc':          { fr: 'Carte numérique individuelle sur tablette ou téléphone.',
                                 en: 'Individual digital card on tablet or phone.' },
  'demo.joueur.tag':           { fr: 'Joueur · Local',
                                 en: 'Player · Local' },
  'demo.impr.label':           { fr: 'Impression', en: 'Printing' },
  'demo.impr.desc':            { fr: 'Générer et imprimer des cartes (1, 2 ou 4 par page).',
                                 en: 'Generate and print cards (1, 2 or 4 per page).' },
  'demo.impr.tag':             { fr: 'Cartes papier',
                                 en: 'Paper cards' },
  'demo.retour':               { fr: '← Retour à l’accueil', en: '← Back to home' },
};

const i18n = (function () {
  const LS_KEY = 'wendio-lang';
  const DEFAULT = 'fr';
  const SUPPORTED = ['fr', 'en'];
  const listeners = [];

  function getLang() {
    try {
      const v = localStorage.getItem(LS_KEY);
      return SUPPORTED.includes(v) ? v : DEFAULT;
    } catch (e) { return DEFAULT; }
  }

  function setLang(lang) {
    if (!SUPPORTED.includes(lang)) return;
    try { localStorage.setItem(LS_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute('lang', lang);
    applyTranslations();
    updateToggleUI();
    listeners.forEach(cb => { try { cb(lang); } catch (e) { console.error(e); } });
  }

  // Permet aux pages de re-render leurs textes composés (genre
  // « Objectif : <label> ») quand la langue change.
  function onLangChange(cb) {
    if (typeof cb === 'function') listeners.push(cb);
  }

  function t(key, vars) {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    let txt = entry[getLang()] || entry[DEFAULT] || key;
    if (vars) {
      Object.keys(vars).forEach(k => {
        txt = txt.split('{' + k + '}').join(String(vars[k]));
      });
    }
    return txt;
  }

  function applyTranslations() {
    const lang = getLang();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const entry = TRANSLATIONS[key];
      if (!entry) return;
      const txt = entry[lang] || entry[DEFAULT];
      if (txt != null) el.textContent = txt;
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr');
      spec.split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        const entry = TRANSLATIONS[key];
        if (!entry || !attr) return;
        const txt = entry[lang] || entry[DEFAULT];
        if (txt != null) el.setAttribute(attr, txt);
      });
    });
  }

  function injectToggle() {
    if (document.getElementById('lang-toggle')) return;
    const wrap = document.createElement('div');
    wrap.id = 'lang-toggle';
    wrap.className = 'lang-toggle';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language');
    SUPPORTED.forEach(code => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.lang = code;
      b.textContent = code.toUpperCase();
      b.onclick = () => setLang(code);
      wrap.appendChild(b);
    });
    document.body.appendChild(wrap);

    if (!document.getElementById('lang-toggle-style')) {
      const style = document.createElement('style');
      style.id = 'lang-toggle-style';
      style.textContent = `
        .lang-toggle {
          position: fixed; top: 12px; right: 12px; z-index: 9999;
          display: flex; gap: 2px;
          background: rgba(0,0,0,.45); backdrop-filter: blur(6px);
          border-radius: 8px; padding: 3px;
          font-family: 'Segoe UI', sans-serif;
        }
        .lang-toggle button {
          appearance: none; border: 0; background: transparent;
          color: #d4b080; padding: 5px 10px; font-size: .78rem; font-weight: 700;
          letter-spacing: .08em; cursor: pointer; border-radius: 6px;
          transition: background .15s, color .15s;
        }
        .lang-toggle button:hover { color: #f4e7d3; }
        .lang-toggle button.actif { background: #c8843a; color: #1a1008; }
        @media print { .lang-toggle { display: none !important; } }
      `;
      document.head.appendChild(style);
    }
  }

  function updateToggleUI() {
    const lang = getLang();
    document.querySelectorAll('#lang-toggle button').forEach(b => {
      b.classList.toggle('actif', b.dataset.lang === lang);
    });
  }

  function init() {
    document.documentElement.setAttribute('lang', getLang());
    injectToggle();
    applyTranslations();
    updateToggleUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { getLang, setLang, t, applyTranslations, onLangChange };
})();

function t(key) { return i18n.t(key); }
