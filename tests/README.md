# Tests hors ligne

Simulation de Google Apps Script / Google Sheets (`harness.js`, `mocks.js`,
`fakesheet.js`) + navigateur Chromium piloté par Playwright (`navigateur.js`) avec un
faux `google.script.run` branché sur le serveur simulé.

- **Lancer** : `bash tests/lancer.sh` (depuis la racine). Prérequis : Node 18+ et
  Playwright installé globalement (`npm i -g playwright`, navigateur Chromium).
- La fausse feuille **imite la conversion automatique de Google Sheets** (un texte
  « 0123 » devient le nombre 123, une apostrophe initiale force le texte).
- Par défaut le contrôle « tablette autorisée » est neutralisé (`exigerTablette_`) et la
  fausse tablette a déjà une clé ; `test_tablettes.js` / `test_ui_tablettes.js` le testent
  pour de vrai (`tabletteReelle`, `sansCle`).
- Limites : ce sont des **simulations**. Les comportements réels de Google (conversion
  des valeurs, e-mail du visiteur, stockage du navigateur dans l'iframe Apps Script) sont
  à vérifier sur une copie du Sheet.
- Ce dossier est **exclu** de l'envoi vers Apps Script (`.claspignore`) : ne jamais le
  copier dans l'éditeur Apps Script.
