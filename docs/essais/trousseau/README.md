# Essai « trousseau » (Safari)

But : savoir si Safari peut garder la clé d'un appareil dans son gestionnaire de mots de
passe (« Mots de passe » / trousseau iCloud) depuis une page Apps Script, alors qu'il
oublie le stockage de la page quand on le quitte (voir `MEMOIRE_CLAUDE.md`, §0 ter).

Projet Apps Script **à part**, sans lien avec l'application ni avec le Sheet : aucune
donnée de client, une fausse clé courte (ex. `3f9a-07c2-b1d4`).

## Installer (5 minutes, copier-coller)
1. https://script.google.com → **Nouveau projet** → le nommer « Essai trousseau ».
2. Remplacer le contenu de `Code.gs` par celui de [`Code.gs`](Code.gs).
3. **+** → **HTML** → nommer le fichier `Page` → coller [`Page.html`](Page.html). Enregistrer.
4. **Déployer** → **Nouveau déploiement** → type **Application Web** ; Exécuter en tant
   que : **Moi** ; Qui a accès : **Tout le monde** → Déployer → autoriser → copier
   l'adresse `/exec`.

## Essayer (Safari sur Mac, puis iPad si le Mac réussit)
1. Ouvrir l'adresse `/exec` dans Safari.
2. « 1. Créer une clé » puis « 2. Enregistrer (méthode 1) » → Safari propose-t-il
   d'enregistrer le mot de passe ? Si oui, accepter.
3. Sinon « Enregistrer (méthode 2) ». Sinon encore : effacer le champ Clé, retaper à la
   main la clé affichée, puis méthode 1.
4. Quitter Safari (**Cmd+Q**), rouvrir l'adresse : la ligne « Mémoire du navigateur »
   doit dire « vide » (sinon l'essai ne prouve rien).
5. Toucher le champ Nom ou Clé → Safari propose-t-il « Essai Mac » ? Le choisir, puis
   « Vérifier la clé » → ✅ attendu.
6. App **Mots de passe** (ou Safari › Réglages › Mots de passe) : sous quel site la clé
   est-elle rangée (`script.google.com` ? `…googleusercontent.com` ?).

## À rapporter
- Proposition d'enregistrer : oui / non, avec quelle méthode (1, 2, frappe à la main).
- Après Cmd+Q : « Mémoire du navigateur » vide ? suggestion proposée ? « Vérifier » ✅ ?
- Nom du site dans « Mots de passe ».
- Une capture de la carte « Cet appareil » (adresse technique, navigateur).

## Après l'essai
Supprimer « Essai Mac » dans **Mots de passe**, puis archiver le déploiement (Déployer →
Gérer les déploiements) ou supprimer le projet.
