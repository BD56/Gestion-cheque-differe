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

## Fichiers
- **Code.gs** — backend Apps Script (logique serveur).
- **Index.html** — la web app servie par `doGet` (tablette caisse).
- **Panneau.html** — sidebar admin dans le Sheets (menu `🚀 APPLICATION`).
- **appsscript.json** — manifeste (V8, `Europe/Paris`, webapp `access: ANYONE`).
- **prototype-ocr/** — banc d'essai OCR isolé (hors app, voir plus bas).

## Structure du Google Sheets
- **Saisies** — offre en cours. Colonnes : A=Date, B=Nom, C=Prénom, D=N° Pièce,
  E=Montant, F=Notes, G=(réservé). **Z1** = mode de sécurité (`SIGNALER`/`BLOQUANT`).
- **A_IMPRIMER** / **OFFRE_COMPLETE** — mise en forme impression (Z1 = paramètre date).
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
- `onEdit` — détection + formatage sur édition manuelle.
- `getDatesOperation` / `setDatesOperation` — dates d'offre dans `PropertiesService`.
- `verificationClotureNocturne` — robot de nuit : archive quand la date de fin passe.
- `archiverOffreWebApp` — clôture : copie « Saisies » → `Archives_<date>`, vide, repasse
  en SIGNALER, efface les dates.

## Triggers Apps Script
- `verificationClotureNocturne` — trigger temporel (nuit).
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

## Historique des choix (ne pas réintroduire sans raison nouvelle)
- **Logs d'audit** — retirés (redondants avec « Saisies » déjà horodaté).
- **Backup applicatif** — retiré (redondant avec l'historique de versions natif ;
  reposait sur des IDs en dur). Sécurité = historique Google Sheets + `Archives_<date>`.
- **OCR** — intégré puis rendu **dormant** (cf. ci-dessus).
- **Optimisations index Properties / formules Sheets / auto-complétion sans garde-fou**
  — écartées (faux problème de perf, risque de faux négatif, ou anti-fraude/RGPD).
