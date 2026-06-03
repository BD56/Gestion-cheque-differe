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
- `backupQuotidien` — trigger quotidien (20h) : CSV dans Drive + copie dans un 2ᵉ
  Google Sheet (redondance). Voir « points d'attention » plus bas.
- `getDatesOperation` / `setDatesOperation` — dates d'offre dans `PropertiesService`
  (DocumentProperties).
- `verificationClotureNocturne` — robot de nuit : archive et verrouille
  automatiquement quand la date de fin est dépassée.
- `archiverOffreWebApp` — clôture : copie « Saisies » dans `Archives_<date>`, vide
  « Saisies », repasse en mode SIGNALER, efface les dates.

## Triggers à configurer dans le projet Apps Script

- `creerTriggerBackup()` — à exécuter une fois pour planifier `backupQuotidien` à 20h.
- `verificationClotureNocturne` — doit être branché sur un trigger temporel (nuit).
- `onEdit` / `onOpen` — triggers simples, automatiques.

## Synchronisation (3 emplacements)

Le projet vit à 3 endroits **maintenus identiques** :

1. Dossier local (relié à git + clasp).
2. GitHub privé : `BD56/Gestion-cheque-differe` (branche `main`).
3. Projet Apps Script en ligne (scriptId dans `.clasp.json`, non versionné).

Workflow : modifier en local → `clasp push` (vers Apps Script) + `git push` (vers
GitHub). Si modifié en ligne, faire `clasp pull` avant de retravailler en local.
`.clasp.json` est volontairement ignoré par git (config locale).

## Points d'attention connus

- **IDs en dur** dans `backupQuotidien` (dossier Drive + Sheet de backup) :
  fragiles si ces ressources changent. Candidats à externaliser dans les
  Propriétés du script.
- **Backup CSV** via `row.join(",")` : pas d'échappement, donc une note contenant
  une virgule ou un retour à la ligne décale le CSV.

> Note : un système de logs d'audit (feuille « Logs » + `ajouterLog`) a existé puis
> a été retiré — redondant avec « Saisies » qui est déjà horodaté et marque les
> ajouts forcés. Ne pas le réintroduire sans raison nouvelle.
