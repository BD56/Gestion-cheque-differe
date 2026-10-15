# Essai « trousseau » (Safari)

But : savoir si le gestionnaire de mots de passe du navigateur (trousseau de Safari,
Chrome…) peut garder la clé d'un appareil depuis une page Apps Script, alors que Safari
oublie le stockage de la page quand on le quitte (voir `MEMOIRE_CLAUDE.md`, §0 ter).
Version 2 : écran de connexion comme dans l'application, écran vert « Connecté ».

Projet Apps Script **à part**, sans lien avec l'application ni avec le Sheet : aucune
donnée de client, une fausse clé courte (ex. `3f9a-07c2-b1d4`).

## Installer (5 minutes, copier-coller)
1. https://script.google.com → **Nouveau projet** → le nommer « Essai trousseau »
   (ou reprendre le projet déjà créé).
2. Remplacer le contenu de `Code.gs` par celui de [`Code.gs`](Code.gs).
3. **+** → **HTML** → fichier `Page` (ou le fichier existant) → coller
   [`Page.html`](Page.html). Enregistrer.
4. Premier essai : **Déployer** → **Nouveau déploiement** → **Application Web** ;
   Exécuter en tant que : **Moi** ; Qui a accès : **Tout le monde**. Projet déjà
   déployé : **Déployer** → **Gérer les déploiements** → crayon → Version : **Nouvelle
   version** → Déployer (même adresse `/exec`).

## Ce que fait la page (comme l'application le ferait)
- **Connexion** : Identifiant + Mot de passe + gros bouton « Connexion ». Bon mot de
  passe ⇒ écran vert **« Connecté »** (avec « Reconnu par : … »).
- **Première fois ? Créer l'appareil d'essai** : « 1. Créer la clé » puis
  « 2. Enregistrer » ⇒ le navigateur doit proposer d'enregistrer le mot de passe.
  « 2. Enregistrer » fait un VRAI envoi du formulaire (vers un cadre caché, `doPost`) :
  c'est la seule méthode qui marche sous Safari Mac (essai du 15/10 ; l'événement
  d'envoi seul, « l'autre méthode », ne déclenche rien).
- À l'ouverture, si le navigateur a gardé la clé ⇒ « Connecté » tout de suite
  (« la mémoire du navigateur »). Sinon ⇒ écran Connexion.
- **Se déconnecter** vide la mémoire du navigateur (comme Safari quitté).
- La clé de l'essai précédent reste valable : « Essai Mac » déjà enregistré marche.

## Essayer (Safari sur Mac, iPad, puis Chrome)
1. Ouvrir l'adresse `/exec`. Si « Essai Mac » n'est pas encore enregistré : « Première
   fois ? », « 1. Créer la clé », « 2. Enregistrer » → accepter l'enregistrement
   (rien proposé ? « Essayer l'autre méthode »).
2. Quitter le navigateur (**Cmd+Q** ; iPad : fermer l'onglet ou l'app) et rouvrir :
   - Safari / iPad : écran Connexion attendu ; toucher Identifiant → choisir « Essai
     Mac » → Touch ID / Face ID → **Connexion** → écran vert ;
   - Chrome : écran vert directement (« la mémoire du navigateur ») ; puis « Se
     déconnecter » et vérifier que Chrome propose lui aussi « Essai Mac ».

## À rapporter
- Par appareil / navigateur : proposition d'enregistrer (oui / non, méthode) ; après
  fermeture : écran Connexion ou vert direct ; suggestion proposée ; écran vert ✅.
- Le texte « Reconnu par : … » et une capture de la carte du bas (navigateur).
- Nom du site dans l'app **Mots de passe**.

## Après l'essai
Supprimer « Essai Mac » dans **Mots de passe** (et dans Chrome), puis archiver le
déploiement (Déployer → Gérer les déploiements) ou supprimer le projet.
