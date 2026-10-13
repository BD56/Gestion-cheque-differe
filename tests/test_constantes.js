// Structure de « Saisies » regroupée en constantes (refonte, étape 2) : valeurs
// cohérentes entre elles et identiques à la feuille réelle (Vannes).
const assert = require("assert");
const { makeEnv } = require("./mocks");
const J = (x) => JSON.parse(JSON.stringify(x));
const env = makeEnv({ repo: process.argv[2] });
const c = env.ctx;
assert.strictEqual(c.FEUILLE_SAISIES, "Saisies");
assert.strictEqual(c.CELLULE_MODE, "Z1");
assert.strictEqual(c.PREFIXE_ARCHIVES, "Archives_");
assert.deepStrictEqual(J(c.COL), { DATE: 1, NOM: 2, PRENOM: 3, PIECE: 4, MONTANT: 5, NOTES: 6 });
Object.keys(c.COL).forEach((k) =>
  assert.strictEqual(c.IDX[k], c.COL[k] - 1, "IDX." + k + " = COL." + k + " - 1")
);
assert.strictEqual(Object.keys(c.IDX).length, Object.keys(c.COL).length);
assert.strictEqual(c.ENTETES_SAISIES.length, c.NB_COLONNES);
assert.strictEqual(c.COL.NOTES, c.NB_COLONNES, "les notes sont la dernière colonne");
assert.strictEqual(c.NB_COLONNES_SAISIE, c.NB_COLONNES - c.COL.NOM + 1);
assert.strictEqual(c.NB_COLONNES_LIGNE, c.NB_COLONNES + 1);
// Une feuille créée par l'installation a les en-têtes et le mode attendus
c.installerFeuilles_();
const S = env.sheets.Saisies;
assert.deepStrictEqual(S.getRange(1, 1, 1, 6).getValues()[0], [
  "Date",
  "Nom",
  "Prénom",
  "N° Pièce",
  "Montant",
  "Notes ou Infos",
]);
assert.strictEqual(S.getRange("Z1").getValue(), "SIGNALER");
console.log("test_constantes : OK");
