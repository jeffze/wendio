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
  // ── joueur-config.html (page de config joueur, calquee sur meneur-config) ──
  'jconfig.titre':             { fr: 'Comment tu joues ?',           en: 'How are you playing?' },
  'jconfig.mode':              { fr: 'Quel type de partie ?',        en: 'What type of game?' },
  'jconfig.mode.online':       { fr: 'En ligne',                     en: 'Online' },
  'jconfig.mode.online_desc':  { fr: 'Avec un code partagé par le meneur',
                                 en: 'With a code shared by the host' },
  'jconfig.mode.local':        { fr: 'Solo / pratique',              en: 'Solo / practice' },
  'jconfig.mode.local_desc':   { fr: 'Une carte juste pour toi, sans meneur',
                                 en: 'A card just for you, no host' },
  'jconfig.rejoindre':         { fr: 'Rejoindre la partie',          en: 'Join the game' },
  'jconfig.code':              { fr: 'Code à 4 lettres (du meneur)', en: '4-letter code (from the host)' },
  'jconfig.nom':               { fr: 'Ton nom (visible des autres)', en: 'Your name (visible to others)' },
  'jconfig.nom.placeholder':   { fr: 'Ton nom',                      en: 'Your name' },
  'jconfig.clan':              { fr: 'Choisis ton clan',             en: 'Choose your clan' },
  'jconfig.retour':            { fr: '← Accueil',                    en: '← Home' },
  'jconfig.jouer':             { fr: 'Jouer ▶',                      en: 'Play ▶' },
  'jconfig.modifier':          { fr: 'Modifier',                     en: 'Edit' },

  // ── Index (cover) ──────────────────────────────────────────────────
  'index.cta.joueur':          { fr: 'Je joue',           en: "I'm playing" },
  'index.cta.meneur':          { fr: 'Je suis meneur',    en: "I'm the host" },
  'index.subtitle':            { fr: 'Le Jeu des Clans',  en: 'The Game of Clans' },

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
  'lobby.imprimer.desc':       { fr: 'Générez 4 cartes aléatoires par page. Régénérez autant de fois que nécessaire avant d’imprimer.',
                                 en: 'Generate 4 random cards per page. Regenerate as often as needed before printing.' },
  'lobby.trophees.label':      { fr: 'Cartes-gagnant·e à imprimer',
                                 en: 'Winner Cards to Print' },
  'lobby.trophees.desc':       { fr: 'Imprimez une carte-gagnant·e par clan, avec nom et date — idéal pour souligner l’accomplissement à l’école ou en salle.',
                                 en: 'Print a winner card per clan, with name and date — perfect for celebrating the achievement at school or in a hall.' },
  'lobby.joueur.label':        { fr: 'Carte numérique',
                                 en: 'Digital Card' },
  'lobby.joueur.desc':         { fr: 'Jouez directement sur tablette ou téléphone avec une carte générée aléatoirement.',
                                 en: 'Play directly on tablet or phone with a randomly generated card.' },
  'lobby.aide.label':          { fr: 'Aide du meneur',
                                 en: 'Game Master Guide' },
  'lobby.aide.desc':           { fr: 'Tout pour animer une partie : modes, clans, étapes en ligne, mode physique, dépannage.',
                                 en: 'Everything to run a game: modes, clans, online steps, physical mode, troubleshooting.' },
  'lobby.admin.label':         { fr: 'Gérer les meneurs',
                                 en: 'Manage Game Masters' },
  'lobby.admin.desc':          { fr: 'Inviter de nouveaux meneurs, retirer un accès, promouvoir un administrateur. Réservé aux admins.',
                                 en: 'Invite new Game Masters, revoke access, promote administrators. Admins only.' },
  'lobby.support.label':       { fr: 'Tableau de bord Support',
                                 en: 'Support Dashboard' },
  'lobby.support.desc':        { fr: 'Tickets, erreurs et historique des versions. Connexion magic link séparée avec le même courriel.',
                                 en: 'Tickets, errors and release history. Separate magic link login with the same email.' },
  'lobby.footer.line1':        { fr: 'Une expérience de revitalisation linguistique hybride',
                                 en: 'A hybrid linguistic revitalization experience' },
  'lobby.footer.line2':        { fr: 'Wendat  →  Français  →  Anglais',
                                 en: 'Wendat  →  French  →  English' },
  // ── Toggle de langue ──────────────────────────────────────────────
  'lang.toggle.title':         { fr: 'Changer la langue',
                                 en: 'Change language' },

  // ── Tooltips meneur (boutons flottants) ────────────────────────────
  'meneur.tooltip.aide':       { fr: 'Aide du meneur',
                                 en: 'Game Master Guide' },
  'meneur.btn_demo_bots':      { fr: '🤖 Simuler 3 joueurs',
                                 en: '🤖 Simulate 3 players' },
  'meneur.btn_demo_bots_title':{ fr: 'Ajoute 3 joueurs simules pour faire une demo sans audience',
                                 en: 'Add 3 simulated players for a demo without an audience' },
  'meneur.btn_qr_mobile':      { fr: '📱 QR carte mobile',
                                 en: '📱 Mobile card QR' },
  'meneur.btn_qr_mobile_title':{ fr: 'Affiche un QR a scanner — chaque joueur obtient une carte aleatoire sur son telephone',
                                 en: 'Show a QR to scan — each player gets a random card on their phone' },
  'meneur.qr_mobile.titre':    { fr: '📱 Carte mobile',
                                 en: '📱 Mobile card' },
  'meneur.qr_mobile.consigne': { fr: 'Scanne avec ton téléphone pour obtenir une carte aléatoire',
                                 en: 'Scan with your phone to get a random card' },

  // ── Labels victoire des clans (texte affiché, le nom du clan reste FR) ─
  // ── Page meneur-config.html ────────────────────────────────────────
  'config.titre':              { fr: 'Configuration de la partie',
                                 en: 'Game configuration' },
  'config.mode':               { fr: 'Mode de jeu',
                                 en: 'Game mode' },
  'config.local':              { fr: 'Local',
                                 en: 'Local' },
  'config.local_desc':         { fr: "Le meneur projette à l'écran, joueurs avec cartes papier",
                                 en: 'Game master projects on screen, players use paper cards' },
  'config.online':             { fr: 'En ligne',
                                 en: 'Online' },
  'config.online_desc':        { fr: 'Joueurs connectés via QR code sur leur appareil',
                                 en: 'Players connected via QR code on their own device' },
  'config.tirage':             { fr: 'Type de tirage',
                                 en: 'Draw type' },
  'config.aleatoire':          { fr: 'Aléatoire',
                                 en: 'Random' },
  'config.aleatoire_desc':     { fr: 'Le serveur tire les numéros au hasard',
                                 en: 'The server draws numbers at random' },
  'config.physique':           { fr: 'Physique',
                                 en: 'Physical' },
  'config.physique_desc':      { fr: 'Le meneur clique sur les numéros tirés du deck',
                                 en: 'Game master clicks numbers drawn from the deck' },
  'config.clan':               { fr: 'Clan proposé aux joueurs',
                                 en: 'Clan proposed to players' },
  'config.retour':             { fr: '← Retour au menu',
                                 en: '← Back to menu' },
  'config.commencer':          { fr: 'Commencer ▶',
                                 en: 'Start ▶' },

  // ── Noms de clan (les mots WENDAT eux restent dans data.js, jamais traduits) ──
  'clan.Chevreuil':            { fr: 'Chevreuil',
                                 en: 'Deer' },
  'clan.Tortue':               { fr: 'Tortue',
                                 en: 'Turtle' },
  'clan.Ours':                 { fr: 'Ours',
                                 en: 'Bear' },
  'clan.Loup':                 { fr: 'Loup',
                                 en: 'Wolf' },

  'clan.Chevreuil.victoire':   { fr: 'Carte pleine (32 cases)',
                                 en: 'Full card (32 cells)' },
  'clan.Tortue.victoire':      { fr: 'Carré protecteur (12 cases)',
                                 en: 'Protective square (12 cells)' },
  'clan.Ours.victoire':        { fr: 'Les 4 coins',
                                 en: 'All 4 corners' },
  'clan.Loup.victoire':        { fr: 'Ligne complète (horizontale, verticale ou diagonale)',
                                 en: 'Full line (horizontal, vertical or diagonal)' },

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
  'meneur.btn_arreter':        { fr: 'Terminer la partie',
                                 en: 'End game' },
  'meneur.qr_lien_joueur':     { fr: 'Lien joueur',
                                 en: 'Player link' },
  'meneur.btn_tirer':          { fr: 'Tirer un numéro',
                                 en: 'Draw a number' },
  'meneur.btn_reset':          { fr: 'Réinitialiser',
                                 en: 'Reset' },
  'meneur.btn_copier':         { fr: '📋 Copier',
                                 en: '📋 Copy' },
  'meneur.btn_copier_title':   { fr: 'Copier le lien à partager aux joueurs',
                                 en: 'Copy the link to share with players' },
  'meneur.tableau_titre':      { fr: 'Tableau des tirages',
                                 en: 'Calls board' },
  'meneur.bandeau_gagnant':    { fr: '🌽 Gagnant',
                                 en: '🌽 Winner' },
  'meneur.compteur':           { fr: '{n} / 72 numéros tirés',
                                 en: '{n} / 72 numbers called' },
  'meneur.win_titre':          { fr: '🌽 WENDIO ! 🌽',
                                 en: '🌽 WENDIO! 🌽' },
  'meneur.btn_fermer_partie':  { fr: '🏁 Fermer la partie',
                                 en: '🏁 Close game' },
  'meneur.btn_nouvelle_partie':{ fr: 'Nouvelle partie',
                                 en: 'New game' },
  'meneur.objectif_prefix':    { fr: 'Objectif des joueurs : ',
                                 en: 'Players’ objective: ' },
  'meneur.clan_impose_prefix': { fr: 'Clan proposé : ',
                                 en: 'Proposed clan: ' },
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
  'joueur.tooltip.aide':       { fr: 'Aide du joueur', en: 'Player Guide' },
  'joueur.rejoindre.titre':    { fr: 'Rejoindre la partie',
                                 en: 'Join the game' },
  'joueur.rejoindre.info_clan':{ fr: 'Le clan est proposé par le meneur — il sera affiché dès que vous rejoignez.',
                                 en: 'The clan is proposed by the game master — it will be shown as soon as you join.' },
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
  'joueur.btn_quitter':        { fr: '🚪 Quitter', en: '🚪 Leave' },
  'joueur.annonce.label':      { fr: '🔊 Touche pour entendre le son', en: '🔊 Tap to hear the sound' },
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
  'trophees.nom_titre':        { fr: 'Nom du gagnant ou de la gagnante (optionnel)',
                                 en: 'Winner’s name (optional)' },
  'trophees.nom_ph':           { fr: 'ex : Marie, Jean…',
                                 en: 'e.g. Mary, John…' },
  'trophees.date_titre':       { fr: 'Date', en: 'Date' },
  'trophees.date_ph':          { fr: 'JJ/MM/AAAA', en: 'DD/MM/YYYY' },
  'trophees.btn_print':        { fr: '🖨️ Imprimer', en: '🖨️ Print' },
  'trophees.empty':            { fr: 'Choisissez un ou plusieurs clans ci-dessus pour générer les cartes-gagnant·e.',
                                 en: 'Choose one or more clans above to generate winner cards.' },
  'trophees.titre':            { fr: 'Gagnant ou gagnante Wendio', en: 'Wendio Winner' },
  'trophees.bravo':            { fr: 'Bravo {nom} !', en: 'Bravo {nom}!' },
  'trophees.bravo_default':    { fr: '(nom du gagnant ou de la gagnante)',
                                 en: '(winner’s name)' },
  'trophees.clan_prefix':      { fr: 'Clan ', en: 'Clan ' },
  'trophees.points':           { fr: '{n} point{s} WENDIO', en: '{n} point{s} WENDIO' },
  'trophees.footer':           { fr: 'Une main sur le passé, une oreille sur l’avenir',
                                 en: 'One hand on the past, one ear on the future' },

  // ── Démo Duo (page demo-duo.html — iframes meneur + joueur cote-a-cote) ──
  'lobby.demo.label':          { fr: 'Démo duo',
                                 en: 'Duo demo' },
  'lobby.demo.desc':           { fr: 'Vue meneur + vue joueur côte-à-côte dans une seule page, pour faire une démo de Wendio sans audience.',
                                 en: 'Master + player views side-by-side in one page, to demo Wendio without an audience.' },

  // ── Crédits et remerciements (page credits.html) ───────────────────
  'lobby.credits.label':       { fr: 'Crédits et remerciements',
                                 en: 'Credits & Acknowledgements' },
  'lobby.credits.desc':        { fr: 'Merci à celles et ceux qui ont prêté leur voix, leur talent et leurs conseils à WENDIO.',
                                 en: 'Thanks to those who lent their voice, talent and counsel to WENDIO.' },
  'credits.titre':             { fr: 'Crédits et remerciements',
                                 en: 'Credits & Acknowledgements' },
  'credits.sous_titre':        { fr: 'WENDIO — Le Jeu des Clans',
                                 en: 'WENDIO — The Game of Clans' },
  'credits.intro':             { fr: 'Merci à celles et ceux qui ont rendu WENDIO possible.',
                                 en: 'Thanks to those who made WENDIO possible.' },
  'credits.sonia.nom':         { fr: 'Sonia Gros-Louis', en: 'Sonia Gros-Louis' },
  'credits.sonia.role':        { fr: '', en: '' },
  'credits.sonia.txt':         { fr: 'Un grand merci à madame Sonia Gros-Louis pour son soutien indéfectible et ses conseils avisés tout au long de ce projet.',
                                 en: 'Our heartfelt thanks to Mrs. Sonia Gros-Louis for her unwavering support and wise counsel throughout this project.' },
  'credits.andree.nom':        { fr: 'Andrée Levesque Sioui', en: 'Andrée Levesque Sioui' },
  'credits.andree.role':       { fr: 'autrice-interprète', en: 'author-performer' },
  'credits.andree.txt':        { fr: "Nous exprimons notre profonde gratitude à madame Andrée Levesque Sioui, autrice-interprète, qui a prêté sa voix et son talent à la création des 72 fichiers audio en wendat, français et anglais, donnant ainsi toute sa richesse à l'application WENDIO.",
                                 en: 'We express our deep gratitude to Mrs. Andrée Levesque Sioui, author-performer, who lent her voice and talent to the creation of the 72 audio files in Wendat, French and English, giving the WENDIO application all of its richness.' },
  'credits.footer':            { fr: "Une main sur le passé, une oreille sur l'avenir.",
                                 en: 'One hand on the past, one ear on the future.' },

  // ── Aide du meneur ─────────────────────────────────────────────────
  'aide.retour':               { fr: '← Retour au lobby',         en: '← Back to lobby' },
  'aide.retour_long':          { fr: '← Retour au lobby Wendio',  en: '← Back to Wendio lobby' },
  'aide.imprimer':             { fr: '🖨 Imprimer cette aide',    en: '🖨 Print this guide' },
  'aide.titre':                { fr: 'Aide du meneur',             en: 'Game Master Guide' },
  'aide.sous_titre':           { fr: "Tout ce qu'il faut pour animer une partie de WENDIO",
                                 en: 'Everything you need to run a WENDIO game' },
  'aide.toc.titre':            { fr: 'Sommaire',                   en: 'Contents' },
  'aide.footer':               { fr: 'Aide du meneur · WENDIO · Le Jeu des Clans',
                                 en: 'Game Master Guide · WENDIO · The Game of Clans' },

  // Section 1
  'aide.s1.titre':             { fr: 'Le rôle du meneur',          en: 'The Game Master role' },
  'aide.s1.p1':                { fr: "Le meneur est la personne qui anime la partie. C'est lui qui tire les numéros (ou en désigne un physiquement), qui invite le groupe ou la classe à répéter le mot wendat à voix haute ensemble après chaque tirage, et qui décide quand la partie commence et se termine.",
                                 en: 'The Game Master is the person who runs the game. They draw the numbers (or pick one physically), invite the group or class to repeat the Wendat word out loud together after each draw, and decide when the game starts and ends.' },
  'aide.s1.p2':                { fr: 'Dans WENDIO, le meneur joue un rôle pédagogique : il donne à entendre la langue wendat à chaque tirage. Les enregistrements audio donnent la prononciation, et c\'est ensuite le groupe (la salle, la classe) qui la répète ensemble à voix haute — c\'est le cœur de l\'apprentissage collectif.',
                                 en: 'In WENDIO, the Game Master plays a pedagogical role: they let the Wendat language be heard at every draw. The audio recordings provide the pronunciation, and then the group (the room, the class) repeats it together out loud — that\'s the heart of collective learning.' },
  'aide.s1.info.titre':        { fr: 'À retenir',                  en: 'Keep in mind' },
  'aide.s1.info.txt':          { fr: "Un seul meneur par partie. Si le meneur ferme son onglet en cours de partie, la partie se termine pour tous les joueurs. Choisis un appareil stable (PC ou tablette en charge) pour animer.",
                                 en: 'Only one Game Master per game. If the Master closes their tab during play, the game ends for everyone. Use a reliable device (PC or charged tablet) to run it.' },

  // Section 2
  'aide.s2.titre':             { fr: 'Mode local ou En ligne',     en: 'Local or Online mode' },
  'aide.s2.intro':             { fr: "Avant de lancer la partie, tu choisis si les joueurs jouent sur leur propre appareil (en ligne) ou s'ils ont des cartes papier devant eux (local).",
                                 en: 'Before starting the game, you choose whether players play on their own device (online) or have paper cards in front of them (local).' },
  'aide.s2.local.titre':       { fr: '🏠 Mode local',              en: '🏠 Local mode' },
  'aide.s2.local.quand':       { fr: "Quand : cartes papier imprimées, salle de classe, fête de famille, kiosque. Les joueurs n'ont pas de téléphone.",
                                 en: "When: printed paper cards, classroom, family party, booth. Players don't have phones." },
  'aide.s2.local.l1':          { fr: 'Tu tires les numéros sur ton écran',         en: 'You draw the numbers on your screen' },
  'aide.s2.local.l2':          { fr: 'Le son est joué automatiquement, puis tu invites le groupe à répéter le mot wendat à voix haute ensemble',
                                 en: 'The sound plays automatically, then you invite the group to repeat the Wendat word out loud together' },
  'aide.s2.local.l3':          { fr: 'Les joueurs marquent leurs cartes papier eux-mêmes',
                                 en: 'Players mark their paper cards themselves' },
  'aide.s2.local.l4':          { fr: "Quand un joueur crie « WENDIO ! », tu vérifies sa carte à l'œil",
                                 en: 'When a player calls « WENDIO! », you check their card visually' },
  'aide.s2.online.titre':      { fr: '🌐 Mode en ligne',           en: '🌐 Online mode' },
  'aide.s2.online.quand':      { fr: "Quand : chacun a son téléphone ou sa tablette. Pas besoin d'imprimer.",
                                 en: 'When: everyone has their phone or tablet. No printing needed.' },
  'aide.s2.online.l1':         { fr: 'Tu partages un code à 4 caractères ou un QR code',
                                 en: 'You share a 4-character code or a QR code' },
  'aide.s2.online.l2':         { fr: 'Chaque joueur reçoit sa propre carte aléatoire',
                                 en: 'Each player receives their own random card' },
  'aide.s2.online.l3':         { fr: "Tu tires les numéros, ils s'affichent chez tout le monde",
                                 en: "You draw the numbers, they appear on everyone's screen" },
  'aide.s2.online.l4':         { fr: 'La victoire est vérifiée automatiquement côté serveur (anti-triche)',
                                 en: 'Victory is verified automatically server-side (anti-cheat)' },
  'aide.s2.astuce.titre':      { fr: 'Mix possible',               en: 'Mix possible' },
  'aide.s2.astuce.txt':        { fr: "Tu peux faire une partie où certains joueurs ont une carte papier et d'autres une carte numérique — mais dans ce cas, choisis le mode local côté meneur (sinon les joueurs papier ne pourront pas déclarer victoire).",
                                 en: "You can run a game where some players have paper cards and others use digital cards — but in that case, choose local mode on the Master side (otherwise paper players can't declare victory)." },

  // Section 3
  'aide.s3.titre':             { fr: 'Tirage aléatoire ou physique',  en: 'Random or physical draw' },
  'aide.s3.intro':             { fr: "Indépendamment du mode local/en ligne, tu choisis comment les numéros sont tirés.",
                                 en: 'Regardless of local/online mode, you choose how numbers are drawn.' },
  'aide.s3.alea.titre':        { fr: '🎲 Tirage aléatoire',         en: '🎲 Random draw' },
  'aide.s3.alea.txt':          { fr: "L'ordinateur tire un numéro au hasard quand tu cliques sur « TIRER ». Rapide, parfait pour démarrer ou pour une démo solo.",
                                 en: 'The computer picks a random number when you click « DRAW ». Quick, perfect for getting started or for a solo demo.' },
  'aide.s3.phys.titre':        { fr: '🎯 Tirage physique',          en: '🎯 Physical draw' },
  'aide.s3.phys.txt':          { fr: "Tu utilises un paquet de cartes à jouer avec les chiffres (si tu en as reçu un de ton conseil de bande). Quand tu piges une carte, tu cliques sur sa case dans la grille de suivi. C'est ce numéro qui devient le « numéro tiré » officiel.",
                                 en: "You use a deck of numbered playing cards (if your band council provided you with one). When you draw a card, you click on its cell in the tracking grid. That number becomes the official « drawn number »." },
  'aide.s3.info.titre':        { fr: 'Bon à savoir',                en: 'Good to know' },
  'aide.s3.info.txt':          { fr: "En mode physique, le bouton « TIRER » disparaît. C'est toi (en pigeant une carte du paquet) qui décides quel numéro est tiré. La grille de suivi devient interactive : chaque case non-tirée devient cliquable.",
                                 en: "In physical mode, the « DRAW » button disappears. You (by drawing a card from the deck) decide which number is called. The tracking grid becomes interactive: each undrawn cell becomes clickable." },

  // Section 4 — Clans
  'aide.s4.titre':             { fr: 'Les 4 clans et leurs victoires', en: 'The 4 clans and their victory conditions' },
  'aide.s4.intro':             { fr: "Chaque partie se joue avec un seul clan proposé par toi. Tous les joueurs ont la même condition de victoire. Plus le défi du clan est grand, plus il rapporte de points.",
                                 en: 'Each game is played with a single clan proposed by you. All players have the same victory condition. The greater the clan challenge, the more points it scores.' },
  'aide.s4.coeur':             { fr: "Les 4 cases centrales (le Cœur) sont toujours libres dans toutes les conditions. Elles affichent les icônes des clans 🦌🐢🐻🐺 — ce ne sont pas juste des cases gratuites, elles incarnent les clans au centre de la carte.",
                                 en: 'The 4 center cells (the Heart) are always free in every condition. They display the clan icons 🦌🐢🐻🐺 — they are not just free cells, they embody the clans at the center of the card.' },
  'aide.s4.chevreuil.victoire':{ fr: 'Les 32 cases numérotées de la carte.',
                                 en: 'All 32 numbered cells of the card.' },
  'aide.s4.tortue.victoire':   { fr: "L'anneau de 12 cases qui entoure le Cœur.",
                                 en: 'The 12-cell ring around the Heart.' },
  'aide.s4.ours.victoire':     { fr: 'Les 4 coins de la carte.',
                                 en: 'The 4 corners of the card.' },
  'aide.s4.loup.victoire':     { fr: 'Une ligne complète : horizontale, verticale ou diagonale.',
                                 en: 'One complete line: horizontal, vertical or diagonal.' },
  'aide.s4.astuce.titre':      { fr: 'Quel clan choisir ?',         en: 'Which clan to choose?' },
  'aide.s4.astuce.txt':        { fr: "Pour une partie courte (5-10 min), choisis Loup ou Ours. Pour une partie pédagogique longue qui fait entendre tous les numéros, choisis Chevreuil. Tortue est un bon équilibre.",
                                 en: 'For a short game (5-10 min), choose Wolf or Bear. For a long pedagogical game that lets all numbers be heard, choose Deer. Turtle is a good balance.' },

  // Section 5 — Étapes online
  'aide.s5.titre':             { fr: 'Lancer une partie en ligne',  en: 'Start an online game' },
  'aide.s5.intro':             { fr: "Voici les étapes du point de vue du meneur, du moment où tu ouvres l'app jusqu'à l'accomplissement du gagnant ou de la gagnante.",
                                 en: "Here are the steps from the Master's point of view, from opening the app to the winner's achievement." },
  'aide.s5.e1.t':              { fr: 'Ouvre la configuration meneur', en: 'Open the Master configuration' },
  'aide.s5.e1.p':              { fr: 'Depuis le lobby, clique sur « Meneur de Jeu ». Tu arrives sur la page de configuration : Mode, Tirage, Clan.',
                                 en: 'From the lobby, click « Game Master ». You arrive at the configuration page: Mode, Draw, Clan.' },
  'aide.s5.e2.t':              { fr: 'Choisis les 3 paramètres',     en: 'Pick the 3 settings' },
  'aide.s5.e2.p':              { fr: "Mode En ligne, Tirage Aléatoire (sauf si tu as reçu un paquet de cartes à jouer du conseil de bande), et le clan proposé que tous les joueurs devront choisir.",
                                 en: 'Online mode, Random draw (unless your band council provided you with a deck of playing cards), and the proposed clan that all players will choose.' },
  'aide.s5.e3.t':              { fr: 'Crée la partie',               en: 'Create the game' },
  'aide.s5.e3.p':              { fr: "Clique sur « Créer la partie ». Tu reçois un code à 4 caractères (ex : AB3K) et un QR code à montrer au public.",
                                 en: 'Click « Create game ». You get a 4-character code (e.g. AB3K) and a QR code to show to the audience.' },
  'aide.s5.e4.t':              { fr: 'Partage le code aux joueurs',  en: 'Share the code with players' },
  'aide.s5.e4.p':              { fr: "Affiche le QR code à l'écran (ou projette-le), ou utilise le bouton « Copier le lien » pour l'envoyer dans un groupe Messenger/SMS. Chaque joueur ouvre l'URL, choisit son nom, et apparaît dans ta liste.",
                                 en: 'Show the QR code on screen (or project it), or use the « Copy link » button to send it in a Messenger/SMS group. Each player opens the URL, picks a name, and appears in your list.' },
  'aide.s5.e5.t':              { fr: "Attends que tout le monde soit là", en: 'Wait until everyone is in' },
  'aide.s5.e5.p':              { fr: "Le compteur de joueurs augmente à chaque arrivée. Vérifie que personne n'a été oublié — une fois la partie démarrée, plus aucun nouveau joueur ne peut se joindre à la partie.",
                                 en: "The player counter goes up with each arrival. Make sure no one is forgotten — once the game starts, no new players can join." },
  'aide.s5.e6.t':              { fr: 'Démarre la partie',            en: 'Start the game' },
  'aide.s5.e6.p':              { fr: 'Clique sur « ▶ Commencer la partie ». Le code et le QR disparaissent, les inscriptions sont closes. Tu vois maintenant le bouton TIRER.',
                                 en: 'Click « ▶ Start the game ». The code and QR disappear, registrations close. You now see the DRAW button.' },
  'aide.s5.e7.t':              { fr: 'Tire les numéros',             en: 'Draw the numbers' },
  'aide.s5.e7.p':              { fr: "À chaque clic sur TIRER, un numéro est tiré au hasard et diffusé à tous les joueurs. Sa carte (chiffre + mot wendat + phonétique) s'affiche en grand sur ton écran. Le son joue automatiquement chez toi.",
                                 en: "Each click on DRAW picks a random number and broadcasts it to all players. Its card (number + Wendat word + phonetic) shows up large on your screen. The sound plays automatically on your device." },
  'aide.s5.e8.t':              { fr: 'Accomplissement',               en: 'Achievement' },
  'aide.s5.e8.p':              { fr: "Dès qu'un joueur déclare une victoire valide, la partie se termine pour tout le monde. Un overlay vert apparaît avec son nom et sa carte-gagnant·e. Tu peux imprimer la carte-gagnant·e ou démarrer une nouvelle partie.",
                                 en: 'As soon as a player declares a valid victory, the game ends for everyone. A green overlay appears with their name and winner card. You can print the winner card or start a new game.' },
  'aide.s5.alerte.titre':      { fr: 'Ne ferme pas ton onglet meneur', en: "Don't close your Master tab" },
  'aide.s5.alerte.txt':        { fr: "Si tu fermes l'onglet ou si la connexion Internet tombe pendant la partie, tous les joueurs reçoivent un message « Partie terminée » et la partie est perdue. Garde ton appareil branché.",
                                 en: 'If you close the tab or if your Internet connection drops during the game, all players receive a « Game ended » message and the game is lost. Keep your device plugged in.' },

  // Section 6 — Physique
  'aide.s6.titre':             { fr: 'Le mode physique en détail',  en: 'Physical mode in detail' },
  'aide.s6.p1':                { fr: "En mode physique, c'est toi qui décides quel numéro est tiré (en pigeant une carte du paquet de cartes à jouer fourni par le conseil de bande, si tu en as reçu un). L'app sert juste à afficher le mot wendat et à jouer le son.",
                                 en: 'In physical mode, you decide which number is drawn (by drawing a card from the deck provided by your band council, if you received one). The app just displays the Wendat word and plays the sound.' },
  'aide.s6.p2':                { fr: 'Le bouton TIRER disparaît. À la place, la grille de suivi W-E-N-D-I-O en bas de l\'écran devient interactive :',
                                 en: 'The DRAW button disappears. Instead, the W-E-N-D-I-O tracking grid at the bottom of the screen becomes interactive:' },
  'aide.s6.l1':                { fr: 'Clique sur une case non-tirée pour la déclarer comme nouveau tirage (elle s\'affiche en grand + son joué + diffusé aux joueurs en ligne).',
                                 en: 'Click on an undrawn cell to declare it as a new draw (it shows up large + sound plays + broadcast to online players).' },
  'aide.s6.l2':                { fr: "Clique sur une case déjà tirée pour rejouer son son (utile si quelqu'un a mal entendu).",
                                 en: 'Click on an already-drawn cell to replay its sound (useful if someone missed it).' },
  'aide.s6.info.titre':        { fr: 'Combinaisons possibles',      en: 'Possible combinations' },
  'aide.s6.info.txt':          { fr: "Tu peux jouer Physique + Local (jeu traditionnel : paquet de cartes à jouer + cartes papier des joueurs, l'app sert juste pour le son), ou Physique + En ligne (tu piges les cartes physiquement mais les joueurs sont sur leur téléphone — l'app diffuse aux cartes numériques).",
                                 en: 'You can play Physical + Local (traditional game: deck of playing cards + paper cards for players, app just for sound), or Physical + Online (you draw the cards physically but players are on their phones — the app broadcasts to digital cards).' },

  // Section 7 — Prez
  'aide.s7.titre':             { fr: 'Trucs pour une bonne présentation', en: 'Tips for a good presentation' },
  'aide.s7.h_avant':           { fr: 'Avant la partie',             en: 'Before the game' },
  'aide.s7.avant.l1':          { fr: "Active le mode plein écran sur l'écran meneur (bouton ⛶ en haut). Évite que le menu du navigateur prenne de la place.",
                                 en: 'Enable fullscreen mode on the Master screen (⛶ button at the top). Avoid the browser menu taking up space.' },
  'aide.s7.avant.l2':          { fr: 'Branche l\'appareil — une partie peut durer 20-30 min en mode Chevreuil.',
                                 en: 'Plug in the device — a game can last 20-30 min in Deer mode.' },
  'aide.s7.avant.l3':          { fr: 'Teste le son en cliquant un numéro en mode démo. Vérifie le volume des enceintes de la salle.',
                                 en: 'Test the sound by clicking a number in demo mode. Check the room speakers volume.' },
  'aide.s7.avant.l4':          { fr: "Imprime les cartes-gagnant·e à l'avance si tu veux les remettre physiquement à la fin (page « Cartes-gagnant·e à imprimer » dans le lobby).",
                                 en: 'Print the winner cards in advance if you want to hand them out physically at the end (« Winner cards to print » page in the lobby).' },
  'aide.s7.avant.l5':          { fr: "Sur tablette en paysage, l'interface est optimisée pour cette orientation — bascule l'appareil avant de lancer.",
                                 en: 'On landscape tablet, the interface is optimized for this orientation — rotate the device before starting.' },
  'aide.s7.h_pendant':         { fr: 'Pendant la partie',           en: 'During the game' },
  'aide.s7.pendant.l1':        { fr: "Invite le groupe (salle, classe) à répéter le mot wendat à voix haute ensemble après chaque tirage — la phonétique est affichée en gros pour aider tout le monde.",
                                 en: 'Invite the group (room, class) to repeat the Wendat word out loud together after each draw — the phonetic is displayed in large to help everyone.' },
  'aide.s7.pendant.l2':        { fr: 'Laisse 5-10 secondes entre chaque tirage pour que les joueurs aient le temps de chercher sur leur carte.',
                                 en: 'Leave 5-10 seconds between each draw so players have time to search their card.' },
  'aide.s7.pendant.l3':        { fr: 'Si un joueur a manqué un numéro, clique sur sa case dans la grille de suivi pour rejouer le son.',
                                 en: 'If a player missed a number, click on its cell in the tracking grid to replay the sound.' },
  'aide.s7.h_apres':           { fr: 'Après la partie',             en: 'After the game' },
  'aide.s7.apres.l1':          { fr: 'Imprime la carte-gagnant·e avec le nom et la date (depuis le lobby → « Cartes-gagnant·e à imprimer »).',
                                 en: "Print the winner card with the name and the date (from the lobby → « Winner cards to print »)." },
  'aide.s7.apres.l2':          { fr: 'Clique sur « Nouvelle partie » pour relancer immédiatement (les joueurs en ligne devront re-scanner le nouveau code).',
                                 en: 'Click « New game » to restart immediately (online players will need to re-scan the new code).' },
  'aide.s7.h_demo':            { fr: 'Démo sans audience (montrer Wendio à quelqu\'un)',
                                 en: 'Demo without an audience (showing Wendio to someone)' },
  'aide.s7.demo.p1':           { fr: "Pour faire une démonstration de Wendio à quelqu'un (parent, partenaire, classe de profs) sans avoir de vrais joueurs sous la main, utilise le bouton « 🤖 Simuler 3 joueurs » qui apparaît dans la barre latérale quand tu as créé une partie en ligne.",
                                 en: 'To demo Wendio to someone (parent, partner, teachers) without real players around, use the « 🤖 Simulate 3 players » button that appears in the sidebar after you create an online game.' },
  'aide.s7.demo.p2':           { fr: "Le serveur ajoute 3 joueurs « bots » avec des cartes aléatoires (Alice, Bob, Carla...). Tu démarres la partie, tu tires des numéros, et l'un d'eux finit par gagner naturellement (le clan Loup est le plus rapide pour une démo, en ~10-15 tirages).",
                                 en: 'The server adds 3 « bot » players with random cards (Alice, Bob, Carla...). You start the game, draw numbers, and one of them eventually wins naturally (the Wolf clan is the fastest for a demo, around 10-15 draws).' },
  'aide.s7.demo.astuce.titre': { fr: 'Recette démo express (5 min)',
                                 en: 'Express demo recipe (5 min)' },
  'aide.s7.demo.astuce.txt':   { fr: 'Lobby → Meneur → En ligne → Aléatoire → Loup → « Créer la partie » → « 🤖 Simuler 3 joueurs » → « Commencer la partie » → tirer rapidement jusqu\'à la victoire (l\'overlay gagnant apparaît tout seul).',
                                 en: 'Lobby → Master → Online → Random → Wolf → « Create game » → « 🤖 Simulate 3 players » → « Start the game » → draw quickly until victory (the winner overlay appears by itself).' },

  // Section 8 — Dépannage
  'aide.s8.titre':             { fr: 'Dépannage rapide',            en: 'Quick troubleshooting' },
  'aide.s8.h1':                { fr: "Un joueur s'est déconnecté en cours de partie", en: 'A player disconnected during the game' },
  'aide.s8.h1.txt':            { fr: "Pas de panique : la place du joueur est conservée pendant toute la partie. S'il revient sur la même URL avec le même appareil (et qu'il n'a pas fermé l'onglet), il retrouve automatiquement sa carte et tous les numéros déjà tirés.",
                                 en: "Don't panic: the player's seat is kept for the whole game. If they come back to the same URL with the same device (and haven't closed the tab), they automatically recover their card and all drawn numbers." },
  'aide.s8.h2':                { fr: 'Un joueur arrive en retard, après le démarrage', en: 'A player arrives late, after the start' },
  'aide.s8.h2.txt':            { fr: "Impossible de rejoindre une partie déjà commencée (anti-triche : il pourrait choisir son nom en sachant déjà les numéros tirés). Solution : démarre une nouvelle partie et invite tout le monde à se réinscrire.",
                                 en: "Cannot join a game already started (anti-cheat: they could pick their name knowing the drawn numbers). Solution: start a new game and invite everyone to re-register." },
  'aide.s8.h3':                { fr: 'Le bouton TIRER reste désactivé', en: 'The DRAW button stays disabled' },
  'aide.s8.h3.txt':            { fr: "En mode en ligne, il s'active seulement après avoir cliqué « ▶ Commencer la partie ». En mode local, il s'active dès qu'un clan est choisi. Vérifie aussi qu'il y a au moins un joueur connecté en ligne.",
                                 en: 'In online mode, it activates only after clicking « ▶ Start the game ». In local mode, it activates as soon as a clan is chosen. Also check that at least one player is connected online.' },
  'aide.s8.h4':                { fr: 'Personne n\'entend le son côté joueur', en: 'No one hears the sound on the player side' },
  'aide.s8.h4.txt':            { fr: "C'est par design : si chaque téléphone joue le son en même temps, c'est une cascade insupportable dans une salle. Les joueurs peuvent rejouer le son en touchant une case de leur carte (utile s'ils veulent réécouter). Le son joue chez toi (meneur) automatiquement.",
                                 en: "It's by design: if every phone plays the sound at the same time, it's an unbearable cascade in a room. Players can replay the sound by touching a cell on their card (useful if they want to listen again). The sound plays on your (Master) device automatically." },
  'aide.s8.h5':                { fr: "Un joueur dit qu'il a gagné mais l'app refuse", en: 'A player says they won but the app refuses' },
  'aide.s8.h5.txt':            { fr: "La victoire est vérifiée serveur-side. Si l'app refuse, c'est que sa carte ne remplit pas la condition du clan. Vérifie : (1) il joue bien le bon clan ? (2) les numéros qu'il pense avoir cochés sont-ils vraiment tirés ? Les cases du Cœur comptent toujours comme libres.",
                                 en: 'Victory is verified server-side. If the app refuses, their card does not meet the clan condition. Check: (1) are they playing the right clan? (2) are the numbers they think they ticked really drawn? Heart cells always count as free.' },
  'aide.s8.h6':                { fr: "L'onglet meneur a planté pendant la partie", en: 'The Master tab crashed during the game' },
  'aide.s8.h6.txt':            { fr: "Malheureusement, le meneur n'a pas de système de reconnexion (les joueurs en ont un). Si tu rafraîchis ton onglet ou si ton appareil plante, la partie est perdue. Redémarre une nouvelle partie.",
                                 en: "Unfortunately, the Master has no reconnection system (players do). If you refresh your tab or your device crashes, the game is lost. Restart a new game." },
  'aide.s8.signaler.titre':    { fr: 'Un autre problème ?',         en: 'Another problem?' },
  'aide.s8.signaler.txt':      { fr: "Utilise le bouton 💬 Signaler en bas à droite de chaque écran pour envoyer un rapport directement à JF — capture d'écran et description en 30 secondes.",
                                 en: 'Use the 💬 Report button at the bottom right of each screen to send a report directly to JF — screenshot and description in 30 seconds.' },

  // ── Aide du joueur ─────────────────────────────────────────────────
  'aidej.retour_jouer':        { fr: '← Retourner au jeu',         en: '← Back to the game' },
  'aidej.imprimer':            { fr: '🖨 Imprimer',                en: '🖨 Print' },
  'aidej.titre':               { fr: 'Aide du joueur',             en: 'Player Guide' },
  'aidej.sous_titre':          { fr: 'Comment jouer à WENDIO selon ton type de partie',
                                 en: 'How to play WENDIO depending on your game type' },
  'aidej.footer':              { fr: 'Aide du joueur · WENDIO · Le Jeu des Clans',
                                 en: 'Player Guide · WENDIO · The Game of Clans' },
  'aidej.footer_lien':         { fr: '← Retourner au jeu',         en: '← Back to the game' },

  'aidej.mode_online.titre':   { fr: '🌐 Partie en ligne',         en: '🌐 Online game' },
  'aidej.mode_online.txt':     { fr: "Tu as reçu un code à 4 lettres ou un QR code du meneur. Tu joues avec une carte numérique sur ton téléphone ou ta tablette.",
                                 en: 'You received a 4-letter code or a QR code from the host. You play with a digital card on your phone or tablet.' },
  'aidej.mode_online.lien':    { fr: 'Voir comment →',             en: 'See how →' },
  'aidej.mode_papier.titre':   { fr: '📄 Carte papier imprimée',    en: '📄 Printed paper card' },
  'aidej.mode_papier.txt':     { fr: "Le meneur t'a remis une carte papier ou tu en as imprimé une. Tu marques tes cases au crayon ou avec un grain de maïs.",
                                 en: 'The host gave you a paper card or you printed one. You mark cells with a pencil or a corn kernel.' },
  'aidej.mode_papier.lien':    { fr: 'Imprimer ma carte →',        en: 'Print my card →' },
  'aidej.mode_mobile.titre':   { fr: '📱 Carte numérique solo',    en: '📱 Solo digital card' },
  'aidej.mode_mobile.txt':     { fr: "Tu veux jouer sur ton appareil sans partie organisée (pratique, entraînement, ou juste pour découvrir le jeu).",
                                 en: 'You want to play on your device without an organized game (practice, training, or just to discover the game).' },
  'aidej.mode_mobile.lien':    { fr: 'Ouvrir ma carte →',          en: 'Open my card →' },

  'aidej.s1.titre':            { fr: 'Rejoindre une partie en ligne', en: 'Join an online game' },
  'aidej.s1.l1':               { fr: "Scanne le QR code projeté par le meneur, ou tape le code à 4 lettres dans la page « Carte numérique ».",
                                 en: "Scan the QR code shown by the host, or type the 4-letter code in the « Digital card » page." },
  'aidej.s1.l2':               { fr: "Choisis ton nom (visible par le meneur et les autres joueurs). Il doit être unique dans la partie.",
                                 en: 'Choose your name (visible to the host and other players). It must be unique in the game.' },
  'aidej.s1.l3':               { fr: "Attends que le meneur démarre la partie. Tu ne peux pas te joindre à une partie déjà commencée.",
                                 en: "Wait for the host to start the game. You can't join a game that has already started." },
  'aidej.s1.l4':               { fr: "Quand un numéro est tiré, sa carte (chiffre + mot wendat + phonétique) s'affiche sur ton écran.",
                                 en: 'When a number is drawn, its card (number + Wendat word + phonetic) shows on your screen.' },
  'aidej.s1.l5':               { fr: "Touche les cases tirées de ta carte pour les marquer. Tu peux toucher l'annonce pour réécouter le son.",
                                 en: 'Touch the drawn cells on your card to mark them. Touch the announcement to replay the sound.' },
  'aidej.s1.l6':               { fr: "Quand tu remplis la condition de victoire de ton clan, le bouton « WENDIO ! » apparaît — clique-le pour réclamer la victoire.",
                                 en: "When you meet your clan's victory condition, the « WENDIO! » button appears — click it to claim the win." },
  'aidej.s1.audio.titre':      { fr: '🔊 Le son ne joue pas tout seul', en: "🔊 Sound doesn't play by itself" },
  'aidej.s1.audio.txt':        { fr: "Quand un numéro est tiré, sa carte s'affiche mais le son ne joue pas automatiquement — c'est voulu : dans une salle où plusieurs joueurs sont sur leurs téléphones, ça serait une cacaphonie. Pour entendre le mot wendat, touche n'importe quelle case de ta carte (ou touche la petite carte d'annonce en haut). Le son joue chez toi seulement.",
                                 en: "When a number is drawn, its card shows up but the sound doesn't play automatically — it's intentional: in a room with many phones, it would be a cacophony. To hear the Wendat word, tap any cell on your card (or tap the small announcement card at the top). The sound plays only on your device." },
  'aidej.s1.info.titre':       { fr: 'Téléphone en veille ?',      en: 'Phone went to sleep?' },
  'aidej.s1.info.txt':         { fr: "Pas de panique : si tu rouvres la même URL avec le même téléphone, tu retrouves ta carte et tous les numéros déjà tirés. Garde juste l'onglet ouvert.",
                                 en: "Don't worry: if you reopen the same URL with the same phone, you get back your card and all drawn numbers. Just keep the tab open." },

  'aidej.s2.titre':            { fr: 'Jouer avec une carte papier', en: 'Play with a paper card' },
  'aidej.s2.p1':               { fr: "Le meneur annonce un numéro à la fois. Repère-le sur ta carte et marque-le (crayon, jeton, grain de maïs).",
                                 en: 'The host announces one number at a time. Find it on your card and mark it (pencil, token, corn kernel).' },
  'aidej.s2.p2':               { fr: 'Chaque colonne de la carte correspond à une lettre du mot WENDIO :',
                                 en: 'Each column of the card matches a letter of the word WENDIO:' },
  'aidej.s2.l1':               { fr: 'W : numéros 1 à 12',          en: 'W: numbers 1 to 12' },
  'aidej.s2.l2':               { fr: 'E : numéros 13 à 24',         en: 'E: numbers 13 to 24' },
  'aidej.s2.l3':               { fr: 'N : numéros 25 à 36 (+ 2 cases Cœur centrales)',
                                 en: 'N: numbers 25 to 36 (+ 2 central Heart cells)' },
  'aidej.s2.l4':               { fr: 'D : numéros 37 à 48 (+ 2 cases Cœur centrales)',
                                 en: 'D: numbers 37 to 48 (+ 2 central Heart cells)' },
  'aidej.s2.l5':               { fr: 'I : numéros 49 à 60',         en: 'I: numbers 49 to 60' },
  'aidej.s2.l6':               { fr: 'O : numéros 61 à 72',         en: 'O: numbers 61 to 72' },
  'aidej.s2.p3':               { fr: "Les 4 cases centrales (le Cœur) sont toujours libres — elles comptent comme déjà marquées dans toutes les conditions de victoire.",
                                 en: 'The 4 central cells (the Heart) are always free — they count as already marked in every victory condition.' },
  'aidej.s2.p4':               { fr: "Dès que tu remplis la condition de ton clan, crie « WENDIO ! » et le meneur vérifie ta carte.",
                                 en: "As soon as you meet your clan's condition, shout « WENDIO! » and the host verifies your card." },

  'aidej.s3.titre':            { fr: 'Les 4 clans et leurs victoires', en: 'The 4 clans and their victory conditions' },
  'aidej.s3.intro':            { fr: 'Le meneur choisit un clan pour toute la partie. Tous les joueurs visent la même condition de victoire :',
                                 en: 'The host picks one clan for the whole game. All players aim for the same victory condition:' },
  'aidej.s3.chevreuil':        { fr: "🦌 Chevreuil (Ohskënonton') — une ligne complète (horizontale, verticale ou diagonale). Le plus rapide à gagner.",
                                 en: "🦌 Deer (Ohskënonton') — one complete line (horizontal, vertical or diagonal). The quickest to win." },
  'aidej.s3.loup':             { fr: "🐺 Loup (Yānariskwa') — les 4 coins de la carte.",
                                 en: "🐺 Wolf (Yānariskwa') — the 4 corners of the card." },
  'aidej.s3.ours':             { fr: "🐻 Ours (Yānionyen') — l'anneau de 12 cases qui entoure le Cœur.",
                                 en: "🐻 Bear (Yānionyen') — the 12-cell ring around the Heart." },
  'aidej.s3.tortue':           { fr: "🐢 Tortue (Yāndia'wich) — toutes les 32 cases numérotées. Le plus long et le plus prestigieux.",
                                 en: "🐢 Turtle (Yāndia'wich) — all 32 numbered cells. The longest and most prestigious." },
  'aidej.s3.astuce.titre':     { fr: 'Une seule victoire par partie', en: 'Only one winner per game' },
  'aidej.s3.astuce.txt':       { fr: "Dès qu'un joueur déclare une victoire valide, la partie est terminée pour tout le monde. Pas de classement multiple — le premier emporte tout.",
                                 en: 'As soon as a player declares a valid win, the game ends for everyone. No multiple ranking — the first takes all.' },

  'aidej.s4.titre':            { fr: 'Un bug ou une question ?',   en: 'A bug or a question?' },
  'aidej.s4.txt':              { fr: "Si tu remarques quelque chose qui ne marche pas (carte qui ne s'affiche pas, son qui ne joue pas, joueur fantôme dans la liste...), utilise le bouton 💬 Signaler en bas à droite de ta carte. Une capture d'écran et une courte description suffisent — l'équipe technique reçoit tout ça en direct.",
                                 en: "If you notice something not working (card not showing, sound not playing, phantom player in the list...), use the 💬 Report button at the bottom right of your card. A screenshot and a short description are enough — the tech team gets it all live." },
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

function t(key, vars) { return i18n.t(key, vars); }
