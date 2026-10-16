# Mémoire de travail — Claude (branches `generalisation`, `refonte`, `design`)

> Fichier de reprise après compactage du contexte. À lire **avec** `AGENTS.md` (référence
> canonique) et `docs/retours-vibe/decisions/2026-10-11_generalisation.md` (décisions).
> Dernière mise à jour : 2026-10-16 (version 2026.10.16-1031 : comptes, codes personnels,
> journal des actions, impression réservée, passe-droit propriétaire corrigé ; mémoire
> nettoyée). Rien en cours de codage ; attendu : essais de Bryan.

## ▶️ ÉTAT ACTUEL — à lire d'abord
- **Branches** : `main` = prod Vannes (non touchée) ; `generalisation` = version
  généralisée testée en simulation ; `refonte` = même code réorganisé (11 .gs,
  Script*.html, outillage npm/clasp) ; **`design` = refonte + refonte graphique
  « Comptoir » (branche de travail actuelle, tout est poussé)**. Aucune fusion faite,
  aucune pull request. Ordre prévu (sur demande de Bryan seulement) : `design` →
  `refonte` → `generalisation` → `main` / migration Vannes.
- **Version actuelle sur `design`** : 2026.10.16-1031 (43 séries de tests vertes,
  ESLint et Prettier propres). Numéro renouvelé par Claude à chaque push de code
  (`npm run nouvelle-version`).
- **Bryan teste** sur le Sheet « Gestion Chèques Différés — REFONTE (test) » depuis
  son Mac (clasp : `git pull`, `npm run push`, « Installer », puis « Nouvelle version »
  dans Gérer les déploiements pour `/exec`). Bugs d'affichage signalés et corrigés :
  petits écrans (audit), carte du code collée à gauche sous Safari.
- **FAIT (15/10)** : passage aux COMPTES (identifiant + mot de passe) en 4 étapes — voir
  §0 ter et AGENTS.md « Comptes ». Les « tablettes autorisées » (clé d'appareil)
  n'existent plus. Modèle validé : comptes = caisse(s) centrale(s) ; code responsable
  facultatif ; direction = Sheet.
- **FAIT le 16/10** (détails dans AGENTS.md, sections du même nom) :
  1. **Option A** : à la 1re installation, un code responsable d'avant est seulement
     SIGNALÉ ; le code d'activation ne donne que le 1er compte (Bryan : « est-ce sûr ? »).
  2. **Impression réservée** (0853) : avec un code, rien sous le code ; hors espace,
     seul « Imprimer la journée » (journal) ; offre entière / jour précédent dans
     l'espace, imposé par le serveur. Bryan a corrigé l'avis « gain limité » de Claude
     (barrière réelle sur tablette, papier hors contrôle, moindre accès / RGPD).
  3. **Passe-droit propriétaire corrigé** (0904) : `estEditeurDuClasseur_` est VRAI dans
     la web app pour le propriétaire connecté à Google ⇒ il passait sans compte (vu
     par Bryan : rien ne se déconnectait après les réinitialisations). Passe-droit
     seulement SANS session ni jeton (panneau du Sheet) ; page : SESSION jamais null.
     Génération des jetons (`ADMIN_GENERATION`) : changer / réinitialiser le code ou
     les comptes referme les espaces ouverts. Comportements validés par Bryan :
     comptes réinitialisés ⇒ déconnecté partout ; code seul ⇒ comptes connectés,
     espace refermé.
  4. **Saisies en attente + vérification toutes les 5 min** (0943) : une saisie validée
     après la fin de session est PROPOSÉE à la reconnexion (Enregistrer / Ne pas
     enregistrer, second appui) — jamais jetée d'office (doublon futur manqué), jamais
     envoyée seule (gêne de Bryan).
  5. **Journal des actions** (0955) : onglet masqué `_Journal`, 12 mois, Sheet seul, sans
     les connexions réussies (`Journal.gs`).
  6. **Codes personnels** (1018 serveur, 1031 écrans ; idée de Bryan : un code PAR
     PERSONNE quel que soit le compte ⇒ traçabilité par personne avec des comptes
     partagés) : `Personnes.gs`, « Qui êtes-vous ? » + code, journal « compte ·
     personne ». Choix de Claude À VALIDER : jeton 3 min en mode personnel ; ajouts
     forcés tracés au niveau du compte (hors espace). Noms en double REFUSÉS
     (« « Marie » existe déjà. ») avec la comparaison des noms clients (`_normId_` :
     sans casse, accents, espaces, tirets, apostrophes, points) ⇒ « marie », « Marié »,
     « Ma-rie » = Marie ; pour deux Marie, les distinguer (« Marie D. », « Marie L. »).
  Abandonné : bouton de remise à zéro (« pas besoin »). Leçon : piège du déploiement
  (« Installer » lit le dernier code ; /exec sert la version figée ⇒ `npm run push`
  puis « Nouvelle version »).
- **ATTENDU de Bryan** (une seule liste) : essais sur le Sheet de test avec la version
  en ligne 1031 —
  1. réinitialiser les comptes puis rafraîchir (écran de connexion attendu, même
     connecté à Google) ; 1re installation avec le code d'activation ;
  2. Safari + trousseau (Mac, puis Cmd+Q et retour ; iPad), Chrome ;
  3. Code & comptes ; codes personnels ; journal (onglet `_Journal`) ;
  4. temps de connexion (MDP_TOURS = 500) ;
  5. captures en précisant le navigateur (Safari / Chrome) si un affichage cloche ;
     « Saisies : Chargement… » ne doit plus rester bloqué ;
  6. vraie tablette (rotation, clavier, journal, alertes, espace responsable) ;
  7. validation des 2 choix ci-dessus (3 min, ajouts forcés).
- **Fil des échanges sur Safari (14-15/10)** : perte d'autorisation des appareils →
  §0 ter ; code responsable = caisse centrale ; page d'essai du trousseau
  (`docs/essais/trousseau/`) réussie sur Mac (méthode 2 : vrai envoi) ⇒ comptes.
- **Ensuite (sur demande)** : fusions, documentation (`docs/A_REDIGER.md`, captures via
  `outils/captures.js`), migration de Vannes (`DEPLOIEMENT.md`).
- **Leçons de cette période** : (1) ne pas réorganiser des écrans sans validation (la
  fusion Opération/Sécurité a été refusée → maquette des 2 idées, idée 2 retenue) ;
  (2) Chromium ≠ Safari : un `display` écrit par script qui écrase une grille passait
  inaperçu ; (3) le banc de test doit reproduire doGet (balise viewport) sinon les
  petits écrans sont faux ; (4) proposer une maquette cliquable quand Bryan hésite ;
  (5) le compactage du contexte arrive sans prévenir : tenir CE fichier à jour à
  chaque commit poussé (pas seulement quand Bryan le demande).
  (6) ne pas conclure trop vite sur une cause : « nom déjà pris » semblait innocenter
  le serveur, puis le défaut corrigé semblait tout expliquer ; la vraie cause
  (Safari) n'est apparue qu'avec un test simple et reproductible (Cmd+Q). Proposer
  ce genre de test TÔT.
  (7) annoncer EXACTEMENT ce qu'un raccourci de sécurité permet (« changer le code »
  cachait « tout l'espace 10 min ») ; Bryan a raison de demander « est-ce sûr ? ».

## 0 ter. Clé d'appareil et Safari (14-15/10) → COMPTES (faits, voir fin de section)
**Constat** : le Mac de Bryan (Safari) redemandait « Autoriser cet appareil » après
une mise à jour / le lendemain. **Cause CONFIRMÉE** : la page Apps Script tourne dans
un cadre `…-script.googleusercontent.com` à l'intérieur de `script.google.com` ⇒
contenu « tiers » ; Safari (WebKit, anti-pistage ITP) rend le stockage des cadres
tiers partitionné ET temporaire ⇒ la clé (`localStorage` `cdTabletteCle`) disparaît
quand Safari est quitté. Ni notre code, ni le déploiement (adresse technique
identique avant/après : `n-ijetbkxwto6cqlhbmed6rj7j4kexnxcgupggffa-0lu-script…`).
- **Tests de Bryan (15/10)** : Safari Mac, Cmd+Q puis réouverture ⇒ autorisation
  redemandée ❌ ; Chrome Mac ⇒ gardée ✅ ; « Ajouter au Dock » (app web Safari) ⇒
  perdue ❌. Réglage Safari « Empêcher le suivi intersites » décoché : NON testé.
- **Qui est concerné** : iPad / iPhone avec TOUT navigateur (moteur WebKit imposé) ;
  Mac avec Safari. Pas concernés en réglage normal : Chrome / Edge / Firefox sur
  ordinateur, navigateurs Android à moteur Chrome. Exceptions : Brave (stockage
  tiers temporaire), navigation privée, effacement des données, anti-pistage
  renforcé (Edge strict, Samsung Internet : non vérifié), et futur durcissement
  possible de Chrome.
- **Vannes = PC Windows + tablettes Android** (Bryan) ⇒ NON bloquant pour Vannes. À
  vérifier sur place : navigateur réel des tablettes (Chrome ? Samsung Internet ?)
  par le test autoriser → fermer complètement → rouvrir. Version `main` de Vannes :
  pas d'autorisation d'appareil, donc pas de souci aujourd'hui.
- **Pistes et avis** (aucune choisie) :
  - clé dans l'adresse (`#`, favori / écran d'accueil, `google.script.url.
    getLocation` / `google.script.history.replace`) : fiable mais DÉCONSEILLÉE —
    une adresse qui fuit (copie, iCloud, capture) donne l'accès, dont l'impression
    libre de « Toute l'offre » ;
  - site hébergé à part (page hors cadre Google, Apps Script en API) : stockage
    fiable, sans bandeau Google ; ÉCARTÉ (Bryan : un site par magasin ; même un
    site unique = centralisation : panne commune, confiance, compatibilité des
    versions, contraire au « modèle à copier ») ;
  - **B, code d'équipe** quand la clé a disparu (code partagé, anti-essais comme le
    code responsable) : simple, sûr, indépendant du navigateur ; à retaper sous
    Safari après fermeture. **Piste gardée en réserve** (avis de Claude) ;
  - réglage Safari sur appareils dédiés à la caisse : sans code, à tester ;
  - compte Google : avec des comptes gmail, Apps Script ne donne pas l'e-mail en
    « exécuter en tant que moi » ; « exécuter en tant qu'utilisateur » ou compte
    dédié ⇒ accès direct au Sheet (contourne l'anti-fraude) ; propre seulement avec
    Google Workspace (même domaine). Carrefour a Workspace « pour l'instant » ;
    avis de Claude : ne PAS lier l'outil à Workspace (dépendance au groupe, règles
    de ses administrateurs, Sheet à placer dans le domaine Carrefour ⇒ propriété de
    l'outil, franchisés, autres structures) ; au mieux un mode facultatif plus tard ;
  - écartés : autres stockages du navigateur (cookies tiers bloqués, IndexedDB /
    cache même règle), passkeys (non permises par le cadre Google), fichier local,
    trousseau (incertain dans un cadre tiers), app iPad native (autre projet),
    identification sans stockage.
- **Sources** (recherche du 15/10 ; pages WebKit non ouvrables depuis
  l'environnement, extraits de moteurs seulement) : Apple Developer Forums 109909,
  765342, 9757, 125041, 725074 ; WebKit « Tracking Prevention » ; WebKit Bugzilla
  247565, 231879, 225297 ; Google « migration iframe » Apps Script. Aucun
  signalement trouvé spécifique à Apps Script.
- **DÉCISION (Bryan, 15/10) — modèle « code responsable = caisse centrale »** : le site
  sert surtout aux caisses centrales (parfois à des caissiers) ; la caisse centrale a
  la confiance de la direction ⇒ le code responsable est LE code de l'équipe de
  caisse centrale. Trois niveaux, déjà présents dans l'app : direction = détient le
  Google Sheet (panneau : réinitialiser le code, mode, dates) ; caisse centrale = le
  code (autoriser les appareils, corriger, supprimer, clôturer, réglages) ; caissiers =
  appareil autorisé, sans code. Sous Safari, la caisse centrale réautorise son appareil
  (code + nom + « Remplacer »). RIEN à coder ; à écrire plus tard dans la
  documentation (et `docs/A_REDIGER.md`) : changer le code au départ d'un membre de la
  caisse centrale (les appareils autorisés restent autorisés) ; ne jamais donner le
  code aux caissiers. Le nom « code responsable » est gardé (générique).
  - **Condition signalée par Claude** : code partagé ⇒ plus de « qui a fait quoi ».
    Aujourd'hui `supprimerSaisie` fait `deleteRow` SANS trace dans l'app (reste
    l'historique des versions de Sheets). Proposé, NON décidé : **journal des actions
    sensibles** (onglet vu par la direction : date, action, appareil, saisie avant /
    après ; suppression, correction, mode, clôture, réglages, appareils, code).
  - Écartés par ce modèle (en réserve pour d'autres structures) : code d'équipe et
    3 modes d'accès (1 appareils autorisés + code d'équipe en secours, 2 code d'équipe
    seul valable la journée, 3 libre comme avant ; en libre, idée d'exiger le code
    pour imprimer « Toute l'offre ») ; analyse : accès par code d'équipe valable
    jusqu'à la fin de la journée, jamais autorisation permanente ; changer le code
    coupe les accès ; pause 10 s sans blocage long (blocage global = toute l'équipe
    bloquée par n'importe qui ayant le lien).
  - Autres pistes de Bryan écartées : « laisser la clé dans l'adresse », « comptes
    Google », « retirer la mémorisation des appareils » (= retour au lien seul, pire
    que la clé dans l'adresse : non révocable par appareil) ; **associer la clé à
    l'adresse IP** : impossible (Apps Script ne donne pas l'IP ; une IP déclarée par
    la page se falsifie ; tous les appareils du magasin partagent l'IP publique de la
    box ; l'IP change) ; empreinte de l'appareil : identique entre tablettes, change
    aux mises à jour, brouillée par Safari.
- **Piste « gestionnaire de mots de passe » (15/10, idée de Bryan)** : présenter la
  clé de l'appareil comme un mot de passe (nom de l'appareil = identifiant) pour que
  Safari la range dans son trousseau (« Mots de passe »), qui survit à Cmd+Q ; à la
  réouverture : suggestion « Caisse 2 » → Touch ID / Face ID → appareil reconnu, sans
  code responsable. INCERTAIN : remplissage dans le cadre tiers Google ; proposition
  d'enregistrer sans changement de page (`google.script.run`) ; site sous lequel la
  clé est rangée ; synchronisation iCloud vers l'iPhone personnel si identifiant
  Apple personnel (⇒ identifiant Apple du magasin ou pas de synchro ; retrait de
  l'appareil = parade). `PasswordCredential` : Chrome seulement. Déconseillé : ranger
  le CODE RESPONSABLE dans le trousseau.
  **Page d'essai** (« go » de Bryan) : `docs/essais/trousseau/` (Code.gs, Page.html,
  README.md = mode d'emploi), projet Apps Script À PART (copier-coller, déploiement
  « Tout le monde »), fausse clé courte en propriété de script ; méthode 1 = événement
  submit sans changer de page, méthode 2 = envoi réel vers un cadre caché (doPost),
  repli = frappe à la main ; diagnostic (mémoire du navigateur vide après Cmd+Q ?,
  adresse technique, cadre, navigateur) ; « Vérifier la clé » compare au serveur.
  Vérifiée seulement dans Chromium (bouchon de google.script.run) ; non envoyée par
  `npm run push` (liste blanche de `.claspignore` : racine seulement, vérifié avec
  micromatch). ATTENDU de Bryan : proposition d'enregistrer (méthode), suggestion
  après Cmd+Q, « Vérifier » ✅, nom du site dans « Mots de passe », Mac puis iPad.
  Si ça marche : l'intégrer à l'écran d'autorisation (repli : code responsable +
  « Remplacer »), après discussion.
  **Résultat (Bryan, 15/10)** : « ça a l'air de fonctionner » sur Safari Mac (détails
  non donnés : méthode, nom du site). Modèle discuté : identifiant + mot de passe de
  l'APPAREIL (= nom + clé au hasard, gardés par le trousseau) pour ouvrir le site ;
  code responsable (caisse centrale) pour l'espace responsable et autoriser /
  remplacer un appareil ; ses champs restent HORS du formulaire (jamais dans le
  trousseau). Contre-proposition de Bryan : identifiant + mot de passe CHOISIS par
  l'utilisateur (comptes) + code responsable à part en option → avis de Claude :
  change le modèle (accès depuis n'importe où avec le mot de passe, mots de passe
  faibles), gros chantier ; si comptes : un par personne avec rôle (traçabilité).
  Préférence de Claude : appareils autorisés + trousseau. Bryan n'a pas tranché.
  **Page d'essai v2** (demande de Bryan) : écran Connexion (identifiant, mot de
  passe, gros bouton) ⇒ écran vert « Connecté » + « Reconnu par : » (mémoire du
  navigateur / gestionnaire, indice `:autofill` / nouvelle clé) ; « Première fois ? »
  = créer + enregistrer ; « Se déconnecter » vide la mémoire ; ancienne clé
  toujours valable (même propriété CLE_ESSAI). Essai demandé : Safari Mac, iPad,
  Chrome.
  **Résultat Safari Mac (Bryan, 15/10)** : méthode 2 (VRAI envoi du formulaire vers
  un cadre caché, `doPost`) ⇒ Safari propose d'enregistrer ✅ ; méthode 1 (événement
  submit + preventDefault, sans envoi) ⇒ RIEN. Conséquence pour l'app : l'étape
  « Enregistrer » devra faire un vrai POST vers un cadre caché ⇒ ajouter un `doPost`
  minimal (ne fait rien, ne journalise pas la clé ; POST et non GET pour que la clé
  ne soit jamais dans une adresse). Page d'essai : « 2. Enregistrer » = méthode 2 par
  défaut.
  **Safari Mac (15/10, 15h38, Safari 26.6.2) : ✅ RÉUSSI** — après fermeture, écran
  vert « Reconnu par : le gestionnaire de mots de passe (champ rempli
  automatiquement) ». Entrée rangée sous **googleusercontent.com**, site web =
  l'adresse technique EXACTE du projet (`n-gjhgrd…-0lu-script.googleusercontent.com`,
  propre à chaque projet : celle de l'app est `n-ijetbk…`). Conséquences : une
  copie par magasin = entrées séparées ; si Google change l'adresse technique, la
  suggestion peut disparaître (repli : code responsable + « Remplacer ») ; à
  vérifier un jour : Safari propose-t-il l'entrée sur la page d'un AUTRE projet
  Apps Script (même domaine googleusercontent.com) ? risque faible (choix de
  l'utilisateur + clé inutile sans l'adresse /exec de l'app).
  **iPad : PROBLÈME** — onglet `googleusercontent.com` en page entière « Google
  Drive · Impossible d'ouvrir le fichier pour le moment ». Hypothèse de Claude (non
  vérifiée) : l'envoi réel n'a pas trouvé le cadre caché ⇒ ouvert dans un nouvel
  onglet ⇒ POST vers /exec hors cadre ⇒ erreur Google. Question posée à Bryan : à
  quelle étape ? nouvel onglet ? Chrome pas encore essayé.
  → Réponse de Bryan : erreur dès l'OUVERTURE (rien fait d'autre) ⇒ hypothèse du
  cadre caché ÉCARTÉE. Cause probable : l'iPad a ouvert directement l'adresse
  technique `…googleusercontent.com` (page interne, inutilisable seule) au lieu de
  `script.google.com/macros/s/…/exec` — venue de l'historique / des suggestions
  synchronisés par iCloud, ou du lien « Site web » de l'entrée « Mots de passe »
  (synchronisée depuis le Mac). À confirmer. PIÈGE à documenter pour l'app : ouvrir
  toujours l'adresse /exec (signet / écran d'accueil), jamais googleusercontent.
- **NOUVELLE DIRECTION (Bryan, 15/10) : COMPTES identifiant + mot de passe** à la
  place de la clé par appareil (« méthode éprouvée » ; Claude d'accord : le trousseau
  gère nativement, la clé par appareil n'apporte plus assez — avec iCloud la clé
  passe déjà d'un appareil à l'autre). Proposition de Claude (à valider, RIEN codé) :
  1re installation = code d'activation → 1er compte → « Protéger l'espace
  responsable par un code à part ? » (oui par défaut, modifiable) ; connexion gardée
  par le navigateur (trousseau sous Safari) + « Se déconnecter » ; écran « Code &
  comptes » (créer, retirer = déconnecté partout, réinitialiser le mot de passe) ;
  mot de passe ≥ 8 caractères, empreinte seulement, pause 10 s, blocage PAR COMPTE
  après 5 erreurs ; jamais d'inscription libre ; disparaissent : autorisation des
  appareils, nom unique, « Remplacer » (rien à migrer : `main` n'en a pas).
  Réponses de Bryan : A (par personne ou par poste) = au choix du magasin, l'app
  permet plusieurs comptes ; C ✅ sans code responsable à part, tous les comptes ont
  tous les droits (y compris créer des comptes) ; B (qui tape le mot de passe à la
  création) : question reformulée ; D : déconnexion chaque nuit (idée de Bryan :
  minuit) — avis de Claude : bien, plutôt 3 h (fermetures tardives, inventaires),
  saisie en cours jamais perdue. → Bryan : ✅ **3 h**. B : quiproquo levé — les
  comptes sont ceux de la (des) CAISSE(S) CENTRALE(S), pas de chaque caissier ⇒ qui
  crée un compte choisit son mot de passe, modifiable ensuite dans l'espace ; les
  caissiers qui utilisent parfois le site : la caisse centrale connecte l'appareil
  (le navigateur peut retenir le mot de passe ⇒ comme un appareil autorisé).
  Découpage en 4 étapes proposé (serveur comptes + sessions ; page connexion +
  1re installation ; espace « Code & comptes » + panneau du Sheet + textes ;
  retrait de l'autorisation des appareils + docs). Création des comptes validée par
  Bryan : 1er compte = code d'activation du Sheet (usage unique) ; suivants = espace
  responsable « Code & comptes » ; secours = panneau du Sheet « Réinitialiser les
  comptes » (retour à la 1re installation).
  **✅ ÉTAPE 1 FAITE (serveur, version 2026.10.15-1612, « go » de Bryan)** : voir AGENTS.md
  « Comptes ». Choix techniques de Claude : session SIGNÉE (HMAC) sans stockage par
  session (révocation = version du compte / retrait / nouveau secret) ; clés de
  tablette toujours acceptées jusqu'à l'étape 4 (l'app reste utilisable entre les
  étapes) ; « Identifiant inconnu » dit tel quel (identifiants non secrets) ; dernier
  compte non retirable ; MDP_TOURS = 500 (temps réel à mesurer sur un vrai Sheet).
  Test `test_comptes` (41 séries). Reste à adapter à l'étape 2/3 : `texteActivation_`
  (parle encore de « choisir le code responsable »). PROCHAINE : étape 2 (page de
  connexion, vrai envoi + `doPost` pour le trousseau, 1re installation) — sur « go ».
  **✅ ÉTAPE 2 FAITE (page, version 2026.10.15-1639, « go » de Bryan)** : voir AGENTS.md
  « Comptes » (Page). test_ui_tablettes remplacé par `test_ui_connexion` ; audit
  d'affichage : états 27-29 (1re installation, code à part, connexion), rien à
  signaler. Intérim jusqu'aux étapes 3-4 : « Code & appareils » liste encore les
  anciens appareils (retrait = liste rechargée, plus d'écran d'autorisation) ; le
  verrou garde la création du code avec activation pour un appelant SANS compte
  (n'arrive plus en vrai, sert aux tests UI qui ont une session factice) ; aide et
  mentions parlent encore d'« autoriser l'appareil ». Non vérifiable ici : Safari
  (proposition d'enregistrer dans la vraie page), temps de MDP_TOURS.
  Corrigé au passage : le menu « 🔑 Code d'activation » (et « Installer ») donnait un
  code seulement s'il n'y avait PAS de code responsable ⇒ sur le Sheet de test de
  Bryan (code déjà créé) impossible de créer le 1er compte. Désormais : code donné
  tant qu'AUCUN COMPTE n'existe (test_comptes).
  **✅ ÉTAPE 3 FAITE (version 2026.10.15-1659, « go » de Bryan)** : voir AGENTS.md
  « Comptes » (Étape 3). test_ui_connexion étendu (créer, mot de passe d'un autre /
  le sien avec envoi réel, retirer / remettre le code, retirer un compte) ; audit :
  état 25 « Code & comptes », rien à signaler. Restes pour l'étape 4 : fonctions
  serveur des tablettes (appairerTablette, listerTablettes, retirer…, TABLETTES),
  `exigerTablette_` à renommer, création du code avec activation dans le verrou
  (appelant sans compte), test_tablettes / test_lot2 (parties tablettes), docs.
  **✅ ÉTAPE 4 FAITE (version 2026.10.15-1725, « go » de Bryan)** : voir AGENTS.md « Comptes »
  (Étape 4). 40 séries (test_tablettes retiré, contrôles repris dans test_comptes).
  INSTALLATION.md (« Qui fait quoi », étapes 2-5, « Bon à savoir ») réécrit pour les
  comptes ; DEPLOIEMENT.md inchangé (bandeau « ne pas suivre », réécriture prévue).
  Essai de Bryan sur le Sheet de test : le code responsable n'a PAS été demandé à la
  1re installation (normal : un code existait déjà, gardé). « go » de Bryan ⇒ version
  2026.10.15-2028 : dans ce cas, « Un code responsable existe déjà » → Garder / Choisir un
  autre code / Ne plus demander de code (jeton responsable renvoyé par premierCompte).
  Question de Bryan sur la sécurité des infos de compte (trajet, autres moments) :
  réponse donnée (HTTPS ; mot de passe vu par Google seulement ; empreinte dans les
  propriétés lisibles par les éditeurs ; session dans le navigateur ≤ 3 h ; trousseau
  et synchro iCloud ; pas de « déconnecter partout » sauf changer le mot de passe).
  Puis Bryan : « est-ce réellement sûr ? » → Claude reconnaît 2 faiblesses : (1) le
  pouvoir passait des éditeurs au DÉTENTEUR du code d'activation (fuite ⇒ remplacer le
  code sans le connaître) ; (2) le jeton remis ouvrait TOUT l'espace 10 min (plus que
  annoncé). Option A choisie (« go ») ⇒ version 2026.10.15-2224 : plus de jeton à la 1re
  installation ; code d'avant seulement SIGNALÉ (« Continuer ») ; le changer demande ce
  code ; inconnu : panneau du Sheet. Leçon (7) : annoncer EXACTEMENT ce qu'un
  raccourci de sécurité permet (ici « changer le code » cachait « tout l'espace »).
- **Corrections déjà faites à cette occasion (14/10)** : erreur passagère de lecture
  de la liste ≠ « non autorisé » ; clé jamais effacée sur un refus ; remplacement
  sous le même nom (voir historique §0).

## 0. Refonte graphique « Comptoir » : FAITE sur `design` (historique et décisions)
**Décidé avec Bryan (13/10)**, à partir du prototype interactif :
- Prototype : **`docs/maquettes/comptoir-prototype.html`** (source versionnée, page
  autonome, données fictives) ; publié en artefact privé « Comptoir — prototype »
  https://claude.ai/artifact/FUmo7ZsUu5iDgi9YCow3dT (v4). C'est LA référence visuelle
  et de comportement.
- **Clair uniquement** (pas de sombre). Police système, icônes SVG intégrées (plus
  d'emojis), pas de bibliothèque ni police externe (tablettes).
- **Tablette en paysage** = format de référence. Écran de saisie : en-tête (marque,
  puce « Offre en cours · dates · jour n sur N », puce du mode, aide, réglages) ;
  saisie en **3 étapes numérotées** (1 Pièce d'identité — grand champ chiffres
  espacés + verdict en direct sous le champ ; 2 Client — nom | prénom ; 3 Chèque —
  montant € | note) ; bouton « Enregistrer le chèque » (Entrée).
- **Journal du jour** (fonction nouvelle) à droite : FERMÉ par défaut, languette
  « Aujourd'hui » + compteur (animé à chaque saisie), flèche ouvrir / replier, état
  mémorisé PAR TABLETTE (localStorage, try/catch) ; totaux (chèques, montant, forcés) ;
  lignes : heure, NOM + initiale du prénom, N° masqué ••••1234, **montant affiché**
  (décision), badge « Forcé · A/B/C » ; en pied, lien texte **« Imprimer la journée → »**.
  Sous le voile pendant une alerte.
- **Alerte = comparaison côte à côte** « Maintenant » / « Déjà enregistré · date »,
  chaque champ marqué IDENTIQUE / DIFFÉRENT ; titres : A « Ce client est déjà venu »
  (fraude probable), B « Cette pièce appartient à un autre client » (usurpation), C
  « Un client porte déjà ce nom » (homonyme, orange, demander une 2e pièce). Gros
  bouton noir « Ne pas enregistrer » ; lien rouge « Enregistrer quand même… » qui ouvre
  une **confirmation dans la fenêtre** ; en BLOQUANT (A/B) : pas de lien, message
  « refusé ». Couleurs d'alerte jamais adoucies.
- **Espace responsable** : code 6 chiffres, puis menu à gauche (Vue d'ensemble, Saisies,
  Impression, Archives, Réglages, Code & tablettes, Verrouiller) ; **vue d'ensemble
  chiffrée** (fonction nouvelle : chèques, montant total, ajouts forcés, tablettes ;
  offre en cours avec progression + « Clôturer maintenant » confirmé dans la page ;
  interrupteur Signaler / Bloquant ; boutons d'impression).
- **Tablette en hauteur** (tenue à la main) : écran « Tournez la tablette » seulement
  sur écran tactile (`(orientation: portrait) and (pointer: coarse)`), aide verrou de
  rotation iPad / Android, lien « Continuer en hauteur quand même » (sessionStorage,
  jusqu'à la prochaine ouverture) → JAMAIS bloquant ; présentation en hauteur gardée
  en secours (journal sous le formulaire). Saisie et alerte en cours conservées.
- Écrans non maquettés (Impression, Archives, Réglages, Tablettes) : mêmes fonctions
  qu'aujourd'hui, avec le nouveau style.
- Autres maquettes vues puis écartées : A « Clair premium », B « Contraste caisse »,
  C « Couleur de la structure » (réglable), 2 « Nuit » (sombre, maintien 2 s pour
  forcer). Idée gardée en réserve : couleur réglable par structure (C).

**Plan (validé, réalisé)** : nouvelle branche
`design` depuis `refonte` ; une étape = un commit, tests verts, point à Bryan :
(1) palette et icônes (variables CSS, sprite SVG) ; (2) en-tête + saisie en 3 étapes
(garder les `id` existants : les tests UI s'en servent) ; (3) alerte comparative
(les `details` renvoyés par le serveur contiennent déjà nom/prénom/pièce/montant/date)
+ confirmation du forçage dans la fenêtre ; (4) journal du jour (données de la copie
locale `cacheVerif.offre` + saisies en attente ; rien de nouveau côté serveur a priori) ;
(5) espace responsable (menu + vue d'ensemble : chiffres à calculer, côté serveur ou
depuis la copie locale) ; (6) écran « Tournez la tablette » ; (7) autres écrans et
Panneau.html ; captures avant / après de chaque écran. Ne pas oublier : la carte
actuelle déborde sur écran étroit (~420 px : container 100 % + padding sans
box-sizing) → corrigé par la refonte.

**Avancement (branche `design`, « go » de Bryan le 13/10)** :
- ✅ Étape 1 — palette et icônes (version 2026.10.14-0149) : variables CSS dans `:root`
  (Style.html), police du système, `box-sizing: border-box` partout (débordement sur
  écran étroit corrigé ; largeurs max. relevées pour garder la même taille visible),
  `Icones.html` (sprite SVG inclus en tête de Index.html, dans FICHIERS_PAGE,
  version en attribut sur `<svg>`), emojis de l'interface fixe d'Index.html remplacés.
  Couleurs posées par les scripts → `var(--…)`. Captures : `outils/captures.js`.
  RESTENT volontairement en emojis : messages du serveur et titres d'alerte (🛑 ⚠️ ✅,
  étape 3), puces de modes 🟡🔴 et ⏳ (étapes 2 et 5), menu du Sheet 🚀🔑 (Google
  n'affiche pas d'icônes dans un menu ; l'aide y renvoie), Panneau.html (étape 7).
- ✅ Étape 2 — en-tête + saisie en 3 étapes (version 2026.10.14-0200) : en-tête
  `.haut` (marque = NOM_OFFRE `#txtNomOffre` + « Saisie client », puce `#puceOffre`
  « Offre en cours · jj/mm → jj/mm · jour n sur N » / à venir / terminée / aucune,
  puce `#puceMode` mise à jour par `majPuceMode` au démarrage, au changement et à
  chaque rechargement de la copie locale) ; bloc `#horsPeriode` à la place du
  formulaire hors période ; étapes 1 Pièce / 2 Client / 3 Détails (numéros verts
  quand remplis, `majEtapes`) ; ids des champs inchangés, libellés gardés (réglables).
  **Fenêtre « N° déjà enregistré » SUPPRIMÉE → verdict `#verdictPiece` sous le N°**
  (rouge ; orange si passage encore autorisé ; vert « pas encore enregistré » ; effacé
  à la frappe ; réponse serveur tardive ignorée si le N° a changé). Bouton
  « Enregistrer » (`etatBoutonValider`). Textes neutres (« Détails », « Enregistrer »)
  car l'offre est réglable (pas forcément des chèques) — à confirmer par Bryan.
  Écran étroit : en-tête sur 2 lignes, numéros masqués, champs empilés (≤ 480 px).
  Nouveau test : `test_ui_saisie` (31 séries).
  Bryan a dit « go » pour l'étape 3 sans revenir sur ces 3 points (verdict au lieu de
  la fenêtre, textes neutres, pas de raccourci Entrée) → considérés comme acceptés.
- ✅ Étape 3 — alerte comparative (version 2026.10.14-0213) : `#boxConfirmation`
  (avant enregistrement) et `#modalAlerteServeur` (après coup) deviennent la même
  fenêtre `.voile > .comparer` par-dessus le formulaire (qui reste affiché derrière) :
  en-tête rouge (A, B, refus) ou orange (C) avec titre du cas (`TEXTES_CAS`) et, en
  sous-titre, le titre du serveur sans pictogramme (« ALERTE FRAUDE · même nom et même
  pièce ») ; consigne = message du serveur ; une comparaison par ligne trouvée
  (Nom / Prénom / N° : IDENTIQUE ou DIFFÉRENT ; montant, notes) ; « Ne pas
  enregistrer » + lien « Enregistrer quand même… » → confirmation DANS la fenêtre
  (`demanderForcage` / `forcerAjout`) ; BLOQUANT : bandeau « refusé » + « Retour à
  la saisie ». Serveur : `traiterSaisie` renvoie aussi `cas` (comme `forcerSaisie`) ;
  miroir local idem. Réseau / hors période : résumé de la saisie à la place de la
  comparaison, « Réessayer » / « Abandonner ». Aide « Les alertes » réécrite.
  Nouveau test `test_ui_alerte` (32 séries). Les alertes de CORRECTION (espace
  responsable, `#corAlerte`) gardent l'ancien style → étape 5.
- ✅ Étape 4 — journal du jour (version 2026.10.14-0225) : nouveau fichier
  `ScriptJournal.html` (dans FICHIERS_PAGE, inclus avant ScriptActions). Données =
  copie locale `cacheVerif.offre` filtrée sur la date du jour (« jj/mm/aaaa » en tête
  de `date`) + saisies en attente (`entreeCache` porte maintenant `enAttente`,
  `heure`, `forcee`, `ecrite`). Redessiné à chaque ajout / confirmation / retrait /
  rechargement (`dessinerJournal`). Toutes tablettes, sans requête en plus : les
  saisies des autres tablettes arrivent au prochain rechargement de la copie (nouveau
  client, ouverture du journal, retour sur la page) — PAS d'interrogation périodique
  (quotas / poids de la copie avec l'annuaire). Replié par défaut, état dans
  localStorage `cdJournal` (« ouvert » / « ferme ») ; masqué hors période. Totaux
  saisies / total / forcées ; lignes heure, NOM + initiale, N° ••••1234, montant,
  badge « Forcé · A/B/C » (lu dans les notes ; « Forcé » seul en attente) ;
  « Imprimer la journée → » = preparerImpression jour. Mise en page paysage :
  `.app` à hauteur d'écran (100dvh), saisie et journal défilent chacun ; ≤ 860 px :
  défilement normal, journal sous la saisie. Nouveau test `test_ui_journal` (33).
- ✅ Copie locale allégée (version 2026.10.14-0918, discuté avec Bryan) : l'annuaire
  (clients des offres passées, ~100-170 Ko après quelques années, sert SEULEMENT au
  pré-remplissage ; la détection A/B/C n'utilise que l'offre en cours) est envoyé au
  démarrage puis au plus 1 fois / heure (`chargerCacheVerif(cle, sansAnnuaire)` →
  `annuaire: null`, la tablette garde le sien : `appliquerCopie`, `annuaireRecuA`).
  « Compléter » l'annuaire (deltas via DerniereVue) écarté : les suppressions (purge,
  reconstruction) ne laissent pas de trace, gain nul (l'annuaire utile ne bouge pas
  pendant l'offre). Tests : test_tablettes + `test_ui_copie` (34 séries).
  Journal : il se sert de la copie de détection, rechargée à chaque client /
  ouverture du journal / retour sur la page. Les « 2 minutes » = âge max. pour que la
  tablette DÉCIDE seule (sinon elle attend le serveur), PAS une fréquence de
  rechargement. Minuteur du journal (recharger la copie toutes les 2 min quand le
  journal est ouvert) : proposé, NON décidé par Bryan.
  Idée notée pour plus tard : annuaire à la demande (nom demandé au serveur au N°
  tapé) → plus de 3 ans de clients en mémoire dans chaque tablette (RGPD), mais
  pré-remplissage ~1 s plus tard et impossible hors réseau.
- ✅ Étape 5 — espace responsable (version 2026.10.14-0940) : `#modalParametres` =
  écran plein `.admin` (en-tête, menu `#railAdmin` à gauche, `#contenuAdmin`).
  Verrouillé : carte « Code responsable » (`#zoneVerrou`) + vue « Imprimer · sans code »
  (impression TOUJOURS libre, décision d'origine conservée), pas de menu.
  Déverrouillé : menu Vue d'ensemble / Saisies / Impression / Archives / Réglages /
  Code & tablettes / Verrouiller ; `allerEcran(nom)` (une vue `.sous-ecran` à la fois,
  `aria-current` dans le menu). Vue d'ensemble : chiffres du SERVEUR
  (`getInfosAdmin().chiffres` = `chiffresOffre_` dans Saisie.gs : saisies, total
  — `nombreMontant_`, illisible = 0 —, ajouts forcés lus dans les notes, tablettes),
  bloc Offre (dates + barre d'avancement + « clôture automatique dans la nuit du… »,
  dates modifiables, « Clôturer maintenant » → confirmation DANS la page, plus de
  confirm()), interrupteur Signaler / Bloquant (`choisirMode`), bouton
  pré-remplissage, Imprimer. Anciens écrans Opération / Sécurité fusionnés dans la
  vue d'ensemble. Saisies en lignes (Corriger / Supprimer ; suppression et retraits
  de tablettes confirmés d'un 2e appui `confirmerEnDeuxTemps`, plus de confirm()) ;
  alerte de correction = même comparaison que la saisie. Aide mise à jour (plus de
  « tuiles »). Classes CSS mortes retirées ; règles « écran étroit » déplacées en fin
  de Style.html (sinon écrasées). Nouveau test `test_chiffres` (35 séries).
  Restent avec confirm()/alert() natifs : message de fin de clôture (alert),
  fenêtre de l'appairage. Écran étroit : menu horizontal défilant.
- ✅ Étape 5 bis (version 2026.10.14-0955) — désaccord de Bryan sur la fusion Opération /
  Sécurité ; maquette des 2 idées (artefact « Variantes espace responsable »
  https://claude.ai/artifact/KYMZHUvrqEXs4xKhti4zzp) ; Bryan choisit l'IDÉE 2 :
  Vue d'ensemble EN LECTURE SEULE (chiffres, résumé de l'offre, mode affiché en puce
  `#puceModeAdmin`, liens « Modifier → », impression) ; écrans « Opération » (dates +
  clôture confirmée) et « Sécurité » (interrupteur Signaler / Bloquant + bloc
  « Anciens clients » `#blocAnnuaire` pour le pré-remplissage) revenus dans le menu.
  Résumé de l'offre en classes `.resume-offre` / `.note-offre` / `.barre-offre`
  (présent dans les deux écrans). Leçon : ne pas fusionner/réorganiser des écrans
  sans le faire valider (ce n'est pas que du style).
- ✅ Étape 6 — « Tournez la tablette » (version 2026.10.14-1001) : `#ecranTourner` (z-index 2500,
  par-dessus saisie / alertes / espace responsable, qui restent en place dessous),
  affiché seulement si `(orientation: portrait) and (pointer: coarse)` (jamais sur
  ordinateur) ; aide verrou de rotation iPad / Android ; « Continuer en hauteur quand
  même » (`continuerEnHauteur`, sessionStorage `cdEnHauteur`, en mémoire si refusé).
  La présentation en hauteur reste utilisable. `tests/navigateur.js` : option
  `page` (isMobile, hasTouch, viewport). Test `test_ui_tourner` (36 séries).
- ✅ Étape 7 — autres écrans (version 2026.10.14-1015) : plus AUCUNE fenêtre native
  du navigateur sur la tablette : `afficherToast(texte, type)` (ScriptAlertes, message
  bref en bas, rouge si erreur) pour impression impossible / erreurs serveur ;
  date de fin déjà passée → second appui sur `#btnMajDates` ; résultat de clôture
  affiché dans l'écran Opération (l'espace reste ouvert). Fenêtres (aide, mentions,
  client connu) restylées ; écran d'autorisation restylé et OPAQUE (testé) ;
  `afficherMessage` : icône + texte sans pictogramme (`sansPicto`). Aide : pastilles
  de couleur au lieu de 🟡🔴. Panneau.html (Sheet, 300 px) réécrit : palette
  Comptoir, sections, message en haut (`#msgPanneau`), confirmations par second
  appui (clôture, réinitialisation du code, retrait des tablettes), plus de
  alert()/confirm(). Emojis restants VOLONTAIRES : menu du Sheet (🚀 APPLICATION,
  🔑, 🧰…) et leurs mentions dans les textes, « ⏳ n saisie en cours d'envoi »,
  notes écrites dans le Sheet (⚠️ Ajout forcé, ℹ️ Passage), messages du serveur
  (retirés à l'affichage), OCR dormant. Tests : test_ui_cloture (37 séries).

- Correctifs d'affichage (version 2026.10.14-1035) après « beaucoup de bugs
  d'affichage » signalés par Bryan sur le site réel (SANS captures ni modèle de
  tablette) : outil `outils/audit.js` (`npm run verifier-affichage`, 9 tailles × 27
  états, rapport + captures). LEÇON : le banc de test n'avait pas la balise viewport
  que doGet ajoute (addMetaTag) → en émulation tactile la page s'affichait en 980 px ;
  ajoutée dans tests/navigateur.js. Corrigé : message bref (largeur), en-tête
  téléphone (titre « … », boutons sur une ligne), titre des fenêtres sous la croix,
  liste des saisies en écran étroit, mentions non justifiées, menu horizontal qui
  suit l'entrée active, totaux « 12 605,57 € » (`formaterTotal`, affichage seul ;
  formaterMontant reste le format écrit dans le Sheet), KPI moins grands.
  Compatibilité anciens Safari (avant iOS 14.5) : `inset` remplacé ; repli pour
  `gap` des boîtes flex (`@supports not (aspect-ratio…)` → marges). JS vérifié ES2015.
  NON vérifiable ici : vrai Safari (seul Chromium installé), vraie page Apps Script
  (iframe, bandeau Google). En attente : captures + appareil/navigateur de Bryan.

- Captures de Bryan (Mac, navigateur Safari probable, bandeau Google visible) : carte
  « Code responsable » collée à gauche → CAUSE : le script mettait `display: block`
  sur `#zoneVerrou` (grille `.verrou`) ; Chromium récent centre quand même (alignement
  en bloc), Safari non. Corrigé (version 2026.10.14-1053) : display "" + `margin: 0 auto`.
  L'audit vérifie maintenant tout display écrit par script qui écrase une grille /
  un flex (le contrôle détecte bien l'ancien bug) ; taille « grand-ecran » 2000 px.
  Messages de liste alignés à gauche. Capture « Saisies : ⏳ Chargement… » prise sur
  une version ANTÉRIEURE (⏳ retiré depuis) : à revérifier par Bryan après mise à jour.
- Appareils (version 2026.10.14-1141, décision Bryan) : NOM OBLIGATOIRE ET UNIQUE à
  l'autorisation (`appairerTablette` : comparaison `_normId_`, vérifiée APRÈS le code
  pour ne pas dévoiler les noms ; champ vide avec exemple, plus de « Tablette
  caisse » par défaut ; contrôle aussi côté page). Doublons existants laissés tels
  quels. « tablette » → « appareil » dans TOUS les textes affichés (menu Code &
  appareils, Autoriser cet appareil, (cet appareil), Retirer tous les appareils,
  aide, mentions, messages serveur, panneau du Sheet) SAUF « Tournez la tablette ».
  Noms internes INCHANGÉS (CLE_TABLETTE, propriété TABLETTES, sel « tablette: » de
  l'empreinte de clé, code d'erreur TABLETTE_NON_AUTORISEE) : rien à migrer.
- Préchargement de l'espace responsable (version 2026.10.14-1303, décision Bryan) : dès le
  déverrouillage, `prechargerListesAdmin()` lance listerSaisies / listerArchives (noms
  seulement ; le contenu d'une archive reste chargé à l'impression) / listerTablettes.
  À l'ouverture d'un écran (`afficherListeAdmin`) : liste reçue affichée tout de suite
  (« · mise à jour… ») puis rechargée ; si le préchargement est en route, on l'attend
  (pas de second appel). Après une modification : appel forcé, seule la réponse la
  plus récente compte (`seq`). Au verrouillage : `listesAdmin` vidé et listes effacées
  de la page. Préchargement AVANT le code impossible (données protégées par le code).
  Test `test_ui_prechargement` (38 séries).
- Aperçu de l'espace responsable (version 2026.10.14-1344, décision Bryan après
  discussion) : constat partagé avec Bryan → le code protège surtout les ACTIONS ; en
  lecture, un appareil autorisé a déjà sans code toutes les saisies de l'offre
  (copie de détection, impression libre de « Toute l'offre », que Bryan GARDE libre),
  l'annuaire, les réglages. Donc : `apercuResponsable(cle)` (Securite.gs,
  `exigerTablette_`) renvoie mode, dates, réglages, chiffres, saisies
  (`listeSaisies_`), NOMS des archives (`listeArchives_`), appareils
  (`listeTablettes_` : nom, dates, id au hasard ; ni clé ni empreinte). Restent derrière
  le code : contenu des archives (`donneesArchive`), codes faux tapés
  (`essaisInconnus`), recréation des robots (getInfosAdmin), toutes les actions.
  Page : `preparerApercuAdmin()` dans `afficherZoneVerrou` (appui sur ⚙️ ou reverrou
  espace ouvert) ; RIEN n'est affiché avant que le serveur accepte le code ; au
  déverrouillage `utiliserApercuAdmin()` remplit les listes (`listesAdmin`) et la vue
  d'ensemble (`appliquerInfosAdmin`, sans alertes), puis getInfosAdmin + listes
  rechargées comme avant. Aperçu arrivé après le code : ignoré ; oublié à la
  fermeture / au verrouillage (`seqApercu`). `afficherListeAdmin` dessine la liste
  connue même si un rechargement est en route. Réglages modifiés pendant le
  rechargement : gardés (`reglagesModifies`). Chiffrer les données avant le code :
  écarté (6 chiffres = essais hors ligne sans limite ; n'aurait rien protégé de
  plus). Tests : test_tablettes (refus sans clé, rien de la sécurité, aucun robot
  recréé), `test_ui_apercu` (39 séries ; vérifié qu'il échoue sans l'aperçu).
- Résumés des archives (version 2026.10.14-1359, décision Bryan) : au lieu de
  précharger le contenu des n dernières offres, un RÉSUMÉ par offre passée, TOUS
  préchargés dans l'aperçu (~100 octets chacun, ≤ 3 ans d'archives, aucune donnée
  personnelle) : dates de l'offre (réglées ; pour une archive d'avant : 1re et
  dernière saisie), nombre de saisies, montant total (illisible = 0). PAS de nom
  d'offre (NOM_OFFRE est un réglage fixe de la structure, pas un nom par offre — erreur
  de Claude corrigée par Bryan) ; PAS d'ajouts forcés (Bryan n'en voit pas l'intérêt).
  Archives.gs : `calculerResumeArchive_`, `jourDeSaisie_`, propriété
  `RESUME_<onglet>` écrite à la clôture AVANT la création de l'onglet (une liste lue
  entre-temps ne voit jamais l'archive sans résumé ; échec = clôture quand même) ;
  `listeArchives_` calcule et garde le résumé manquant ; `purgerArchives_` efface
  les résumés sans onglet. Écran Archives : « Du 01/12 au 24/12/2025 · 342 saisies ·
  51 230 € » (`texteResumeArchive`) ; titre d'impression inchangé (« Clôturée le… »).
  Limite connue : sur téléphone, la liste fermée coupe le montant (lisible une fois
  ouverte) ; ligne de résumé sous la liste proposée, non faite. Tests :
  `test_resume_archives` (40 séries), test_ui_archives adapté.
- Clé d'appareil (version 2026.10.14-1459, « go » de Bryan) : DÉFAUT trouvé —
  `lireTablettes_` renvoyait [] sur toute erreur, donc un incident passager de Google
  ⇒ « TABLETTE_NON_AUTORISEE » ⇒ la page effaçait la clé (perte définitive) ; pire :
  une autorisation / un retrait pendant l'incident réécrivait la liste et perdait
  TOUS les appareils. Corrigé : l'erreur de lecture remonte (seul un JSON illisible
  donne []) ; `siNonAutorisee` n'efface plus la clé (seuls les retraits volontaires,
  `oublierTablette`) ; diagnostic (raison + adresse technique `location.hostname`)
  affiché un temps puis RETIRÉ (2026.10.14-1653, demande de Bryan). Tests : test_tablettes (vérifié qu'il échoue sur l'ancien
  code), test_ui_tablettes (clé gardée sur refus, remplacée à la réautorisation,
  incident passager sans écran d'autorisation).
- Remplacement sous le même nom (version 2026.10.14-1645, « go » de Bryan ; il hésitait
  avec « demander à l'utilisateur » → Claude a choisi les deux : remplacement
  proposé, jamais automatique). Code juste + nom pris : réponse `nomPris` (message
  avec date d'autorisation et dernière utilisation de l'ancien) ; bouton rouge
  « Remplacer « nom » » sous le message (`#btnRemplacerAppareil`, même action avec
  `data-args="[true]"`), code gardé dans le champ ; nom modifié → proposition
  retirée. Serveur : `appairerTablette(pin, nom, remplacer)` retire l'ancienne entrée
  (+ TABLETTE_VUE_ / PIN_ESSAIS_T_), possible même liste pleine ; code faux → rien.
  Un code juste remet le compteur d'essais à zéro : pas de pause de 10 s avant la
  confirmation. Tests : test_tablettes, test_ui_tablettes.
- Retraits demandés par Bryan (version 2026.10.14-1653) : phrase « Noms abrégés et N°
  masqués : l'écran peut être vu depuis la caisse. » du pied du journal (la règle
  reste : noms abrégés, N° masqués) ; diagnostic de l'écran d'autorisation et de
  « Code & appareils » (code, styles `.diag-appareil` et assertions supprimés).
**REFONTE GRAPHIQUE TERMINÉE (7 étapes + 5 bis) sur `design`.** En attente de Bryan :
essai sur le Sheet de test (git checkout design, npm run push, Installer, déploiement)
puis sur tablette réelle : rotation, clavier, journal, alertes, espace responsable,
panneau du Sheet. Ensuite seulement : fusion `design` → `refonte` (ou autre), sur
demande ; puis la documentation (docs/A_REDIGER.md, captures à refaire avec
outils/captures.js).

**Tranché par Bryan (13/10, après relecture du plan)** : journal = chèques de TOUTES
les tablettes (copie locale, décalage ≤ 2 min pour les autres tablettes). Pas de modèle
de tablette unique (plusieurs magasins, plusieurs modèles) → mise en page adaptée à
toute taille, aide de rotation générique iPad / Android. Choix techniques laissés à
Claude : chiffres de la vue d'ensemble calculés par le serveur depuis « Saisies » ;
numéro de version renouvelé par Claude à chaque étape poussée (Bryan n'a qu'à faire
`git pull` + `npm run push`). (« go » donné, `design` créée et terminée.)
« Installer » sur le Sheet REFONTE (test) en 2026.10.13-2 : ✅ OK (Bryan, 13/10).

## 0 bis. Refonte du code (branche `refonte`) — FAITE (étapes 1 à 6), étape 7 reportée
But : maintenabilité sans changement de comportement. 30 séries de tests (`npm test`),
`npm run lint` 0 erreur 0 avertissement. Résumé et pièges :
1. **Outillage** : `package.json` (`npm test`, `lint`, `format`, `nouvelle-version`,
   `verifier-version`, `push` = vérif + `clasp push`, `status`), ESLint (globales
   par fichier → signale un nom déclaré dans deux fichiers), Prettier (tout sauf
   Index.html, virgules « es5 »), `.claspignore` en **liste blanche** (l'ancien aurait
   envoyé `node_modules`), `.clasp.json.exemple`, dossier `outils/`.
2. **Constantes** : `COL` (getRange, A = 1) / `IDX` (getValues, A = 0), `FEUILLE_SAISIES`,
   `CELLULE_MODE`… (test_constantes). Vu, NON corrigé : `verifierPiece` renvoie Z1 brut
   au lieu de `modeSecurite_` (cosmétique).
3. **Serveur en 11 .gs** (00_Constantes, Application, Reglages, Installation, Securite,
   Saisie, Detection, Annuaire, Archives, Robots, Sheet) ; code identique vérifié ;
   test_fichiers (pas de nom en double, que des déclarations, ordre indifférent).
4. **Page** : Index.html squelette + `include_` (Application.gs) de Style.html et
   Script*.html (Tablette, Saisie, Alertes, Impression, Offre, Formulaire, Responsable,
   Actions, Ocr) ; tests : `rendrePage()`, `tests/declarations.js` (espree).
5. **Modernisation** : Prettier ; `const`/`let` (⚠️ plus propriétés de l'objet global :
   tests via `valeurGlobale()`, nouvel onglet pour un 2e rendu) ; boutons
   `data-action` + liste `ACTIONS` (ScriptActions.html, Panneau.html) ; `style="…"` →
   classes (seuls les `display: none` restent ; style calculé identique vérifié) ;
   commentaires nettoyés.
6. **Contrôle de version** : `function version_<Nom>_()` dans chaque .gs, attribut
   `data-version` dans chaque .html ; `verifierInstallation_()` → page « Installation
   incomplète » (panne du contrôle = app ouverte quand même) ; « Installer » affiche
   les problèmes et la version. ⚠️ CONSTATÉ SUR UN VRAI SHEET : Apps Script RETIRE les
   commentaires `<!-- -->` en relisant un fichier (1re version bloquait à tort, corrigé
   en 2026.10.13-2). Un ancien Code.gs laissé à côté → Google refuse de charger le
   projet (doublons de const).
7. **Docs reportées** (décision Bryan) : rédaction quand l'app sera finie ; idées dans
   `docs/A_REDIGER.md` (+ notes clasp brutes en service) ; seuls tenus à jour : bandeau
   « ne pas suivre » de DEPLOIEMENT.md et carte des fichiers d'AGENTS.md.
Plus tard : fusion `refonte` → `generalisation` (ou `main` après Vannes), seulement
quand Bryan le demande.

## 1. Où on en est
- **`generalisation`** (créée depuis `main`, poussée) : version complète et testée en
  simulation, **base du déploiement à Vannes**. `main` et la prod de Vannes **non
  touchées**. Aucune pull request ouverte.
- **Audit complet d'octobre** (4 analyses) puis **lots 1, 2 et 3** faits et poussés
  (voir §2 points 10-11 et AGENTS.md).
- **Rien n'a encore été testé sur un vrai Google Sheet** : uniquement en simulation
  (`tests/`, toutes les séries vertes). Prochaines étapes côté Bryan : test sur une
  copie, puis migration de Vannes avec la **liste à cocher de `DEPLOIEMENT.md`**.
- Discussions closes récemment : licence (« non exclusive, non cessible, révocable…
  dans les conditions convenues par écrit » ; nom de la structure conservé ; mentions
  sans gras) ; propriété du logiciel (Bryan employé polyvalent, idée personnelle →
  conseillé : vérifier son contrat, garder les preuves GitHub, accord écrit avec la
  société exploitante) ; conventions de code (évaluées : bonnes sur sécurité/Apps Script,
  datées sur la forme → d'où la refonte).

## 2. Ce qui a été fait (dans l'ordre, voir `git log main..generalisation`)
1. **Généralisation** : réglages de la structure (`getConfig`/`setConfig`, défauts = Vannes),
   textes réglables (template `doGet`), impression calculée depuis « Saisies », espace
   responsable à code PIN, archives, correction/suppression de saisies (recontrôle A/B/C),
   `installer()` idempotent, distribution par **modèle à copier** (lien `/copy`, menu
   « 🧰 Installer », détection de copie `ID_CLASSEUR` qui efface les réglages hérités).
2. **Panneau ⚙️ en tuiles** (option 2 choisie par Bryan sur maquette) : Saisies, Archives,
   Opération, Sécurité, Réglages, Code & tablettes ; Clôturer / Verrouiller à part.
   Bouton « Ouvrir Google Sheets » retiré.
3. **`forcerSaisie` recontrôle côté serveur** (ne fait plus confiance à la tablette).
4. **Analyse globale** (23 points) + **contre-analyse** (tous reproduits par tests), puis
   corrections :
   - #1 **N° de pièce commençant par 0** (Sheets convertit en nombre — **confirmé par
     Bryan sur sa copie**) : écriture en texte (`texte_`, apostrophe) + comparaison sans
     0 initiaux (`_normPiece_` / `normPieceJS`). Protège aussi des formules « = ».
   - #2 doublon immédiat invisible (saisies en attente `saisiesEnAttente`, avec **rang**),
     #3 message coupé (minuteur unique + **fenêtre d'alerte** `modalAlerteServeur`),
     #4 saisie hors période (`controlerPeriode_` serveur + revérif tablette).
   - #7 accents/apostrophes/ligatures (`_normId_` / `normIdJS`), #8 annuaire non écrasé
     par une usurpation forcée, #9 marquages recalculés (`recalculerMarquages_` : seule la
     ligne qui double une ligne **plus ancienne** est marquée), #11 panneau (clôture ne
     rebascule plus en BLOQUANT), #16 injection HTML (`echapper`), #17 montant
     (`lireMontant`, format « 1234,50 € »), #23 plus de pré-remplissage depuis un doublon
     de l'offre (revient sur le commit 8bae95e ; l'annuaire des offres passées pré-remplit
     toujours).
   - Mineurs : #13 nom d'archive unique, #14 pas d'archive vide, #15 dates contrôlées,
     #19 `reconstruireAnnuaire` réservée aux éditeurs, #20 saisie incomplète refusée côté
     serveur, #22 purge sous verrou. #10 `onEdit` contrôle chaque ligne d'un collage.
   - Clos : #12. Accepté : #18 (annuaire ~170 Ko téléchargé par saisie après 3 ans).
5. **Sécurité** :
   - #5 (décision Bryan) : **le manager de caisse détient le Sheet** (idéalement compte
     Google du magasin), ne transmet que le lien `/exec`, ne se connecte jamais sur une
     tablette de caisse. Documenté dans `INSTALLATION.md` (« Qui fait quoi »).
   - #6 : **tablettes autorisées (appairage)** — clé en `localStorage` (`cdTabletteCle`),
     empreinte serveur (`TABLETTES`), `exigerTablette_(cle)` sur toutes les fonctions de
     la tablette ; tuile « 🔑 Code & tablettes » (liste, retrait) ; accès déploiement
     **« Tout le monde »** (`ANYONE_ANONYMOUS`, plus de compte Google sur la tablette).
     Après réinitialisation du code, seule une tablette autorisée peut le recréer.
   - **Code responsable : exactement 6 chiffres** ; **pause serveur 10 s** après un code
     faux (idée de Bryan ; compteur global — le serveur ne peut pas identifier
     l'appareil) ; blocage 15 min après 5 erreurs, jamais plus long.
6. **Passages autorisés par client et par offre** (réglage `PASSAGES_MAX`, 1–10, défaut
   1) : même client (nom + pièce) accepté jusqu'à N fois, noté « ℹ️ Passage k/N » ; au-delà
   cas A. **B et C toujours signalés.** Changer le réglage recalcule les marquages.
7. **Démarrage plus rapide** (signalé par Bryan : la saisie s'affichait puis laissait place
   à « aucune opération ») : dates injectées dans la page, formulaire masqué par défaut,
   un seul appel `demarrage(cle)`, cache chargé seulement si l'offre est en cours.
8. **Aide ❓ en tuiles** (option B choisie sur maquette) : 2 groupes « 👤 Pour la saisie »
   (Saisir, Alertes, Vérification du N°, Imprimer, + Scan si OCR actif) et « 🔒 Pour le
   responsable » (fond jaune : Modes, Code & tablettes, Dates & clôture, Corrections &
   archives) ; une rubrique par écran (`allerAide`) ; texte relu (vrais titres d'alerte et
   boutons, vouvoiement). Accordéon supprimé. Le code responsable reste vérifié **côté
   serveur** (discuté : empreinte d'un code à 6 chiffres cassable, pause/blocage
   contournables côté tablette).
9. **Mentions légales** à jour (données dans le Sheet de l'établissement, tablettes
   autorisées, clé technique, établissement responsable du traitement), sans gras ;
   licence « non exclusive, non cessible et révocable », « dans les conditions convenues
   par écrit avec l'auteur », nom de la structure (réglage) conservé ; les données restent
   à l'établissement (décisions Bryan). **Purge des archives 3 ans après clôture**
   (décision Bryan, RGPD) : `purgerArchives_` lancée chaque nuit par
   `verificationClotureNocturne` ; onglet au nom non reconnu jamais supprimé.

10. **Audit complet (4 analyses parallèles) puis lot 1 de corrections** (validé par Bryan) :
    code d'activation (création du code responsable), compteurs de codes faux séparés,
    jeton lié à la tablette, copie locale ≤ 2 min (✅ immédiat gardé, sinon attente du
    serveur), indicateur « en cours d'envoi » + avertissement à la fermeture, saisie en
    échec retirée de la copie + RÉESSAYER, encadré de doublon protégé, pré-remplissage
    sélectionné, réglages envoyés à chaque rechargement, robots de nuit recréés/signalés,
    fonctions sensibles réservées, montant protégé, URL du Sheet plus envoyée, mode
    conservé à la clôture (décision b). Restent : **lot 2** (🟠 de l'audit : onEdit en
    BLOQUANT qui efface une cellule, normalisation N°/noms, annuaire et usurpateur,
    fuseau horaire, notes-dates, 20 tablettes, petits défauts d'écran) et **lot 3**
    (docs + liste de déploiement Vannes : archiver les autres déploiements, vérifier les
    déclencheurs, `backupQuotidien`, onglet `Logs`/sauvegardes CSV à nettoyer — RGPD).
11. **Lots 2 et 3 faits** : voir AGENTS.md (« Lot 2 de l'audit ») et la liste à cocher
    Vannes dans DEPLOIEMENT.md. Non faits volontairement : tri de la feuille (la
    chronologie suit l'ordre des lignes), annuaire laissé tel quel après correction ou
    suppression d'une ligne, nom par défaut des tablettes.

## 3. À vérifier sur un vrai Google Sheet (la simulation ne peut pas le garantir)
1. (Comptes) Le navigateur **propose le compte enregistré** (trousseau / gestionnaire de
   mots de passe) à l'écran de connexion, y compris après l'avoir complètement fermé ;
   la session tient jusqu'à 3 h du matin. (Remplace l'ancienne « clé d'appareil ».)
2. L'accès **« Tout le monde »** fonctionne sans compte Google (et `google.script.run`).
3. Le **panneau du Sheet** (mode, dates, clôture, réinitialiser le code) marche pour un
   éditeur (`estEditeurDuClasseur_` repose sur `Session.getActiveUser()`).
4. Ce que Google **recopie** lors d'une copie du modèle (propriétés du document).
5. `installer()` crée bien les déclencheurs (nuit 1h clôture, 3h purge).
   À Vannes : ✅ les anciens onglets d'archives ont le bon format (ex.
   `Archives_26-02-2026_00-44`, confirmé par Bryan le 14/10) → purgés après 3 ans
   avec leur résumé ; résumé = dates de la 1re et de la dernière saisie.
6. Parcours complet : autorisation, saisie, doublons, passages, correction, impression,
   archives, clôture.
7. Le robot de nuit passe la vérification `triggerUid` (sinon l'espace responsable
   affichera « robot n'a pas fonctionné depuis… » après 36 h) ; `Session.getActiveUser`
   renvoie bien l'e-mail dans le menu du Sheet (sinon « Installer » est refusé).
8. (Refonte) `include_` : la page s'affiche complète (styles, scripts, scan OCR en
   `<script type="module">`) — `createHtmlOutputFromFile(nom).getContent()`.
9. (Refonte) Contrôle de version : ✅ `globalThis["version_X_"]` voit bien les .gs
   (testé par Bryan sur « Gestion Chèques Différés — REFONTE (test) », 13/10) ; les
   commentaires HTML sont retirés par `getContent` (constaté) → marque en attribut
   `data-version` depuis 2026.10.13-2 : ✅ vérifié par Bryan (« Installer » OK, 13/10).
10. (Design) Affichage sous Safari (Mac, iPad) et dans la vraie page (iframe, bandeau
   Google) : seul Chromium est testé ici. Espace responsable : les listes
   préchargées au déverrouillage arrivent bien (appels serveur en parallèle) et
   « Saisies : Chargement… » ne reste plus bloqué.
   Aperçu : après le code, vue d'ensemble / saisies / réglages visibles sans attente.
11. (Comptes) À Vannes, sur chaque type d'appareil (PC Windows, tablette Android) et
   avec son navigateur réel : se connecter et enregistrer le mot de passe → fermer
   complètement le navigateur → rouvrir ⇒ le navigateur doit proposer le compte
   (voir §0 ter, problème Safari).

## 4. Points ouverts / idées non faites
- ~~Safari perd l'autorisation~~ : RÉGLÉ par les comptes (15/10). ~~Journal des
  actions~~ : FAIT (16/10). ~~Code par personne~~ : FAIT (codes personnels, 16/10).
- À valider par Bryan : jeton 3 min en codes personnels ; ajouts forcés tracés au
  niveau du compte (un code personnel pour forcer : possible mais lourd en caisse).
- Pull request `generalisation` → `main` : à ouvrir **après** le test de Bryan (il n'a pas
  encore demandé).
- **Nom de l'application** (en pause, à la demande de Bryan) : acronymes retenus CLÉO
  (Contrôle des Limites d'Éligibilité aux Offres), VERA (Vérification des Éligibilités
  et Repérage des Abus), ARGOS (Anti-Récidive et Gestion des Offres Sécurisées ; risque
  avec l'enseigne Argos). Vérification INPI non concluante : data.inpi.fr et TMview
  refusent les robots ; la recherche de Bryan donnait 0 avec filtre de classe (filtre
  douteux). À refaire via « Recherche avancée », nom exact, compteurs par classe.
- Option B de l'analyse #6 (n'envoyer que le nom correspondant au N° au lieu de tout
  l'annuaire) : non faite (#18 accepté).
- Détection « usurpation inter-offres » (pièce d'une offre passée présentée sous un autre
  nom) : jamais faite, idée seulement.
- **Journal du jour** : minuteur (recharger la copie toutes les 2 min quand le journal
  est ouvert, maintenant léger sans l'annuaire) proposé, NON décidé ; aujourd'hui le
  journal se met à jour à chaque client / ouverture / retour sur la page.
- **Annuaire à la demande** (nom demandé au serveur au N° tapé au lieu de l'annuaire
  entier dans chaque tablette) : intéressant pour le RGPD ; pré-remplissage ~1 s plus
  tard et impossible hors réseau. À discuter après la refonte.
- Renommer un compte depuis « Code & comptes » : non fait (on en crée un autre puis on
  retire l'ancien).
- Couleur réglable par structure (maquette C) : idée en réserve.
- Dette assumée : logique A/B/C à **3 endroits** (`detecterDoublons_` pour tout le
  serveur, `recalculerMarquages_`, `analyserDoublonLocal`) — à garder synchro.

## 5. Comment travailler avec Bryan (rappel)
- **Discuter et faire valider avant de coder** ; il répond souvent « go » ; poser les
  questions de conception (il tranche vite et a de bonnes idées, ex. pause de 10 s).
- Honnêteté : dire ce qui n'est **pas** testé, signaler les risques (RGPD, faux négatifs).
- **Faux négatif = pire échec** ; « Saisies » = source de vérité ; le serveur décide.
- Ne jamais toucher `main` / la prod sans accord ; commits clairs en français.
- Rappeler que le déploiement est manuel (clasp : `npm run push` puis « Nouvelle
  version » dans Gérer les déploiements ; `DEPLOIEMENT.md` est pour `main`).
- Envoyer des captures avant / après (SendUserFile) à chaque étape visible ; maquette
  cliquable (artefact) quand une organisation d'écran est à choisir.
- Mettre à jour ce fichier dans le même commit que chaque changement poussé (Bryan
  l'a redemandé après un compactage, 14/10).

## 6. Environnement / outillage
- Tests : `bash tests/lancer.sh` (voir `tests/README.md`). Playwright global
  (`NODE_PATH=$(npm root -g)`), Chromium dans `/opt/pw-browsers`.
- La fausse feuille imite la conversion de Google Sheets ; le contrôle tablette est
  neutralisé par défaut sauf dans `test_tablettes` / `test_ui_tablettes`.
- Réseau de l'environnement : Bryan a ajouté `docs.google.com` et
  `*.googleusercontent.com` (pour lire une **copie anonymisée** de son Sheet, partagée par
  lien — URL volontairement non recopiée ici ; formules : `A_IMPRIMER` = `FILTER` sur
  « Saisies » par jour (Z1), `OFFRE_COMPLETE` = `ARRAYFORMULA(Saisies!A:F)` ; colonne F
  de « Saisies » intitulée « CODE » chez Vannes, libellé retenu « Notes ou Infos »).
- Maquettes du panneau (tuiles vs accordéons) : faites dans l'espace temporaire de la
  session, non conservées (décision prise : tuiles).
- **Outils de la refonte graphique** : `outils/captures.js <dossier>` (captures des
  écrans principaux, 3 formats) ; `npm run verifier-affichage -- <dossier> [taille]`
  (`outils/audit.js` : 10 tailles × 27 états, rapport + captures ; contrôle aussi les
  `display` écrits par script qui écrasent une grille/flex). `tests/navigateur.js` :
  balise viewport ajoutée (comme doGet) et option `page` (isMobile, hasTouch,
  viewport). Seul **Chromium** est installé : Safari et la vraie page Apps Script
  (iframe + bandeau « créée par un utilisateur de Google Apps Script ») ne sont pas
  testables ici → captures de Bryan.
- Artefacts publiés : prototype « Comptoir » https://claude.ai/artifact/FUmo7ZsUu5iDgi9YCow3dT ;
  « Variantes espace responsable » https://claude.ai/artifact/KYMZHUvrqEXs4xKhti4zzp.
