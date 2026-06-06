# Gestion Chèques Différés

Application web **Google Apps Script** de gestion anti-fraude pour une offre de
chèques différés à l'**Hypermarché Carrefour Vannes** (© 2026 DESJARDINS Bryan).
Elle s'adosse à un Google Sheets et sert d'interface de saisie sur tablette aux
hôtesses de caisse. But central : **détecter doublons et usurpations** quand un
client tente de profiter deux fois de l'offre.

## Architecture des fichiers

- **Code.gs** — logique serveur (backend Apps Script).
- **Index.html** — la web app servie par `doGet`, utilisée sur tablette en caisse.
- **Panneau.html** — sidebar « admin » affichée dans le Google Sheets (menu
  `🚀 APPLICATION`), version PC du panneau de contrôle.
- **appsscript.json** — manifeste : runtime V8, fuseau `Europe/Paris`, webapp
  déployée en `executeAs: USER_DEPLOYING`, `access: ANYONE`.

## Structure du Google Sheets (feuilles attendues)

- **Saisies** — données de l'offre en cours. Colonnes : A=Date, B=Nom, C=Prénom,
  D=N° Pièce, E=Montant, F=Notes, G=(réservé). La cellule **Z1** stocke le mode de
  sécurité (`SIGNALER` ou `BLOQUANT`).
- **A_IMPRIMER** / **OFFRE_COMPLETE** — feuilles de mise en forme pour impression
  (Z1 y sert de paramètre de date).
- **Archives_<date>** — créées à chaque clôture d'offre.

## Logique métier centrale : la détection de doublons

À chaque saisie, on parcourt tout l'historique « Saisies » et on classe les
correspondances (comparaison normalisée : majuscules, sans espaces ni tirets) :

- **Cas A** = même Nom+Prénom **ET** même pièce → vrai doublon / fraude.
- **Cas B** = pièce identique sous un **autre nom** → usurpation.
- **Cas C** = même nom mais pièce différente → simple homonyme.

Deux modes de sécurité (cellule `Z1`) :

- **SIGNALER** (souple) : alerte mais laisse « Forcer l'ajout » (enregistré en rouge).
- **BLOQUANT** (strict) : refuse les cas A et B ; le cas C reste autorisé.

Cette même détection s'applique **aussi** à l'édition manuelle directe dans le
Sheets via `onEdit` (+ horodatage auto et mise en majuscules des colonnes B–D).

## Fonctions clés (Code.gs)

- `traiterSaisie` / `forcerSaisie` — saisie depuis la web app (protégées par
  `LockService` pour l'atomicité).
- `onEdit` — détection + formatage sur édition manuelle du tableur.
- `getDatesOperation` / `setDatesOperation` — dates d'offre dans `PropertiesService`
  (DocumentProperties).
- `verificationClotureNocturne` — robot de nuit : archive et verrouille
  automatiquement quand la date de fin est dépassée.
- `archiverOffreWebApp` — clôture : copie « Saisies » dans `Archives_<date>`, vide
  « Saisies », repasse en mode SIGNALER, efface les dates.

## Triggers à configurer dans le projet Apps Script

- `verificationClotureNocturne` — doit être branché sur un trigger temporel (nuit).
- `onEdit` / `onOpen` — triggers simples, automatiques.

## prototype-ocr/ — banc d'essai OCR MRZ (hors app)

Prototype **isolé** pour lire la bande MRZ des pièces d'identité françaises
(passeport TD3, nouvelle CNI / titre de séjour TD1, ancienne CNI au format français
non-ICAO). 100 % navigateur (RGPD) : capture caméra OU import photo → OCR
**Tesseract.js** → parsing/validation via la librairie **`mrz`** (check digits) →
mapping Nom / Prénom / N° pièce. Exclu du `clasp push` via `.claspignore` ;
versionné dans Git uniquement. But : valider la fiabilité OCR avant intégration
dans `Index.html`. Pistes d'amélioration : traineddata MRZ/OCR-B, recadrage auto
via `mrz-detection`.

## Synchronisation (3 emplacements)

Le projet vit à 3 endroits **maintenus identiques** :

1. Dossier local (relié à git + clasp).
2. GitHub privé : `BD56/Gestion-cheque-differe` (branche `main`).
3. Projet Apps Script en ligne (scriptId dans `.clasp.json`, non versionné).

Workflow : modifier en local → `clasp push` (vers Apps Script) + `git push` (vers
GitHub). Si modifié en ligne, faire `clasp pull` avant de retravailler en local.
`.clasp.json` est volontairement ignoré par git (config locale).

## Sécurité des données

Pas de système de backup applicatif : on s'appuie sur l'**historique des versions
natif de Google Sheets** (Fichier → Historique des versions) pour restaurer toute
suppression/modif accidentelle, et sur les feuilles `Archives_<date>` pour les
offres clôturées.

## Historique des choix (ne pas réintroduire sans raison nouvelle)

- **Logs d'audit** (feuille « Logs » + `ajouterLog`) — retiré : redondant avec
  « Saisies », déjà horodaté et marquant les ajouts forcés.
- **Backup automatique** (`backupQuotidien`, `creerTriggerBackup`, `backupManuel`,
  CSV Drive + 2ᵉ Sheet) — retiré : redondant avec l'historique des versions natif ;
  reposait sur des IDs en dur et un trigger à maintenir, et ne protégeait pas
  réellement contre la perte totale du classeur (backups dans le même compte).
- **Scan OCR MRZ dans l'app** (bouton 📷 + lecture MRZ dans `Index.html`) —
  intégré mais **DORMANT** par décision de la direction. Piloté par le drapeau
  `const OCR_ACTIF = false;` (dans le `<script type="module">` en bas d'`Index.html`).
  Quand `false` : bouton masqué, aucun écouteur, librairies (Tesseract + mrz)
  **non chargées**, section d'aide « Scanner une pièce » et paragraphe légal OCR
  masqués. Passer le drapeau à `true` réactive tout (libs chargées à la demande au
  1er scan). Le banc d'essai reste dans `prototype-ocr/`.
