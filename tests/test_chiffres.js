// Vue d'ensemble de l'espace responsable (refonte graphique, étape 5) : chiffres de
// l'offre en cours relus dans « Saisies » — nombre, total (montant nombre ou texte,
// illisible = 0), ajouts forcés, tablettes autorisées.
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
try {
  const env = makeEnv({ repo: process.argv[2] });
  const c = env.ctx;
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(c.chiffresOffre_(null))),
    { saisies: 0, total: 0, forcees: 0, tablettes: 0 },
    "pas de feuille"
  );
  const f = new FakeSheet("Saisies", [
    ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    [new Date(), "A", "A", "1", 150, ""],
    [new Date(), "B", "B", "2", "1 234,50 €", "caisse 3 | ⚠️ Ajout forcé (Cas B)"],
    [new Date(), "C", "C", "3", "illisible", "⚠️ Ajout forcé (Cas C)"],
    ["", "", "", "", "", ""],
    [new Date(), "D", "D", "4", 0.1, "ℹ️ Passage 2/3"],
  ]);
  env.props.setProperty("TABLETTES", JSON.stringify([{ id: "t1" }, { id: "t2" }]));
  const r = JSON.parse(JSON.stringify(c.chiffresOffre_(f)));
  assert.deepStrictEqual(r, { saisies: 4, total: 1384.6, forcees: 2, tablettes: 2 });
  assert.strictEqual(c.nombreMontant_("89.90"), 89.9);
  assert.strictEqual(c.nombreMontant_("1.234,50"), 1234.5);
  assert.strictEqual(c.nombreMontant_("'=1+1"), 0, "formule neutralisée : illisible");
  console.log("test_chiffres : OK");
} catch (e) {
  console.log("test_chiffres : ÉCHEC " + e.message);
  process.exit(1);
}
