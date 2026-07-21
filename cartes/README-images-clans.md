# Cartes-gagnant·e — images par clan

Une image par clan, affichée dans l'overlay de victoire (meneur + joueur) et
imprimée par `imprimer-trophees.html`. Le chemin est déclaré dans `data.js`
(`CLANS[<clan>].image`).

## Contrainte

**Le chiffre du nombre de points est dessiné dans l'illustration elle-même.**
Une image destinée au Chevreuil doit donc porter un « 4 », celle du Loup un « 1 ».

| Fichier | Clan | Points | Chiffre à intégrer |
|---|---|---|---|
| `clan-chevreuil.jpg` | Chevreuil 🦌 | 4 | 4 |
| `clan-tortue.jpg` | Tortue 🐢 | 3 | 3 |
| `clan-ours.jpg` | Ours 🐻 | 2 | 2 |
| `clan-loup.jpg` | Loup 🐺 | 1 | 1 |

Format actuel : JPEG portrait, ~830×1200 px, fond blanc/dégradé clair, coins
arrondis, objet en haut et chiffre en bas.

## État : images provisoires

Les 4 fichiers actuels sont **hérités de l'ancienne indexation par points** et
l'objet représenté ne correspond **pas** au clan. C'est assumé : on ne peut pas
à la fois respecter le chiffre dessiné et l'objet du clan avec les images
existantes.

| Fichier | Objet actuel | Objet demandé par Andrée |
|---|---|---|
| `clan-chevreuil.jpg` | bracelet ⚠️ | pointe de flèche au bout d'un bois de chevreuil ; sac ; hochets à sabots de chevreuil |
| `clan-tortue.jpg` | pointe de flèche ⚠️ | hochets en écaille, en corne, en courge ; coiffe wendat |
| `clan-ours.jpg` | peau ⚠️ | panier de petits fruits ; graisse d'ours en poterie ; collier de griffes ou de dents ; mocassins brodés wendat |
| `clan-loup.jpg` | perles de céramique ⚠️ | collier de griffes de loup ; peau de loup ou de castor |

## Comment remplacer

Ces images ne doivent **pas** être générées par IA : c'est ce qui a produit le
bracelet de style sud-ouest américain actuellement affiché pour le Chevreuil.
Elles doivent venir d'Andrée, de Sylvain ou d'une source validée par la Nation
(objets de collection, musée huron-wendat, illustration commandée).

Déposer le nouveau fichier sous le même nom, au même format. Aucun code à
modifier.
