# Recommandations culturelles d'Andrée — design

Date : 2026-07-21
Source : courriel d'Andrée (conseillère wendat, cliente de Sylvain), reçu via Sylvain.

## Contexte

Andrée a relevé, à l'usage, une série d'écarts entre le vocabulaire de WENDIO et la
philosophie wendat. Son constat de fond : le jeu reste un bingo d'origine italienne puis
américaine (« Lo Giuoco del Lotto d'Italia », puis le Beano) habillé de mots wendat. Pour
que le Conseil s'y intéresse comme outil pédagogique, la culture doit être portée par les
règles et le vocabulaire, pas seulement par les chiffres.

Trois familles de changements en découlent :

1. la réassignation des clans aux conditions de victoire, selon le mythe de création ;
2. la terminologie et la philosophie (notamment : le trophée n'existe pas chez les Wendat) ;
3. les images de prix, qui doivent représenter de vrais objets anciens wendat.

## Contraintes du code existant

Ces contraintes conditionnent tout le reste ; elles ont été vérifiées avant rédaction.

- **Chaque chaîne FR visible existe deux fois** : en dur dans le HTML (fallback si JS
  désactivé) et dans `i18n.js`. Le HTML est écrasé au `DOMContentLoaded` par la valeur
  i18n. Modifier une seule des deux crée une incohérence silencieuse.
- Toute clé modifiée dans `i18n.js` a **aussi une version EN** à mettre à jour.
- Le mapping clan → condition de victoire est **dupliqué** : `data.js` (`CLANS`) côté
  client, `server.js` (`CLAN_VICTOIRE` + `victoireValide`) côté serveur pour l'anti-triche.
- `data.js` `CLANS[].label` sert de fallback aux clés `clan.<Nom>.victoire` de `i18n.js` —
  même texte à deux endroits également.
- Les 4 images de cartes-gagnant·e (`cartes/clan-{1..4}pt.jpg`) ont **le chiffre 1/2/3/4
  dessiné dans l'illustration**. Une image est donc liée à un nombre de points, pas à un
  animal.
- Les textes composés (« Objectif : <label clan> », « Clan imposé : X ») sont assemblés en
  JS via `t()` + `i18n.onLangChange()` ; ils ne sont pas couverts par `data-i18n`.

## 1. Réassignation clan ↔ condition ↔ points

Andrée : « J'irais aussi en priorisant l'ordre prioritaire des clans naturels selon notre
mythe de création soit : Chevreuil, Tortue, Ours et Loup. Donc l'ordre croissant serait :
Loup, l'ours, la tortue et le chevreuil. »

### Avant

| Clan | Condition | Pts |
|---|---|---|
| Chevreuil | Ligne complète | 1 |
| Loup | Les 4 coins | 2 |
| Ours | Carré protecteur (12 cases) | 3 |
| Tortue | Carte pleine (32 cases) | 4 |

### Après

| Clan | Wendat | Condition | Pts | `victoire` |
|---|---|---|---|---|
| 🐺 Loup | Yānariskwa' | Ligne complète (horizontale, verticale ou diagonale) | 1 | `ligne` |
| 🐻 Ours | Yānionyen' | Les 4 coins | 2 | `coins` |
| 🐢 Tortue | Yāndia'wich | Carré protecteur (12 cases) | 3 | `carre` |
| 🦌 Chevreuil | Ohskënonton' | Carte pleine (32 cases) | 4 | `pleine` |

Les noms wendat, les icônes et les 4 cases cœur (qui incarnent les clans) ne changent pas.

### Ordre d'affichage

Partout où les 4 clans sont listés, l'ordre devient **Chevreuil → Tortue → Ours → Loup**
(préséance du mythe de création), c'est-à-dire l'ordre décroissant de points. Concerné :

- l'objet `CLANS` de `data.js` (l'ordre des clés fait foi, consommé via `Object.keys`) ;
- la sélection de clan du meneur (`meneur-config.html`, boutons de `meneur.html`) ;
- les fiches clans illustrées de `aide-meneur.html` (section `#clans`) ;
- `imprimer-trophees.html` (le commentaire « ordre WENDIO logique » à mettre à jour).

### Fichiers touchés

| Fichier | Changement |
|---|---|
| `data.js` | `CLANS` : réordonner les clés et réassigner `victoire`, `points`, `label` |
| `server.js` | `CLAN_VICTOIRE` ; vérifier que `victoireValide()` reste correcte |
| `i18n.js` | `clan.<Nom>.victoire` (FR + EN) |
| `aide-meneur.html` | les 4 `.clan-carte` : le SVG 6×6 illustrant la condition suit son clan ; `<div class="points">` |
| `imprimer-trophees.html` | ordre des clans, couleurs par clan, commentaire |

### Vérification

C'est le seul changement à risque de régression. Test : pour chacun des 4 clans,
`victoireValide()` accepte une carte remplissant la condition attendue et refuse les trois
autres conditions. Un joueur ne doit pas pouvoir déclarer victoire avec l'ancien mapping.

### Hors code

Le mapping est aussi gravé dans le PPTX / les PDF de règles du dossier `Manual/` et dans
les cartes déjà imprimées par Sylvain. À signaler à Sylvain ; ne pas tenter de corriger par
le code.

## 2. Terminologie et philosophie

Le principe qu'Andrée pose : « Dans la philosophie des Wendat (et la plupart des PN),
l'idée de trophée n'existe pas. » Les ancêtres pariaient et remportaient les biens misés ;
les médailles sont arrivées avec les Européens.

| Avant | Après |
|---|---|
| clan **imposé** (aux joueurs / par toi) | clan **proposé** |
| « le clan imposé que tous les joueurs devront **viser** » | « le clan proposé que tous les joueurs devront **choisir** » |
| « Plus le clan est **rare** (et exigeant), plus il rapporte de points » | « Plus le **défi** du clan est **grand**, plus il rapporte de points » |
| le compteur de joueurs **s'incrémente** | le compteur de joueurs **augmente** |
| plus aucun nouveau joueur ne peut **rejoindre** | ne peut **se joindre à la partie** |
| dans la **sidebar** | dans la **barre latérale** |
| **Couronnement** | **Accomplissement** |
| **Trophée WENDIO** | **Gagnant ou gagnante Wendio** |
| **carte-trophée** / le trophée | **carte-gagnant·e** |
| « Trophées à imprimer » (lobby, `<title>`) | « Cartes-gagnant·e à imprimer » |
| 🏆 | 🌽 (grain de maïs — déjà le marqueur de case du jeu) |

Le `text-transform: uppercase` de `.trophee-titre` est conservé : le titre imprimé devient
« GAGNANT OU GAGNANTE WENDIO ».

### Ce qui ne change PAS

Les identifiants internes restent tels quels : clés `clan.Chevreuil`, events Socket.io,
noms de clans en base, classes CSS `.trophee-*`, `.win-trophee`, IDs `#win-trophee`, nom de
fichier `imprimer-trophees.html`, clés i18n `trophees.*`. Invisibles pour l'utilisateur ;
les renommer gonflerait le diff pour zéro bénéfice et casserait les liens existants.

### Emplacements

Chaque entrée du tableau ci-dessus doit être appliquée **et dans le HTML en dur, et dans
`i18n.js` (FR + EN)**. Les emplacements précis :

- « imposé » : `i18n.js` (`config.clan`, `meneur.clan_impose_prefix`,
  `joueur.rejoindre.info_clan`, `aide.s4.intro`, `aide.s5.e2.p`), `meneur-config.html`,
  `aide-meneur.html`, `joueur.html`
- « rare » : `aide-meneur.html` + `i18n.js` (`aide.s4.intro`)
- « incrémente » / « rejoindre » : `aide-meneur.html` + `i18n.js` (`aide.s5.e5.p`)
- « sidebar » : `aide-meneur.html` + `i18n.js` (`aide.s7.demo.p1`)
- « Couronnement » : `aide-meneur.html` + `i18n.js` (`aide.s5.intro`, `aide.s5.e8.t`)
- trophée : `i18n.js` (`trophees.titre`, `lobby.trophees.label`, `lobby.trophees.desc`,
  `aide.s5.e8.p`, `aide.s7.avant.l4`, `aide.s7.apres.l1`), `imprimer-trophees.html`
  (`<title>`, `alt`), `lobby.html`, `joueur.html` (`alt`, const `TROPHEE`), `meneur.html`
  (`alt`, const `TROPHEE`), `aide-meneur.html`

Les occurrences dans les commentaires de code et dans `CLAUDE.md` ne sont pas visibles par
l'utilisateur ; les mettre à jour uniquement là où elles décrivent le mapping des clans,
qui devient faux (`CLAUDE.md` § « The 4 Clans » et § validation serveur).

## 3. Images de prix

Andrée propose de remplacer les 4 illustrations actuelles par de vrais objets anciens
wendat, spécifiques à chaque clan. Les images actuelles correspondent exactement à sa
liste (perles de céramique, peau, pointe de flèche, bracelet) ; le bracelet notamment a un
style sud-ouest américain, pas wendat.

### Restructuration

Les fichiers passent d'une indexation par points à une indexation par clan :

```
cartes/clan-1pt.jpg → cartes/clan-loup.jpg
cartes/clan-2pt.jpg → cartes/clan-ours.jpg
cartes/clan-3pt.jpg → cartes/clan-tortue.jpg
cartes/clan-4pt.jpg → cartes/clan-chevreuil.jpg
```

`CLANS` de `data.js` gagne un champ `image`. Les trois sites qui construisaient le chemin
à la main (`imprimer-trophees.html`, `joueur.html`, `meneur.html` — tous en
`'cartes/clan-' + points + 'pt.jpg'`) lisent désormais `CLANS[clan].image`.

Cette restructuration est nécessaire de toute façon : sans elle, changer les points d'un
clan changerait silencieusement son image.

### Contenu provisoire

Le renommage ci-dessus préserve le chiffre dessiné dans chaque image (Loup garde le « 1 »,
Chevreuil le « 4 »). En contrepartie, l'objet illustré ne correspond **volontairement pas**
au clan en attendant les vrais visuels :

| Clan | Pts | Image provisoire | Cible d'Andrée |
|---|---|---|---|
| Chevreuil | 4 | bracelet ⚠️ | pointe de flèche au bout d'un bois de chevreuil ; sac ; hochets à sabots de chevreuil |
| Tortue | 3 | pointe de flèche ⚠️ | hochets en écaille, en corne, en courge ; coiffe wendat |
| Ours | 2 | peau ⚠️ | panier de petits fruits ; graisse d'ours en poterie ; collier de griffes ou dents ; mocassins brodés wendat |
| Loup | 1 | perles de céramique ⚠️ | collier de griffes de loup ; peau de loup ou de castor |

Il est impossible de respecter à la fois le chiffre dessiné et l'objet du clan avec les
images existantes. L'incohérence est assumée et documentée, pas masquée.

### Spec pour les vrais visuels

Un fichier `cartes/README-images-clans.md` documente, pour chaque clan : l'objet attendu
(liste d'Andrée), le chiffre à intégrer, le format et les dimensions des images actuelles.

Ces images ne seront **pas générées par IA** : c'est précisément ce qui a produit le
bracelet pseudo-aztèque. Elles doivent venir d'Andrée, de Sylvain ou d'une source validée
par la Nation.

## Livrable hors code

Un courriel à Sylvain (pour Andrée) qui :

- confirme la prise en compte de chaque recommandation ;
- signale que le mapping clan ↔ condition a changé, donc que le PPTX, les PDF de règles et
  les cartes déjà imprimées sont à revoir ;
- demande les 4 visuels d'objets anciens wendat validés par la Nation ;
- explique pourquoi les images provisoires ne correspondent pas encore aux clans.

## Hors périmètre

- Renommage des identifiants internes, classes CSS, clés i18n, nom de fichier
  `imprimer-trophees.html`.
- Génération de nouvelles illustrations.
- Mise à jour du `Manual/` (gitignored, hors dépôt).
- Toute autre refonte du contenu pédagogique.
