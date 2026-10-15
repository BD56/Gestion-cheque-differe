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
> Branche `refonte` : l'ancien `Code.gs` (et le gros `Index.html`) sont découpés. Les
> sections plus bas qui citent `Code.gs` / `Index.html` désignent désormais ces
> fichiers (doc complète réécrite quand l'app sera finie : `docs/A_REDIGER.md`).

Serveur (une seule portée globale : **un nom déclaré dans deux .gs = erreur**) :
- **00_Constantes.gs** — structure de « Saisies » (`COL`, `IDX`…), réglages fixes, liste des fichiers.
- **Application.gs** — `doGet`, `include_`, démarrage tablette, copie locale, impression, outils.
- **Reglages.gs** — réglages de la structure (`getConfig` / `setConfig`).
- **Installation.gs** — « Installer », feuilles, robots de nuit, copie du modèle, contrôle de version.
- **Securite.gs** — comptes et sessions, code responsable, code d'activation, jetons.
- **Saisie.gs** — `traiterSaisie`, `forcerSaisie`, `verifierPiece`, correction / suppression, mode.
- **Detection.gs** — normalisation, doublons A/B/C, marquages (⚠️ miroir dans `ScriptSaisie.html` / `ScriptFormulaire.html`).
- **Annuaire.gs**, **Archives.gs**, **Robots.gs** (dates + nuit), **Sheet.gs** (menu, panneau, `onEdit`).

Page de la tablette :
- **Index.html** — squelette (HTML + `CONFIG` / `DATES_INITIALES` injectés) qui inclut :
- **Style.html** (palette en variables CSS `--…` dans `:root`), **Icones.html** (icônes
  SVG : `<svg class="ico"><use href="#i-nom"/></svg>`) et **Script*.html** — Tablette,
  Saisie, Alertes, Impression, Offre, Formulaire, Journal (journal du jour),
  Responsable, Actions (boutons `data-action`), Ocr (dormant).
- **Panneau.html** — sidebar admin dans le Sheets (menu `🚀 APPLICATION`).

Chaque fichier porte le même numéro de version (`npm run nouvelle-version`) ;
outils : `npm test`, `npm run lint`, `npm run push` (clasp), dossier `outils/`.
Captures d'écran (avant / après) : `NODE_PATH=$(npm root -g) node outils/captures.js <dossier>`.
Audit d'affichage (9 tailles d'écran × 27 états : débordements, chevauchements, textes coupés, erreurs) :
`NODE_PATH=$(npm root -g) npm run verifier-affichage -- <dossier> [taille]` → captures + `rapport.txt`.
- **appsscript.json** — manifeste (V8, `Europe/Paris`, webapp `access: ANYONE_ANONYMOUS`).
- **INSTALLATION.md** — créer le **modèle** (une fois) et installer l'appli pour une
  nouvelle structure (copie du modèle → menu Installer → déploiement).
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
- `installer` / `installerDepuisMenu` — installation idempotente (feuilles +
  déclencheurs), via le menu du Sheet « 🧰 Installer / vérifier l'installation ».
- `nettoyerSiCopie_` — les propriétés du document sont marquées `ID_CLASSEUR` ; si la
  marque ≠ ID du classeur (= copie), elles sont **toutes effacées** (code responsable,
  dates, réglages hérités). Appelée par `installer` et `doGet`. Classeur jamais marqué
  (Vannes avant la généralisation) : marque posée, rien d'effacé.
- `onEdit` — détection + formatage sur édition manuelle.
- `getDatesOperation` / `setDatesOperation` — dates d'offre dans `PropertiesService`.
- `verificationClotureNocturne` — robot de nuit : archive quand la date de fin passe.
- `archiverOffreWebApp` (protégée) → `archiverOffre_` (sous verrou) — clôture : copie
  « Saisies » → `Archives_<date>`, vide, efface les dates ; le **mode est conservé**.

## Triggers Apps Script
- `verificationClotureNocturne` — trigger temporel (nuit) : purge d'abord les archives
  de plus de 3 ans (`purgerArchives_`, date lue dans le nom `Archives_jj-mm-aaaa_hh-mm`,
  nom non reconnu = jamais supprimé), puis clôture si l'offre est finie.
- `purgerAnnuaire` — trigger temporel (nuit). Créés par `installer()` (la purge seulement
  si `ANNUAIRE_ACTIF`) ; recréés à l'ouverture de l'espace responsable s'ils manquent.
  Les deux refusent un appel qui ne vient ni de leur déclencheur (`triggerUid`) ni d'un
  éditeur.
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
  `<script type="module">` de `ScriptOcr.html`). Quand `false` : bouton 📷 masqué,
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
  « Saisies »). Kill-switch : `ANNUAIRE_ACTIF` (00_Constantes.gs). Mention légale ajoutée.
  → **Après activation : lancer `reconstruireAnnuaire()` une fois.**

## Généralisation (oct. 2026) — IMPLÉMENTÉE sur la branche `generalisation`
Décision : `docs/retours-vibe/decisions/2026-10-11_generalisation.md`.
- **Réglages** (`CONFIG_DEFAUTS` = Vannes) : nom de la structure (avec article), nom
  de l'offre, titre de l'onglet, libellé + caractère obligatoire du montant, libellé +
  précision des notes. Devise **euro**, conservation annuaire **3 ans** et
  archives **3 ans** après clôture : fixes.
  `doGet` passe en **template** (`<?= cfg.X ?>`, échappé) pour les injecter.
- **Espace responsable** (⚙️) : code PIN 6 chiffres (SHA-256 + sel, jamais en clair),
  jeton de session `CacheService` (10 min d'inactivité) **lié à la tablette** (envoyé
  `{ j: jeton, c: clé }`), 5 échecs → blocage 15 min.
  Protège : réglages, mode, mode annuaire, dates, clôture, archives, corrections.
  (Branche `design`) Le code protège les **actions**, le **contenu des archives** et
  les infos de sécurité (codes faux tapés) ; les **lectures** qu'un appareil autorisé
  obtient déjà sans code (saisies, chiffres, réglages, noms des archives, appareils)
  sont préparées à l'appui sur ⚙️ par `apercuResponsable(clé)` et affichées seulement
  une fois le code accepté (décision de Bryan, 14/10). Archives : **résumé** par offre
  (dates de l'offre — à défaut 1re et dernière saisie —, nombre de saisies, montant
  total) calculé à la clôture, gardé en propriété `RESUME_<onglet>` (calculé une fois
  pour une archive plus ancienne), effacé par la purge ; contenu chargé à l'impression.
  Liste des comptes : une erreur passagère de Google en la lisant n'est JAMAIS lue
  comme « aucun compte » (`lireComptes_` la remonte).
  ⚠️ Safari (Mac) et iPad / iPhone (tout navigateur) effacent le stockage de la page
  à la fermeture (cadre tiers googleusercontent.com, WebKit) : la session est perdue,
  le gestionnaire de mots de passe remplit la connexion. D'où les COMPTES (les
  anciennes « tablettes autorisées » perdaient leur clé). `MEMOIRE_CLAUDE.md` §0 ter.
  Présentation : **6 tuiles** (Saisies, Archives, Opération, Sécurité, Réglages, Code)
  ouvrant chacune un sous-écran (« ← Retour ») + Clôturer / Verrouiller à part.
  Bouton « Ouvrir Google Sheets » retiré de l'appli (tout passe par l'appli).
  **Saisie et impression restent libres.** Toute fonction serveur sensible appelle
  `exigerAdmin_(jeton)` en premier.
- **Panneau du Sheet** (secours, inchangé) : passe sans code ni clé de tablette **pour les
  éditeurs du classeur** (`estEditeurDuClasseur_`) ; bouton de réinitialisation du code.
- **Impression** calculée depuis « Saisies » ; **archives** consultables/imprimables.
- **Corrections / suppressions** dans l'appli, avec garde-fou « la ligne contient
  encore ce que l'écran affichait ».
- **Distribution = modèle à copier** (option A) : classeur modèle vierge chez Bryan,
  lien `…/copy`. Chaque structure a ses données sur **son** compte Google (pas de
  sous-traitance RGPD pour Bryan). Limite : chaque copie se met à jour à la main.
  Écartés pour l'instant : appli centrale multi-structures (Bryan deviendrait
  sous-traitant RGPD) et sortie de Google (autre projet).
- **`forcerSaisie` recontrôle côté serveur** (oct. 2026) : sous verrou, refait A/B/C ;
  BLOQUANT + A/B → refus (rien d'écrit) ; sinon note + couleurs **calculées par le
  serveur** (les paramètres `messageErreur`/drapeaux envoyés par la tablette sont
  ignorés). Ferme le contournement du mode BLOQUANT (appel direct ou cache périmé).
- **Robustesse (oct. 2026, analyse globale)** :
  - **N° de pièce** : Google Sheets convertissait « 0123… » en nombre (0 perdu, ex. anciennes
    CNI 2000-2009) → doublon manqué. Désormais : écriture en **texte** (`texte_`, apostrophe
    invisible, protège aussi des formules « = ») et comparaison via **`_normPiece_`**
    (N° entièrement numérique comparé sans ses 0 initiaux ; miroir client `normPieceJS`,
    les noms utilisent `_normId_` / `normIdJS`). Les anciennes lignes restent reconnues.
  - **Saisies en attente** (client) : une saisie validée reste dans la copie locale jusqu'à
    ce que le serveur l'ait écrite ET qu'un rechargement la contienne (`saisiesEnAttente`,
    `fusionnerEnAttente`) — sinon la resynchro au focus du N° l'effaçait (doublon immédiat
    invisible). Réponses de rechargement appliquées dans l'ordre.
  - **Refus du serveur** (doublon manqué localement, hors période, échec réseau) : **fenêtre
    d'alerte** `modalAlerteServeur` (détail + NE PAS ENREGISTRER / FORCER si permis), plus
    de simple bandeau ; bandeau à minuteur unique.
  - **Période de l'offre** : `controlerPeriode_` refuse côté serveur toute saisie hors dates
    (`traiterSaisie`, `forcerSaisie`) ; la tablette revérifie au retour sur la page, toutes les
    10 min et avant chaque saisie.
  - **Démarrage de la tablette** : les dates sont glissées dans la page par `doGet`
    (`DATES_INITIALES`) → bon écran d'emblée (le formulaire est masqué par défaut, plus de
    saisie affichée puis retirée). Puis **un seul appel** `demarrage(cle)` (mode + dates à
    jour + cache) au lieu de trois ; le cache (toute l'offre + annuaire) n'est envoyé que si
    l'offre est en cours, et chargé dès qu'elle démarre (`appliquerDates`).
  - **Noms** comparés sans accents, ligatures, apostrophes ni points (`_normId_` /
    `normIdJS`) : « HÉLÈNE » = « HELENE », « D'ARC » = « DARC ».
  - **Marquages** (note « ⚠️ Ajout forcé (Cas X) » + rouge) **recalculés pour toute l'offre**
    après une correction ou une suppression (`recalculerMarquages_`) : une ligne est marquée
    si elle double une ligne **plus ancienne** (la 1re occurrence reste propre).
  - Une **usurpation forcée (B)** ne réécrit pas l'annuaire (le nom du vrai titulaire reste).
  - **Pas de pré-remplissage** Nom/Prénom quand le N° est déjà sur l'offre en cours (revient
    sur le commit 8bae95e) : l'hôtesse recopie le nom lu sur la pièce, sinon une usurpation
    (B) devenait un « vrai doublon » (A). Le pré-remplissage depuis l'**annuaire** (offres
    passées) est conservé.
  - **Montant** contrôlé (`lireMontant`) et reformaté « 1234,50 € » ; TOTAL d'impression juste.
  - **Affichage échappé** (`echapper`, `textContent`) : un nom/une note ne peut plus injecter
    de code dans la page.
  - Divers : clôture sans archive vide et nom d'archive unique (suffixe `_2`…) ; dates
    contrôlées (les deux ou aucune, début ≤ fin) ; saisie incomplète refusée côté serveur
    (`controlerChamps_`) ; `reconstruireAnnuaire` réservée aux éditeurs du classeur ;
    `purgerAnnuaire` sous verrou, réécriture en une fois (en texte).
- **Comptes (identifiant + mot de passe)** — branche `design`, étapes 1 à 4 FAITES
  (octobre 2026) : ils ont REMPLACÉ les tablettes autorisées (Safari oublie la clé :
  voir MEMOIRE_CLAUDE §0 ter). Accès déploiement : **Tout le monde**
  (`ANYONE_ANONYMOUS`) ; `exigerSession_(cle)` en tête de toutes les fonctions de la
  page (le panneau du Sheet passe via `estEditeurDuClasseur_`). Comptes des caisses centrales (`COMPTES` en propriétés : id, identifiant, sel,
  empreinte répétée `MDP_TOURS` fois, version `v`). `connexion(identifiant, mdp)` →
  session « S1.<id>.<v>.<fin>.<HMAC> » (secret `SESSION_SECRET`, rien de stocké par
  session) valable jusqu'à **3 h du matin** (`finDeSession_`, fuseau du script) ;
  `exigerSession_` exige une session valable (sinon `CONNEXION_REQUISE`). Essais faux PAR COMPTE (`CPT_ESSAIS_<id>` : pause 10 s, blocage 15 min
  après 5). 1er compte : `premierCompte(activation, …)` (code d'activation, aucun
  compte). Ensuite (espace responsable) : `creerCompte`, `listerComptes`,
  `changerMotDePasse` (version + 1 ⇒ sessions caduques ; nouvelle session si c'est
  l'appelant), `retirerCompte` (jamais le dernier). **Code responsable « à part »**
  facultatif : sans code (`ADMIN_PIN_HASH` absent), un compte connecté ouvre l'espace
  (`ouvrirSessionAdmin`) ; un compte crée le code sans activation (`definirPin`) ;
  `retirerCodeResponsable` (compte connecté, espace ouvert). Secours :
  `reinitialiserComptesPanneau` (éditeurs ; tout effacé, nouveau secret, code
  d'activation). Tests : `test_comptes`.
  **Page (étape 2)** : `#ecranConnexion` (ScriptConnexion.html) = « Première
  installation » (aucun compte : code d'activation + identifiant + mot de passe × 2,
  puis question « code responsable à part ? » → `definirPin` ou rien) ou
  « Connexion ». Le formulaire est RÉELLEMENT envoyé vers le cadre caché
  `cibleConnexion` (action = `URL_APPLI`, adresse /exec injectée par doGet ; `doPost`
  ne fait rien) : seule façon pour que Safari propose d'enregistrer le mot de passe
  (essai `docs/essais/trousseau`). Session en localStorage `cdSession` (+ `cdCompte`),
  variable `SESSION` envoyée à chaque appel (ancienne `CLE_TABLETTE`). Refus
  `CONNEXION_REQUISE` → session oubliée, écran de connexion, page laissée telle quelle
  (saisie en cours gardée) ; saisie en arrière-plan refusée → `saisiesARenvoyer`,
  renvoyée (et recontrôlée) après la reconnexion. Sans code à part, ⚙️ ouvre l'espace
  directement (`ouvrirSansCode`), « Verrouiller » masqué ; « Se déconnecter » dans le
  menu et sous la carte du code. Test `test_ui_connexion` (remplace test_ui_tablettes).
  **Étape 3** : écran « Code & comptes » (`ouvrirCodeComptes`) : liste (« (vous) »,
  créé / utilisé le), « Mot de passe » (formulaire par compte ; pour SON compte, envoi
  réel vers le cadre caché pour que le navigateur mette à jour le mot de passe retenu,
  et nouvelle session gardée), « Retirer » (second appui ; jamais le dernier ; son
  propre compte ⇒ déconnexion), « Créer un compte » (sans envoi réel : rien retenu sur
  CET appareil) ; code responsable : le choisir (aucun code ⇒ `definirPin` par le
  compte), le changer, « Ne plus demander de code » (`retirerCodeResponsable`). Le
  serveur reprend la session de l'appelant dans le jeton { j, c } (`cleAppelant_`).
  KPI et menu : nombre de COMPTES (`chiffresOffre_().comptes`) ; aperçu : `comptes`.
  Panneau du Sheet : « Réinitialiser les comptes » (remplace « Retirer tous les
  appareils ») ; « Réinitialiser le code » ne donne plus de code d'activation s'il
  existe un compte. Aide « Code & comptes » et mentions légales réécrites.
  **Étape 4 (nettoyage)** : tablettes autorisées RETIRÉES (fonctions, `TABLETTES_MAX`,
  `PIN_INCONNUS` / `essaisInconnus`, jetons « T: ») ; `exigerTablette_` → `exigerSession_`
  ; `definirPin` : création par un compte connecté (ou le panneau), plus de code
  d'activation ; verrou de l'espace : « Saisissez le code » ou ouverture directe ;
  « Installer » efface les anciennes propriétés (`effacerAnciennesAutorisations_`) ;
  ScriptTablette.html → **ScriptConnexion.html** ; classes `.ecran-connexion`.
  Tests : `env.connecter()` (vrai compte « Caisse test »), `env.creerCode` → jeton
  `{ j, c }` ; options `sessionReelle` / `sansSession` ; test_tablettes retiré (ses
  contrôles utiles sont dans test_comptes).
- **Code d'activation** (lot 1 de l'audit) : créer le code responsable (aucun code :
  1re installation ou après « Réinitialiser ») exige un code à 8 chiffres affiché
  **uniquement dans le Google Sheets** (menu « 🧰 Installer », « 🔑 Code d'activation »,
  réinitialisation depuis le panneau). Usage unique, 24 h, 10 essais. Empêche la prise
  de contrôle par la première personne qui ouvre le lien.
- **Code responsable** : exactement **6 chiffres** ; pause serveur de 10 s après chaque
  code faux ; blocage 15 min après 5 erreurs (jamais plus long). Compteurs **séparés**
  (`PIN_ESSAIS_<groupe>`) : un par tablette autorisée, un pour les appareils non
  autorisés (écran d'autorisation), un pour le panneau du Sheet ; un inconnu ne peut
  plus bloquer l'espace responsable. Codes faux d'inconnus signalés (`PIN_INCONNUS`).
- **Fonctions réservées** : `installer`, `allerVers*` (éditeurs du classeur) ;
  `verificationClotureNocturne` / `purgerAnnuaire` (leur déclencheur, vérifié par
  `triggerUid`, ou un éditeur). Passage du robot noté (`DERNIERE_NUIT`) ; l'espace
  responsable recrée les robots absents et signale un robot arrêté (> 36 h).
- **Copie locale de la tablette** : âge maximum 2 min (`copieFraiche`) pour décider sans
  attendre le serveur ; au-delà, on attend sa réponse. Rechargée au focus et à la 1re
  frappe du N° ; porte les réglages (`config`). Indicateur « en cours d'envoi » ;
  saisie refusée/non envoyée retirée de la copie, bouton RÉESSAYER. Mode conservé à la
  clôture. Montant jamais écrit comme formule (`montantSur_`).
- **Règle d'installation (#5)** : le manager détient le Sheet (idéalement compte Google du
  magasin) et ne transmet que le lien `/exec` ; ce compte n'est jamais connecté sur une
  tablette de caisse (sinon le code ne protège rien).
- **`onEdit`** (filet de secours) : un collage de plusieurs lignes est contrôlé ligne par
  ligne (`preparerLigneEditee_`, `controlerLigneEditee_`) ; en BLOQUANT seules les lignes
  fautives sont annulées.
- **Passages autorisés par client** (réglage `PASSAGES_MAX`, 1 à 10, défaut 1 = comportement
  historique) : un même client (même nom + même pièce) peut revenir jusqu'à N fois sur une
  offre ; ses passages sont notés « ℹ️ Passage k/N » (sans rouge) ; au-delà -> cas A.
  **B (même pièce, autre nom) et C (même nom, autre pièce) restent toujours signalés.**
  Appliqué partout : `traiterSaisie`, `detecterDoublons_` (forçage, correction),
  `recalculerMarquages_` (recalcul aussi quand le réglage change), `onEdit`, client
  (`analyserDoublonLocal`, avertissement N°). Notes système : `NOTES_SYSTEME_REGEX`.
  Côté client, les saisies en attente retiennent leur **rang** (passages identiques comptés).
- **Dette assumée** : la logique A/B/C existe à **3 endroits** — `detecterDoublons_`
  (serveur : `traiterSaisie`, `forcerSaisie`, `modifierSaisie`, `onEdit`),
  `recalculerMarquages_` (marquage chronologique de toute l'offre) et
  `analyserDoublonLocal` (client). Normalisation : `_normId_`/`_normPiece_` ↔
  `normIdJS`/`normPieceJS` (test_lot2 vérifie qu'elles donnent le même résultat).
- **Lot 2 de l'audit** : N° comparés sur lettres + chiffres ; noms sans aucun séparateur
  (toutes apostrophes, invisibles) ; saisie « vide » (rien de comparable) refusée ;
  annuaire jamais réécrit par un usurpateur (`aUneUsurpation_`), reconstruction = 1er
  titulaire ; `onEdit` : en BLOQUANT seule une modif de nom/prénom/N° est annulée
  (ancienne valeur remise), puis `recalculerMarquages_` ; un seul fuseau (`fuseau_()`) ;
  mode Z1 tolérant (`modeSecurite_`) ; flush avant de rendre le verrou (`libererVerrou_`).

## Historique des choix (ne pas réintroduire sans raison nouvelle)
- **Logs d'audit** — retirés (redondants avec « Saisies » déjà horodaté).
- **Backup applicatif** — retiré (redondant avec l'historique de versions natif ;
  reposait sur des IDs en dur). Sécurité = historique Google Sheets + `Archives_<date>`.
- **OCR** — intégré puis rendu **dormant** (cf. ci-dessus).
- **Optimisations index Properties / formules Sheets / auto-complétion sans garde-fou**
  — écartées (faux problème de perf, risque de faux négatif, ou anti-fraude/RGPD).
