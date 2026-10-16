# Essai « mise à jour en un clic »

> **Résultat (16/10/2026) : ÉCHEC pour un usage par les magasins.** Même avec le
> réglage « API Google Apps Script » activé, Google répond 403 « Apps Script API has
> not been used in project … » : l'API doit aussi être activée dans le projet Google
> Cloud du script ; le projet créé par défaut est caché et inaccessible (« Vous avez
> besoin d'une autorisation d'accès supplémentaire »). Il faudrait un projet Google
> Cloud standard par magasin : trop technique. Essai gardé pour mémoire.

But : savoir si une copie du modèle (un magasin) peut **se mettre à jour toute seule**,
en un clic depuis le menu du Sheet : remplacer son code par celui du modèle, créer une
version, mettre à jour son déploiement **sans changer l'adresse `/exec`**, et **revenir
en arrière**. Avec l'« API Apps Script » de Google. Alternative à la bibliothèque Apps
Script, déconseillée (voir `MEMOIRE_CLAUDE.md`, § 4).

Deux Google Sheets d'essai, **sans lien avec l'application** ni données de clients :
- **SOURCE** joue le **MODÈLE** (là où vous publiez les versions) ;
- **MAGASIN** est une **copie** de SOURCE (comme un magasin copie le modèle).

## Installer (10 minutes, copier-coller)
1. **Activer l'API** (une fois par compte Google) :
   https://script.google.com/home/usersettings → « API Google Apps Script » :
   **Activé**.
2. Créer un Google Sheet vide « Essai MAJ — SOURCE » → *Extensions → Apps Script*.
   - ⚙️ **Paramètres du projet** → cocher « Afficher le fichier manifeste
     "appsscript.json" dans l'éditeur ».
   - `appsscript.json` ← coller [`appsscript.json`](appsscript.json).
   - `Code.gs` ← coller [`Code.gs`](Code.gs).
   - **+** → **HTML** → `Page` ← coller [`Page.html`](Page.html).
   - ⚙️ Paramètres du projet → copier l'**ID du script** → dans `Code.gs`, le mettre
     à la place de `COLLER_ICI_L_ID_DU_PROJET_SOURCE`. **Enregistrer**.
3. Recharger le Sheet SOURCE : menu **🧪 Essai MAJ** → « ℹ️ Je suis la SOURCE
   (version 1) » (accepter les autorisations la 1re fois).
4. Dans SOURCE : *Fichier → Créer une copie* → « Essai MAJ — MAGASIN ».
5. Dans MAGASIN : *Extensions → Apps Script → Déployer → Nouveau déploiement →
   Application Web* ; Exécuter en tant que : **Moi** ; Qui a accès : **Tout le
   monde** → **Déployer** → accepter les autorisations → **noter l'adresse `/exec`**.
6. Ouvrir l'adresse `/exec` : grand **1**, « Les deux fichiers sont de la même
   version ✅ », compteur d'ouvertures.

## Essayer
1. **Publier la version 2** dans SOURCE : `Code.gs` → `const VERSION = "2";` ET
   `Page.html` → `data-version="2"` (les deux !) → Enregistrer.
2. Dans MAGASIN (recharger le Sheet) : menu **🧪 Essai MAJ → 🔄 Vérifier / mettre à
   jour**.
   - la 1re fois, Google demande les autorisations : **noter le texte exact** de
     l'écran (« voir et modifier vos projets Apps Script… ») ;
   - « Version 2 disponible (vous avez la 1) » → **Oui** → compte rendu (durée,
     étapes, « Adresse /exec inchangée ✅ »).
3. Recharger la page `/exec` (même adresse) : grand **2**, deux fichiers ✅, le
   compteur **continue** (ne repart pas à 1).
4. Attendre 2 minutes → menu **📋 Résultat de l'essai** : « Code lancé seul après la
   mise à jour : version 2 » (preuve que le nouveau code peut s'installer seul, comme
   « Installer » après une mise à jour).
5. **Retour arrière** : menu **↩️ Revenir à la version précédente** → Oui → la page
   `/exec` affiche de nouveau **1**.
6. **Garde-fou** : dans SOURCE, mettre `VERSION = "3"` mais laisser
   `data-version="2"` → dans MAGASIN, « Vérifier » doit **refuser** (« Source
   incohérente… Rien n'a été changé »). Remettre ensuite les deux à 3 et refaire 2-3.
7. *(Si possible)* **Un autre compte Google** (comme un vrai magasin) : partager le
   Sheet SOURCE avec lui en **Lecteur** ; avec ce compte, faire une copie de SOURCE,
   activer l'API (étape 1 d'« Installer »), déployer, puis « Vérifier / mettre à
   jour ». Question : un simple **lecteur** du modèle peut-il en lire le code ?

## À rapporter
- Chaque étape : ✅ / ❌ et le **message exact** en cas d'erreur (capture).
- Le **texte de l'écran d'autorisation** (étape 2) et s'il fait peur.
- Durées affichées (mise à jour, retour arrière).
- L'adresse `/exec` est-elle restée la même partout ? Le compteur a-t-il continué ?
- Étape 7 : la lecture du code par un lecteur marche-t-elle ?

## Ce que l'essai ne montre pas encore (pour l'application réelle)
- L'application devra déclarer **toutes** ses autorisations dans `appsscript.json`
  (aujourd'hui Google les devine) : à lister et vérifier.
- Réservé au panneau du Sheet (manager), jamais depuis les tablettes ; refus pendant
  une offre en cours, ou confirmation renforcée ; notes de version affichées.
- Publication côté modèle : une version « publiée » distincte du code en cours de
  modification (ex. lire une **version numérotée** du modèle plutôt que son code
  courant).

## Après l'essai
Supprimer les deux Sheets d'essai (le code et les déploiements partent avec eux).
L'API Apps Script peut rester activée (elle sert aussi à clasp) ou être désactivée au
même endroit.
