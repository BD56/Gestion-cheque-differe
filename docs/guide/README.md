# Documentation utilisateurs — Gestion Chèques Différés

Source des pages du futur site de documentation (hébergement à choisir : GitHub Pages
ou Firebase). **Un fichier = un chapitre** ; le numéro au début du nom donne l'ordre
dans le menu de navigation. Le titre `#` de chaque fichier est le nom du chapitre dans
le menu.

| Document | Pour qui | Dossier | État |
|---|---|---|---|
| Guide d'installation | Manager de caisse / direction | [`installation/`](installation/) | rédigé, captures à faire |
| Mode d'emploi | Caisse centrale, responsables | `utilisation/` | à rédiger |
| En cas de problème | Tout le monde | `problemes/` | à rédiger |
| Guide de déploiement technique | Auteur / personne technique | `technique/` | à rédiger (remplacera `DEPLOIEMENT.md`) |

## Conventions d'écriture
- **Une étape = une action.** Les mots des boutons et des menus sont écrits
  **exactement** comme à l'écran, en gras.
- On vouvoie le lecteur ; pas de mot technique sans explication.
- Encadré **« Si ça ne marche pas »** aux étapes où l'on peut se tromper.
- Emplacement d'une capture : ligne `> 📷 **Capture** : …` (remplacée plus tard par
  l'image). Captures des écrans **Google** : faites par Bryan sur le Sheet de test
  (liste : [`CAPTURES_GOOGLE.md`](CAPTURES_GOOGLE.md)). Captures de **l'application** :
  `node outils/captures.js <dossier>`.
- **Aucune donnée réelle** de client sur les captures ; jamais l'adresse d'un Sheet
  réel.
