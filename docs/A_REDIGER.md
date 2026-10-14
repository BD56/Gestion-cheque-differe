# Documentation à rédiger (quand l'application sera finie)

Décision de Bryan (13/10/2026) : la documentation complète sera rédigée **à la fin**
(après la refonte graphique et les tests sur un vrai Sheet). En attendant, on note ici
les idées et les points constatés. Seules exceptions tenues à jour dès maintenant :
le bandeau d'avertissement de `DEPLOIEMENT.md`, la carte des fichiers d'`AGENTS.md`,
et les notes « Mise à jour avec clasp » ci-dessous.

## Mise à jour avec clasp (notes brutes, en service)

Prérequis (une seule fois, sur le Mac) :
- Node.js 20 ou plus.
- Activer « API Google Apps Script » : https://script.google.com/home/usersettings
- `git clone -b refonte https://github.com/bd56/gestion-cheque-differe.git cheques-refonte`
  puis `cd cheques-refonte` et `npm install`.
- `npx clasp login` (ouvre le navigateur ; compte Google qui possède le Sheet).
- Relier le dossier au projet Apps Script :
  - **nouveau Sheet de test** : `npx clasp create --type sheets --title "…"` (crée
    le Sheet + le projet et écrit `.clasp.json`) ; si clasp propose de remplacer
    `appsscript.json`, refuser (le nôtre contient les réglages de l'application web) ;
  - **Sheet existant** : copier `.clasp.json.exemple` en `.clasp.json` et y mettre
    l'identifiant du script (éditeur Apps Script → ⚙️ Paramètres du projet → ID).
  - `.clasp.json` reste sur le Mac (jamais sur GitHub).

À chaque mise à jour :
1. `git pull`
2. `npm run nouvelle-version` (même numéro dans tous les fichiers) — seulement si le
   code a changé depuis le dernier numéro ; puis enregistrer ce changement sur GitHub.
3. `npm run push` (vérifie les numéros puis `clasp push` ; répondre **oui** si clasp
   demande d'écraser le manifeste). clasp remplace TOUT le projet : un ancien fichier
   absent du dossier (ex. `Code.gs`) est supprimé d'Apps Script.
4. Dans le Sheet : « 🚀 APPLICATION → 🧰 Installer / vérifier » → le rapport doit finir
   par « Version … » sans « INSTALLATION INCOMPLÈTE ».
5. Mettre à jour le déploiement EXISTANT (même URL) : Déployer → Gérer les
   déploiements → ✏️ → Version : « Nouvelle version » → Déployer. (Piste : `clasp
   redeploy <deploymentId>` le fait en ligne de commande — à essayer.)

Premier déploiement d'un Sheet neuf : Déployer → Nouveau déploiement → Application
Web, « Exécuter en tant que : moi », « Accès : tout le monde ».

## Idées et points à couvrir

### DEPLOIEMENT.md (à réécrire entièrement)
- Voie principale : clasp (ci-dessus). Voie de secours : copier-coller dans l'éditeur.
- Copier-coller : liste EXACTE des fichiers (11 `.gs`, 13 `.html`, `appsscript.json`),
  créer ceux qui manquent avec le bon nom et le bon type, et **supprimer l'ancien
  `Code.gs`** (sinon noms en double → Google refuse de lancer le projet).
- Après mise à jour : « Installer » ; la tablette affiche « Installation incomplète »
  si un fichier manque ou est resté ancien (dire quoi faire).
- Garder la liste à cocher de la migration de Vannes (anciens déploiements, robots,
  `backupQuotidien`, onglet `Logs`, sauvegardes CSV).
- Garder l'URL de production et la règle « mettre à jour, ne jamais créer un nouveau
  déploiement ».

### AGENTS.md
- Réécrire « Fonctions clés » par fichier (aujourd'hui titrée « Code.gs »).
- Conventions : `const`/`let`, boutons `data-action` + liste `ACTIONS`
  (`ScriptActions.html`), pas de `style="…"` sauf `display: none`, constantes
  `COL`/`IDX`, numéro de version, `npm test` / `npm run lint` avant chaque commit.
- Les 3 endroits de la logique A/B/C (Detection.gs, ScriptSaisie.html, recalcul).
- Section « Synchronisation » : clasp + numéro de version.

### INSTALLATION.md
- Créer le modèle avec clasp (ou copier-coller : liste des fichiers).
- Vérifier que le texte « Qui fait quoi », code d'activation, tablettes est toujours juste.

### tests/README.md
- Déjà à jour (npm test, rendrePage, valeurGlobale, test_version). Relire à la fin.

### Pièges constatés sur un vrai Sheet (à mettre dans AGENTS.md et DEPLOIEMENT.md)
- Apps Script **retire les commentaires `<!-- -->`** quand le serveur relit un fichier
  HTML (`getContent`) → la marque de version est un attribut `data-version`.
- `globalThis["version_X_"]` voit bien les fonctions de tous les `.gs`.

### Refonte graphique (faite sur la branche `design`)
- Captures d'écran à refaire pour l'aide et la doc : `outils/captures.js <dossier>`
  (saisie, aide, alertes, journal, espace responsable ; 3 formats).
- Décrire : saisie en 3 étapes, verdict sous le N°, alerte comparative et forçage
  confirmé, journal du jour (replié par défaut, mémorisé par tablette, mis à jour au
  rythme de la copie locale), espace responsable (vue d'ensemble en lecture seule,
  Opération, Sécurité…), « Tournez la tablette », panneau du Sheet.
- Décrire la palette (variables CSS) et les règles : les alertes A/B/C restent très
  visibles (rouge / orange), boutons de 48 px minimum, pas de police externe.
