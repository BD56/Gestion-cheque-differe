# Tests hors ligne

Simulation de Google Apps Script / Google Sheets (`harness.js`, `mocks.js`,
`fakesheet.js`) + navigateur Chromium piloté par Playwright (`navigateur.js`) avec un
faux `google.script.run` branché sur le serveur simulé.

- **Lancer** : `npm test` (ou `bash tests/lancer.sh`), depuis la racine. Prérequis :
  Node 20+, puis une fois `npm install` (installe Playwright et les outils) et
  `npx playwright install chromium` (le navigateur). Un Playwright installé
  globalement fonctionne aussi.
- **Contrôle du code** : `npm run lint` (ESLint). Il signale notamment une fonction
  déclarée dans deux fichiers `.gs` (Apps Script, lui, ne dit rien).
- La fausse feuille **imite la conversion automatique de Google Sheets** (un texte
  « 0123 » devient le nombre 123, une apostrophe initiale force le texte).
- Par défaut le contrôle « tablette autorisée » est neutralisé (`exigerTablette_`) et la
  fausse tablette a déjà une clé ; `test_tablettes.js` / `test_ui_tablettes.js` le testent
  pour de vrai (`tabletteReelle`, `sansCle`).
- Limites : ce sont des **simulations**. Les comportements réels de Google (conversion
  des valeurs, e-mail du visiteur, stockage du navigateur dans l'iframe Apps Script) sont
  à vérifier sur une copie du Sheet.
- `lancer.sh` fixe le fuseau à **Europe/Paris** (celui du projet Apps Script) : les
  dates ne dépendent pas de la machine. La clôture de nuit est testée sur « dernier
  jour » / « lendemain » (`test_lot2.js`).
- Tests par lot de l'audit : `test_ui_lot1.js` (tablette), `test_lot2.js` (serveur),
  `test_ui_lot2.js` (tablette).
- Ce dossier est **exclu** de l'envoi vers Apps Script (`.claspignore`) : ne jamais le
  copier dans l'éditeur Apps Script.
- **Fichiers découpés** : `harness.js` charge tous les `.gs` (ordre alphabétique, une
  seule portée) ; `rendrePage()` produit la page comme `doGet` (Index.html + morceaux
  `Style.html` / `Script*.html` insérés par `include_`). `test_fichiers.js` vérifie
  qu'aucun nom n'est déclaré deux fois et que chaque morceau est inclus une fois.
- **Version** : tous les fichiers envoyés à Apps Script portent le même numéro
  (`npm run nouvelle-version` avant une mise à jour). `test_version.js` simule un
  fichier oublié ou ancien : la tablette doit afficher « Installation incomplète ».
