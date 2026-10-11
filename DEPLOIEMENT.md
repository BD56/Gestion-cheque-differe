# Déploiement (sans Mac / sans clasp) — copier-coller + même URL

Quand les modifications sont sur **GitHub** (faites par Vibe ou autrement) et qu'il
faut les mettre **en production** sans le Mac, voici la procédure **manuelle** qui
conserve **la même URL** que les tablettes utilisent déjà.

> ⚠️ Objectif clé : **mettre à jour le déploiement EXISTANT** (→ même URL), surtout
> **ne pas créer un nouveau déploiement** (qui donnerait une autre URL).

## URL de production actuelle
```
https://script.google.com/macros/s/AKfycbwTcTh1PN5hwFyBZoM1Y4qE71FSiWeJAbm_uhJBqzZVdm-HEYfNYAWBPLUpCzOWvQP3sg/exec
```
C'est **ce déploiement-là** qu'on met à jour (jamais un nouveau).

## Étape 1 — Reporter le code de GitHub vers l'éditeur Apps Script
1. Ouvrir le projet Apps Script (script.google.com → le projet de l'app).
2. Sur GitHub, repérer **quels fichiers Vibe a modifiés** (visible dans le dernier
   commit / la Pull Request). **Ne recopier que ceux-là.**
3. Pour **chaque fichier modifié** (`Code.gs`, `Index.html`, `Panneau.html`) :
   - ouvrir le fichier correspondant dans l'éditeur Apps Script,
   - **tout sélectionner** (Cmd/Ctrl+A) puis **coller** le contenu **intégral** copié
     depuis GitHub (remplacement complet, pas un ajout),
   - **enregistrer** (Cmd/Ctrl+S).
4. Astuce : copier le **« raw »** sur GitHub (bouton *Raw*) pour récupérer le texte
   brut sans mise en forme.

> Note : `appsscript.json` (le manifeste) change rarement. Ne le touche que si Vibe
> l'a explicitement modifié (il faut activer « Afficher le fichier manifeste » dans les
> paramètres du projet pour le voir).

## Étape 1 bis — Lancer `installer` (si le code a changé côté serveur)
Après avoir collé un nouveau `Code.gs`, dans l'éditeur Apps Script : choisir la
fonction **`installer`** → **Exécuter**, et **accepter les autorisations** si Google
en demande.
- C'est **indispensable** quand la nouvelle version utilise un service Google de plus
  (ex. version « généralisation » : code responsable, déclencheurs). Sinon l'application
  web peut afficher une erreur d'autorisation pour tout le monde.
- C'est **sans risque** : `installer` ne crée que ce qui manque (feuilles,
  déclencheurs) et n'écrase rien. Le journal dit ce qui a été fait.

## Étape 2 — Redéployer sur la MÊME URL
1. En haut à droite : **Déployer → Gérer les déploiements**.
2. Dans la liste, **repérer le déploiement dont l'URL correspond à celle ci-dessus**
   (l'URL des tablettes). Cliquer sur l'icône **✏️ (Modifier)**.
3. Dans le champ **Version**, choisir **« Nouvelle version »**.
4. (Conseillé) mettre une **description** courte (ex. « MAJ saisie — <date> »).
5. Cliquer **Déployer**.
6. ✅ L'URL **reste identique** : les tablettes voient la nouvelle version sans rien
   changer de leur côté.

## Étape 3 — Vérifier
- Ouvrir l'URL sur un appareil **connecté au compte Google** (l'accès demande une
  connexion). Recharger (le navigateur peut garder l'ancienne version en cache).
- Vérifier visuellement le changement attendu.

### Premier déploiement de la version « généralisation » (Vannes)
- Sans réglage, les textes restent ceux de Vannes (valeurs par défaut).
- **Tout de suite après** : ⚙️ → **Espace responsable** → **créer le code
  responsable**. Tant qu'il n'est pas créé, la première personne qui ouvre l'espace
  responsable le choisit.
- Les actions sensibles (mode, dates, clôture, corrections, archives, réglages)
  demandent désormais ce code ; la saisie et l'impression restent libres.
- Le panneau du Google Sheets fonctionne comme avant (secours), pour les personnes
  ayant accès au fichier.

## Étape 4 — Réconcilier plus tard (de retour sur le Mac)
Le copier-coller fait diverger les copies. Quand le Mac est disponible :
1. `git pull` (récupérer les commits de Vibe en local).
2. `clasp pull` **ou** `clasp push` selon le sens à aligner — l'idée : remettre
   **local = GitHub = Apps Script** identiques.
3. En cas de doute sur qui fait foi : **GitHub** (ce que Vibe a produit) est la
   référence du code source.

## En cas de problème
- Un déploiement qui « ne change rien » côté tablette = souvent **cache navigateur**
  (recharger) **ou** mauvais déploiement modifié (vérifier que l'URL correspond).
- Pour revenir en arrière : refaire l'**Étape 2** en choisissant une **version
  antérieure** dans le champ Version.
