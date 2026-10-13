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

> Note : `appsscript.json` (le manifeste) change rarement. Ne le touche que s'il a été
> modifié (il faut activer « Afficher le fichier manifeste » dans les paramètres du
> projet pour le voir). **La version « généralisation » le modifie** (accès « Tout le
> monde ») : pour cette migration, le recopier aussi.

## Étape 1 bis — Lancer « Installer » (si le code a changé côté serveur)
Après avoir collé un nouveau `Code.gs` : dans le **Google Sheets**, menu
**🚀 APPLICATION → 🧰 Installer / vérifier l'installation** (ou, dans l'éditeur Apps
Script, fonction **`installer`** → **Exécuter**), et **accepter les autorisations** si
Google en demande.
- C'est **indispensable** quand la nouvelle version utilise un service Google de plus
  (ex. version « généralisation » : code responsable, déclencheurs). Sinon l'application
  web peut afficher une erreur d'autorisation pour tout le monde.
- C'est **sans risque** pour un classeur déjà en service : ça ne crée que ce qui manque
  (feuilles, déclencheurs) et n'écrase aucune donnée ni aucun réglage. Le compte rendu
  dit ce qui a été fait.
- À faire **juste après** le collage : le code collé est actif tout de suite pour le
  robot de nuit et le panneau du Sheet (pas seulement après le redéploiement) ; sans
  les nouvelles autorisations, le robot de la nuit suivante échouerait.
- À savoir : dès la nuit suivante, le robot supprime les archives de **plus de 3 ans**
  et la purge de l'annuaire tourne (voir la liste Vannes ci-dessous).

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
- Ouvrir l'URL sur une **tablette autorisée** : aucun compte Google n'est nécessaire
  (accès « Tout le monde », version « généralisation »). Recharger (le navigateur peut
  garder l'ancienne version en cache).
- Vérifier visuellement le changement attendu.

### Premier déploiement de la version « généralisation » (Vannes)
- Sans réglage, les textes restent ceux de Vannes (valeurs par défaut).
- À l'étape 2 (« Modifier » le déploiement existant), régler **Qui a accès : Tout le
  monde** : les tablettes n'ont plus besoin de compte Google (c'est l'autorisation
  des tablettes qui protège l'accès). L'URL ne change pas.
- **Avant**, à l'étape 1 bis, le compte rendu d'« Installer » affiche un **code
  d'activation** (8 chiffres, valable 24 h ; sinon menu 🚀 APPLICATION → 🔑 Code
  d'activation) : le noter.
- **Tout de suite après**, sur la tablette de caisse : l'écran **« 🔒 Tablette non
  autorisée »** s'affiche → saisir le **code d'activation**, **choisir le code
  responsable (6 chiffres)** et nommer la tablette → AUTORISER. Faire de même (avec le
  code responsable) pour chaque autre tablette. Sans le code d'activation, personne
  ne peut choisir le code responsable.
- Les actions sensibles (mode, dates, clôture, corrections, archives, réglages)
  demandent ce code ; la saisie et l'impression sont libres **sur les tablettes
  autorisées**.
- Règle : le compte Google qui détient le Sheet **ne doit pas être connecté sur les
  tablettes de caisse** (voir `INSTALLATION.md`, « Qui fait quoi »).
- Le panneau du Google Sheets fonctionne comme avant (secours), pour les personnes
  ayant accès au fichier.

### ✅ Liste à cocher — migration de Vannes vers la version « généralisation »
1. **Entre deux offres** (aucune en cours). Fermer l'onglet de l'application sur les
   tablettes avant de commencer, et les rouvrir à la fin.
2. **Recopier les 4 fichiers** (`Code.gs`, `Index.html`, `Panneau.html`,
   `appsscript.json`), enregistrer.
3. **Aussitôt** : menu 🚀 APPLICATION → 🧰 Installer → accepter les autorisations.
   **Noter le code d'activation** affiché.
4. **Un seul déploiement** : *Déployer → Gérer les déploiements* → **archiver tout
   déploiement autre que celui de l'URL des tablettes**. Un ancien déploiement continue
   de faire tourner l'ancien code (sans code responsable ni contrôle des tablettes).
5. Modifier le déploiement des tablettes : **Nouvelle version** + **Qui a accès : Tout
   le monde** → Déployer (même URL).
6. Sur la tablette : saisir le code d'activation, choisir le code responsable (6
   chiffres), nommer la tablette → AUTORISER. Puis chaque autre tablette.
7. **Déclencheurs** (Apps Script → ⏰ Déclencheurs) : `verificationClotureNocturne` et
   `purgerAnnuaire`, **une seule fois chacun**, au nom du compte qui détient le Sheet.
   Supprimer les doublons et tout ancien déclencheur (`backupQuotidien`…).
8. **Données personnelles laissées par d'anciennes versions (RGPD)** : vérifier et
   supprimer si elles existent — l'onglet **`Logs`** du Sheet, un **Google Sheets de
   sauvegarde** et des fichiers **`Backup_Saisies_*.csv`** dans le Drive. La purge
   automatique ne les touche pas.
9. **Noms des onglets d'archives** : seuls ceux au format `Archives_jj-mm-aaaa_hh-mm`
   sont supprimés automatiquement après 3 ans ; les autres sont à gérer à la main.
10. **Compte Google du Sheet** : déconnecté de toutes les tablettes de caisse.
11. Ouvrir l'espace responsable : pas d'alerte « robot de nuit » ; vérifier le mode
    (SIGNALER / BLOQUANT), désormais conservé d'une offre à l'autre.
12. À savoir : la colonne F s'imprime avec le libellé des réglages (« Notes ou Infos »
    par défaut, au lieu de « CODE ») — à changer dans 🏷️ Réglages si besoin.

## Étape 3 bis — Mettre à jour le MODÈLE (si des structures copient le modèle)
Pour que les **prochaines** structures aient la nouvelle version, reporter aussi le
code dans le **classeur modèle** (voir [`INSTALLATION.md`](INSTALLATION.md)) :
1. Ouvrir le modèle → *Extensions → Apps Script* → recoller les fichiers modifiés
   (comme à l'étape 1) → enregistrer.
2. Dans le modèle : menu **🚀 APPLICATION → 🧰 Installer** (autorisations).
3. **Ne pas déployer** le modèle, ne rien y saisir. Le lien `/copy` reste le même.

Les structures **déjà installées** ne sont pas mises à jour automatiquement : pour
chacune, refaire les étapes 1 à 3 dans **sa** copie (sur **son** déploiement).

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
