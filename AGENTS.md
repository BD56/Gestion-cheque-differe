# AGENTS.md — Gestion Chèques Différés

> **Doc canonique pour tout assistant IA travaillant sur ce projet** (Mistral Vibe,
> Claude, etc.). Lis-le en entier avant d'agir.

## ⚠️ À lire d'abord : comment travailler avec Bryan
Le **style de travail attendu** (langue, posture, « ne code pas avant validation »,
honnêteté/contradiction, vérifier au lieu de supposer, prudence prod) est décrit dans
le dépôt **`guide-assistant`** (attaché au projet Vibe). **Applique-le.** En résumé :
**proposer / expliquer / vérifier / attendre le feu vert** ; être un interlocuteur
**critique et honnête**, pas un exécutant complaisant.

---

## Le projet en bref
Application web **Google Apps Script** de gestion **anti-fraude** pour une offre de
**chèques différés** à l'**Hypermarché Carrefour Vannes** (© 2026 DESJARDINS Bryan).
Interface de saisie sur **tablette** en caisse, adossée à un Google Sheets. But
central : **détecter doublons et usurpations** quand un client tente de profiter deux
fois de l'offre. Outil **interne, non commercial** (aide aux collègues responsables de
caisse).

**Généralisé (oct. 2026, branche `generalisation`)** : installable par d'autres
structures / pour d'autres offres (réglages dans l'appli, valeurs par défaut = Vannes).
Principe : **tout passe par l'application** ; le Google Sheets n'est qu'un stockage
(+ panneau de secours). Voir la section « Généralisation » plus bas.

## Fichiers
- **Code.gs** — backend Apps Script (logique serveur).
- **Index.html** — la web app servie par `doGet` (tablette caisse).
- **Panneau.html** — sidebar admin dans le Sheets (menu `🚀 APPLICATION`).
- **appsscript.json** — manifeste (V8, `Europe/Paris`, webapp `access: ANYONE`).
- **INSTALLATION.md** — installer l'appli pour une nouvelle structure.
- **prototype-ocr/** — banc d'essai OCR isolé (hors app, voir plus bas).

## Structure du Google Sheets
- **Saisies** — offre en cours. Colonnes : A=Date, B=Nom, C=Prénom, D=N° Pièce,
  E=Montant, F=Notes, G=(réservé). **Z1** = mode de sécurité (`SIGNALER`/`BLOQUANT`).
- **A_IMPRIMER** / **OFFRE_COMPLETE** — onglets d'impression (formules `FILTER` /
  `ARRAYFORMULA` sur « Saisies »). **Plus utilisés par l'appli** (impression calculée
  par `genererDonneesImpression`) ; conservés pour les boutons du panneau du Sheet.
  Une nouvelle structure n'en a pas besoin.
- **_Annuaire** — feuille cachée de l'annuaire inter-offres (Niveau 3).
- Restes sans effet chez Vannes : onglet **Logs**, cellule **Y1** (non lus par le code).
- **Archives_<date>** — créées à chaque clôture d'offre.

## Logique métier centrale (la détection de doublons)
À chaque saisie, on parcourt « Saisies » (comparaison normalisée : majuscules, sans
espaces ni tirets) :
- **Cas A** = même Nom+Prénom **ET** même pièce → vrai doublon / fraude.
- **Cas B** = pièce identique sous un **autre nom** → usurpation.
- **Cas C** = même nom, pièce différente → homonyme.

Deux modes (cellule `Z1`) :
- **SIGNALER** (souple) : alerte mais « Forcer l'ajout » possible (enregistré en rouge).
- **BLOQUANT** (strict) : refuse A et B ; C reste autorisé.

Même détection via `onEdit` (édition manuelle directe dans le Sheets).

> **Principe non négociable :** la feuille **« Saisies » est l'unique source de
> vérité** pour la décision anti-fraude. Le **faux négatif** (doublon non détecté) est
> le pire échec : aucune optimisation ne doit pouvoir en provoquer. Tout cache/index
> est **non autoritaire**.

## Fonctions clés (Code.gs)
- `traiterSaisie` / `forcerSaisie` — saisie depuis la web app (protégées par
  `LockService`).
- `modifierSaisie` / `supprimerSaisie` / `listerSaisies` — corrections depuis l'appli
  (espace responsable) ; `modifierSaisie` **recontrôle A/B/C** comme `onEdit`.
- `getConfig` / `setConfig` — réglages de la structure (`CFG_*` en `PropertiesService`).
- `ouvrirSessionAdmin` / `definirPin` / `exigerAdmin_` — code responsable + jeton.
- `genererDonneesImpression` / `listerArchives` / `donneesArchive` — impression.
- `installer` — installation idempotente (feuilles + déclencheurs), à lancer depuis
  l'éditeur.
- `onEdit` — détection + formatage sur édition manuelle.
- `getDatesOperation` / `setDatesOperation` — dates d'offre dans `PropertiesService`.
- `verificationClotureNocturne` — robot de nuit : archive quand la date de fin passe.
- `archiverOffreWebApp` (protégée) → `archiverOffre_` (sous verrou) — clôture : copie
  « Saisies » → `Archives_<date>`, vide, repasse en SIGNALER, efface les dates.

## Triggers Apps Script
- `verificationClotureNocturne` — trigger temporel (nuit).
- `purgerAnnuaire` — trigger temporel (nuit). Les deux sont créés par `installer()`.
- `onEdit` / `onOpen` — triggers simples automatiques.

## Synchronisation (IMPORTANT pour Vibe)
Le projet vit à **3 endroits** : (1) GitHub `BD56/Gestion-cheque-differe`, (2) projet
Apps Script en ligne, (3) éventuellement le dossier local sur le Mac (clasp).
- **Vibe modifie GitHub uniquement.** Un commit GitHub **n'atteint PAS** l'app en
  service tout seul.
- La mise en production se fait **manuellement par Bryan** (copier-coller vers
  l'éditeur Apps Script + redéploiement). **Voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).**
- Donc : fais des **commits propres et bien décrits** ; n'invente pas d'étape de
  déploiement ; rappelle à Bryan que le déploiement reste à faire.

## État actuel (juin 2026)
- **OCR (scan MRZ) = DORMANT.** Intégré dans `Index.html` mais **désactivé par décision
  de la direction**, via un drapeau unique `const OCR_ACTIF = false;` (dans le
  `<script type="module">` en bas d'`Index.html`). Quand `false` : bouton 📷 masqué,
  aucun écouteur, **librairies non chargées**, section d'aide « Scanner » et paragraphe
  légal OCR masqués. Passer à `true` réactive tout. **Ne pas réactiver sans accord.**
- Le banc d'essai OCR reste dans `prototype-ocr/` (exclu du déploiement).

## Volume (contexte pour juger les « optimisations »)
~**72 saisies par offre**, ~**15–18 offres/an**. À cette échelle, **la performance
n'est pas un problème** : la latence ressentie vient de l'**infrastructure** (aller-
retour réseau + runtime Apps Script + appels Sheets), pas de la taille des données ni
de l'algorithme. **Inutile d'« optimiser la recherche » côté données/algo.**

## Aides à la saisie (Niveaux 1/2/3 — IMPLÉMENTÉS)
- **Niveau 1 — ergonomie** *(fait)* : `Entrée` → champ suivant (Pièce→Nom→Prénom→Montant,
  Notes exclu), **N° de Pièce en 1er champ**. (MAJUSCULES client + clavier numérique :
  abandonnés — déjà géré serveur / compat tablette.)
- **Niveau 2 — alerte temps réel** *(fait)* : au `blur` du N°, `verifierPiece` (lecture
  seule) → modale si la pièce est **déjà sur l'offre en cours**. Non autoritaire.
- **Niveau 3 — annuaire inter-offres** *(fait, ACTIF)* : feuille cachée **`_Annuaire`**
  (pièce → Nom/Prénom + dernière vue), **reconstructible** via `reconstruireAnnuaire()`,
  **purge glissante 3 ans** (`purgerAnnuaire`, à mettre sur trigger). Auto-complétion au
  `blur` si la pièce est connue d'une **offre passée** : option **C** (pré-remplissage
  doux, défaut) ou **B** (modale-question), réglable dans le Panneau (`MODE_ANNUAIRE` en
  `PropertiesService`). **Store NON autoritaire** (la décision A/B/C reste sur
  « Saisies »). Kill-switch : `ANNUAIRE_ACTIF` (Code.gs). Mention légale ajoutée.
  → **Après activation : lancer `reconstruireAnnuaire()` une fois.**

## Généralisation (oct. 2026) — IMPLÉMENTÉE sur la branche `generalisation`
Décision : `docs/retours-vibe/decisions/2026-10-11_generalisation.md`.
- **Réglages** (`CONFIG_DEFAUTS` = Vannes) : nom de la structure (avec article), nom
  de l'offre, titre de l'onglet, libellé + caractère obligatoire du montant, libellé +
  précision des notes. Devise **euro** et conservation annuaire **3 ans** : fixes.
  `doGet` passe en **template** (`<?= cfg.X ?>`, échappé) pour les injecter.
- **Espace responsable** (⚙️) : code PIN 4-8 chiffres (SHA-256 + sel, jamais en clair),
  jeton de session `CacheService` (10 min d'inactivité), 5 échecs → blocage 15 min.
  Protège : réglages, mode, mode annuaire, dates, clôture, archives, corrections.
  **Saisie et impression restent libres.** Toute fonction serveur sensible appelle
  `exigerAdmin_(jeton)` en premier.
- **Panneau du Sheet** (secours, inchangé) : passe sans code **pour les éditeurs du
  classeur** (`estEditeurDuClasseur_`) ; bouton de réinitialisation du code.
- **Impression** calculée depuis « Saisies » ; **archives** consultables/imprimables.
- **Corrections / suppressions** dans l'appli, avec garde-fou « la ligne contient
  encore ce que l'écran affichait ».
- **Dette assumée** : la logique A/B/C existe désormais à **4 endroits**
  (`traiterSaisie`, `analyserDoublonLocal` côté client, `onEdit`, `modifierSaisie`).
  À garder synchro si la détection change.

## Historique des choix (ne pas réintroduire sans raison nouvelle)
- **Logs d'audit** — retirés (redondants avec « Saisies » déjà horodaté).
- **Backup applicatif** — retiré (redondant avec l'historique de versions natif ;
  reposait sur des IDs en dur). Sécurité = historique Google Sheets + `Archives_<date>`.
- **OCR** — intégré puis rendu **dormant** (cf. ci-dessus).
- **Optimisations index Properties / formules Sheets / auto-complétion sans garde-fou**
  — écartées (faux problème de perf, risque de faux négatif, ou anti-fraude/RGPD).
