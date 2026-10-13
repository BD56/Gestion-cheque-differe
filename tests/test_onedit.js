const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const repo = process.argv[2];
function env0(mode) {
  const env = makeEnv({ repo });
  env.ctx.Utilities.sleep = () => {};
  env.alertes = [];
  const S = (env.sheets.Saisies = new FakeSheet("Saisies", [
    ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    [new Date(), "DUPONT", "JEAN", "AB123", "10 €", ""],
  ]));
  S.getRange("Z1").setValue(mode);
  return env;
}
const ev = (S, r, c, nr, nc, value) => ({
  range: Object.assign(S.getRange(r, c, nr, nc), { getSheet: () => S }),
  value,
});

// 1) Cellule seule (comportement d'origine) : horodatage, majuscules, doublon A marqué
let e = env0("SIGNALER");
let S = e.sheets.Saisies;
S._set(3, 2, "dupont");
S._set(3, 3, "JEAN");
S._set(3, 4, "AB123");
e.ctx.onEdit(ev(S, 3, 2, 1, 1, "dupont"));
assert.ok(S.getRange(3, 1).getValue() instanceof Date, "horodatage");
assert.strictEqual(S.getRange(3, 2).getValue(), "DUPONT");
assert.match(S.getRange(3, 6).getValue(), /Cas A/);

// 2) Collage de 3 lignes en SIGNALER : CHAQUE ligne contrôlée
e = env0("SIGNALER");
S = e.sheets.Saisies;
[
  ["martin", "paul", "CD1"],
  ["dupont", "jean", "AB123"],
  ["autre", "nom", "ab-123"],
].forEach((l, i) => l.forEach((v, j) => S._set(3 + i, 2 + j, v)));
e.ctx.onEdit(ev(S, 3, 2, 3, 3, undefined));
assert.strictEqual(S.getRange(3, 6).getValue(), "", "ligne 3 sans doublon");
assert.match(S.getRange(4, 6).getValue(), /Cas A/, "ligne 4 = doublon A");
assert.match(S.getRange(5, 6).getValue(), /Cas B/, "ligne 5 = usurpation B");
[3, 4, 5].forEach((l) => assert.ok(S.getRange(l, 1).getValue() instanceof Date, "horodatage ligne " + l));
assert.strictEqual(S.getRange(3, 2).getValue(), "MARTIN", "majuscules sur collage");

// 3) Collage en BLOQUANT : seules les lignes fautives sont annulées, une seule alerte
e = env0("BLOQUANT");
S = e.sheets.Saisies;
e.ctx.SpreadsheetApp.getUi = () => ({ alert: (t, m) => e.alertes.push(m), ButtonSet: { OK: 1 } });
[
  ["martin", "paul", "CD1"],
  ["dupont", "jean", "AB123"],
].forEach((l, i) => l.forEach((v, j) => S._set(3 + i, 2 + j, v)));
e.ctx.onEdit(ev(S, 3, 2, 2, 3, undefined));
assert.strictEqual(S.getRange(3, 2).getValue(), "MARTIN", "ligne valide conservée");
assert.deepStrictEqual(S.getRange(4, 2, 1, 3).getValues()[0], ["", "", ""], "ligne doublon annulée");
assert.strictEqual(e.alertes.length, 1);
assert.match(e.alertes[0], /ligne 4 \(Cas A\)/);

// 4) En-tête et colonnes au-delà de F ignorées
e = env0("SIGNALER");
S = e.sheets.Saisies;
e.ctx.onEdit(ev(S, 1, 2, 1, 1, "X"));
e.ctx.onEdit(ev(S, 2, 8, 1, 1, "X"));
assert.strictEqual(S.getRange(2, 6).getValue(), "");
console.log("test_onedit : OK");
