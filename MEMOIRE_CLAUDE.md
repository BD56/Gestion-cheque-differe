# Mémoire de travail — Claude (branches `generalisation` et `refonte`)

> Fichier de reprise après compactage du contexte. À lire **avec** `AGENTS.md` (référence
> canonique) et `docs/retours-vibe/decisions/2026-10-11_generalisation.md` (décisions).
> Dernière mise à jour : 2026-10-13.

## 0. ▶️ TÂCHE EN COURS (à reprendre après compactage)
**Refonte du code sur la nouvelle branche `refonte`** (créée depuis `generalisation`,
validée par Bryan : « go pour la branche refonte »). But : maintenabilité, **aucun
changement de comportement**. Bryan utilisera **clasp** (copier-coller plus nécessaire).
Règles : une étape = un commit ; les **26 séries de tests** (`bash tests/lancer.sh`)
vertes à chaque étape (les adapter quand les fichiers bougent : `tests/harness.js`
lit `Code.gs`, `tests/navigateur.js` / `test_rendu.js` lisent `Index.html`) ; faire un
**point à Bryan à la fin de chaque étape** ; ne pas toucher `generalisation` / `main`.
Feuille de route validée :
1. **Outillage** : `package.json` (Prettier, ESLint, `npm test` → lancer.sh), `.clasp.json`
   d'exemple ; tout exclu de l'envoi (`.claspignore`).
2. **Constantes** regroupées : nom de feuille « Saisies » (19 occurrences), cellule du
   mode Z1 (7), numéros de colonnes (2 nom, 3 prénom, 4 N°, 5 montant, 6 notes, 7 G),
   réglages fixes.
3. **Découpage serveur** : `00_Constantes.gs` (lu en premier : les globales s'exécutent
   dans l'ordre des fichiers), `Installation.gs`, `Securite.gs` (code, activation,
   tablettes, jetons), `Saisie.gs`, `Detection.gs` (doublons, normalisation, marquages),
   `Annuaire.gs`, `Archives.gs`, `Robots.gs` (nuit, dates), `Sheet.gs` (onEdit, panneau).
   ⚠️ Deux fonctions de même nom dans deux fichiers = AUCUNE erreur, la dernière gagne.
4. **Découpage page** : `Index.html` = squelette (garde les injections `<?!= … ?>` de
   CONFIG et DATES_INITIALES) + `include()` vers `Style.html` et des scripts par thème
   (`include` doit évaluer les morceaux comme modèles s'ils contiennent des `<? ?>`).
5. **Modernisation** : `const`/`let` (322 `var` dans Code.gs, 199 dans Index.html),
   65 `onclick=` → écouteurs, 84 `style="…"` → classes CSS, commentaires d'époque
   (« NOUVEAU », « LE CORRECTIF ») nettoyés, espaces de fin de ligne.
6. **Contrôle de version intégré** : chaque fichier porte la même version ; au démarrage,
   l'app vérifie que tous les morceaux sont là et à jour, sinon « Installation
   incomplète » (au lieu de tourner à moitié).
7. **Docs** : `DEPLOIEMENT.md` réécrit pour clasp (`clasp push` + redéploiement même URL ;
   copier-coller en secours avec la liste exacte des fichiers et « supprimer l'ancien
   Code.gs ») ; `AGENTS.md` (carte des fichiers) ; marche à suivre clasp sur le Mac
   (`clasp login`, scriptId dans `.clasp.json` — Bryan le fait, pas moi).
Plus tard : fusion `refonte` → `generalisation` (ou `main` après Vannes), seulement
quand Bryan le demande.

## 1. Où on en est
- **`generalisation`** (créée depuis `main`, poussée) : version complète et testée en
  simulation, **base du déploiement à Vannes**. `main` et la prod de Vannes **non
  touchées**. Aucune pull request ouverte.
- **Audit complet d'octobre** (4 analyses) puis **lots 1, 2 et 3** faits et poussés
  (voir §2 points 10-11 et AGENTS.md).
- **Rien n'a encore été testé sur un vrai Google Sheet** : uniquement en simulation
  (`tests/`, 26 séries, toutes vertes). Prochaines étapes côté Bryan : test sur une
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
1. La tablette **garde sa clé** d'un jour à l'autre (localStorage dans l'iframe Apps Script).
2. L'accès **« Tout le monde »** fonctionne sans compte Google (et `google.script.run`).
3. Le **panneau du Sheet** (mode, dates, clôture, réinitialiser le code) marche pour un
   éditeur (`estEditeurDuClasseur_` repose sur `Session.getActiveUser()`).
4. Ce que Google **recopie** lors d'une copie du modèle (propriétés du document).
5. `installer()` crée bien les déclencheurs (nuit 1h clôture, 3h purge).
   À Vannes : vérifier le **nom des anciens onglets d'archives** (seul le format
   `Archives_jj-mm-aaaa_hh-mm` est purgé ; la 1re nuit supprimera ceux de plus de 3 ans).
6. Parcours complet : autorisation, saisie, doublons, passages, correction, impression,
   archives, clôture.
7. Le robot de nuit passe la vérification `triggerUid` (sinon l'espace responsable
   affichera « robot n'a pas fonctionné depuis… » après 36 h) ; `Session.getActiveUser`
   renvoie bien l'e-mail dans le menu du Sheet (sinon « Installer » est refusé).

## 4. Points ouverts / idées non faites
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
- Dette assumée : logique A/B/C à **3 endroits** (`detecterDoublons_` pour tout le
  serveur, `recalculerMarquages_`, `analyserDoublonLocal`) — à garder synchro.

## 5. Comment travailler avec Bryan (rappel)
- **Discuter et faire valider avant de coder** ; il répond souvent « go » ; poser les
  questions de conception (il tranche vite et a de bonnes idées, ex. pause de 10 s).
- Honnêteté : dire ce qui n'est **pas** testé, signaler les risques (RGPD, faux négatifs).
- **Faux négatif = pire échec** ; « Saisies » = source de vérité ; le serveur décide.
- Ne jamais toucher `main` / la prod sans accord ; commits clairs en français.
- Rappeler que le déploiement est manuel (`DEPLOIEMENT.md`).

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
