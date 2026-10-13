// Code serveur découpé en plusieurs .gs (refonte, étape 3) : une seule portée globale.
// - Aucun nom déclaré dans deux fichiers (Apps Script ne dit rien : le dernier lu gagne).
// - Aucun fichier ne dépend de l'ordre de lecture : chargés à l'envers, mêmes valeurs.
const assert = require('assert');
const fs = require('fs'), vm = require('vm');
const { fichiersGs } = require('./harness');
try {
const repo = process.argv[2];
const fichiers = fichiersGs(repo);
assert.ok(fichiers.length > 1 && fichiers[0] === '00_Constantes.gs', '00_Constantes.gs lu en premier');
assert.ok(!fichiers.includes('Code.gs'), "l'ancien Code.gs ne doit plus exister");
const vus = {};
for (const f of fichiers) {
  const src = fs.readFileSync(repo + '/' + f, 'utf8');
  for (const m of src.matchAll(/^(?:function\s+|var\s+|let\s+|const\s+)([\w$]+)/gm)) {
    assert.ok(!vus[m[1]], m[1] + ' déclaré dans ' + vus[m[1]] + ' ET ' + f);
    vus[m[1]] = f;
  }
  // Au premier niveau : uniquement des déclarations (pas d'instruction exécutée au chargement)
  src.split('\n').forEach((l, i) => {
    if (/^[^\s/}]/.test(l)) assert.match(l, /^(function|var|let|const) /, f + ':' + (i + 1) + ' instruction au premier niveau : ' + l);
  });
}
function valeurs(ordre) {
  const ctx = vm.createContext({});
  for (const f of ordre) vm.runInContext(fs.readFileSync(repo + '/' + f, 'utf8'), ctx, { filename: f });
  const r = {};
  for (const n of Object.keys(vus)) if (typeof ctx[n] !== 'function') r[n] = String(ctx[n] instanceof RegExp ? ctx[n] : JSON.stringify(ctx[n]));
  return r;
}
assert.deepStrictEqual(valeurs(fichiers.slice().reverse()), valeurs(fichiers), 'mêmes constantes quel que soit l\'ordre');
console.log(fichiers.length + ' fichiers, ' + Object.keys(vus).length + ' noms');
console.log('test_fichiers : OK');
} catch (e) { console.log('test_fichiers : ÉCHEC ' + e.message); process.exit(1); }
