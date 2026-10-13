const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
function nouvelEnv(mode) {
  const env = makeEnv({ repo: process.argv[2], props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" } });
  env.sheets.Saisies = new FakeSheet("Saisies", [
    ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    [new Date("2026-10-01T08:00:00Z"), "DUPONT", "JEAN", "AB123", "10 €", ""],
  ]);
  env.sheets.Saisies.getRange("Z1").setValue(mode);
  return env;
}
const ligne = (env, n) => env.sheets.Saisies.getRange(n, 1, 1, 7);
const nb = (env) => env.sheets.Saisies.getLastRow();

// SIGNALER + cas A : écrit, note et couleurs calculées par le serveur
let env = nouvelEnv("SIGNALER");
let r = J(env.ctx.forcerSaisie("dupont", "jean", "ab-123", "5.5 €", "caisse 2", "", false, false)); // la tablette « ment » : ni note ni drapeaux
assert.strictEqual(r.status, "SUCCES");
assert.strictEqual(r.cas, "A");
assert.strictEqual(nb(env), 3);
assert.deepStrictEqual(ligne(env, 3).getValues()[0].slice(1, 6), [
  "DUPONT",
  "JEAN",
  "AB-123",
  "5,5 €",
  "caisse 2\n⚠️ Ajout forcé (Cas A)",
]);
assert.deepStrictEqual(ligne(env, 3).getBackgrounds()[0], [
  null,
  "#f4cccc",
  "#f4cccc",
  "#f4cccc",
  null,
  "#f4cccc",
  null,
]);
// La tablette annonce « Cas C » alors que c'est un B : le serveur étiquette B
r = J(env.ctx.forcerSaisie("martin", "paul", "AB123", "1 €", "", "⚠️ Ajout forcé (Cas C)", true, false));
assert.strictEqual(r.cas, "B");
assert.strictEqual(ligne(env, 4).getValues()[0][5], "⚠️ Ajout forcé (Cas B)");
assert.deepStrictEqual(ligne(env, 4).getBackgrounds()[0], [
  null,
  null,
  null,
  "#f4cccc",
  null,
  "#f4cccc",
  null,
]);
// Fausse alerte tapée dans les notes : retirée, plus de doublon -> ligne normale
r = J(
  env.ctx.forcerSaisie(
    "NOUVEAU",
    "CLIENT",
    "ZZ999",
    "1 €",
    "ok\n⚠️ Ajout forcé (Cas A)",
    "⚠️ Ajout forcé (Cas C)",
    true,
    true
  )
);
assert.strictEqual(r.status, "SUCCES");
assert.strictEqual(r.cas, null);
assert.strictEqual(ligne(env, 5).getValues()[0][5], "ok");
assert.deepStrictEqual(ligne(env, 5).getBackgrounds()[0], [null, null, null, null, null, null, null]);
assert.ok(
  env.sheets._Annuaire
    .getDataRange()
    .getValues()
    .some((x) => x[0] === "ZZ999")
);

// BLOQUANT : A et B refusés, rien d'écrit (ni Saisies ni annuaire) ; C autorisé
env = nouvelEnv("BLOQUANT");
r = J(env.ctx.forcerSaisie("DUPONT", "JEAN", "AB123", "1 €", "", "⚠️ Ajout forcé (Cas C)", true, false));
assert.strictEqual(r.status, "BLOQUE");
assert.strictEqual(r.cas, "A");
assert.match(r.message, /déjà profité/);
r = J(env.ctx.forcerSaisie("AUTRE", "NOM", "AB 123", "1 €", "", "", false, false));
assert.strictEqual(r.status, "BLOQUE");
assert.strictEqual(r.cas, "B");
assert.strictEqual(nb(env), 2);
assert.ok(!env.sheets._Annuaire, "annuaire non touché");
r = J(env.ctx.forcerSaisie("Dupont", "Jean", "XY777", "1 €", "", "", false, false));
assert.strictEqual(r.status, "SUCCES");
assert.strictEqual(r.cas, "C");
assert.strictEqual(nb(env), 3);
assert.strictEqual(ligne(env, 3).getValues()[0][5], "⚠️ Ajout forcé (Cas C)");
// Hors période : refus, rien d'écrit
env = nouvelEnv("SIGNALER");
env.props.setProperty("DATE_FIN", "2001-01-01");
r = J(env.ctx.forcerSaisie("NEW", "X", "Q1", "1", "", "", false, false));
assert.strictEqual(r.status, "BLOQUE");
assert.ok(r.horsPeriode);
assert.strictEqual(nb(env), 2);
r = J(env.ctx.traiterSaisie("NEW", "X", "Q1", "1", ""));
assert.strictEqual(r.status, "BLOQUE");
assert.match(r.message, /terminée/);
assert.strictEqual(nb(env), 2);
env.props.setProperty("DATE_DEBUT", "");
assert.match(J(env.ctx.traiterSaisie("NEW", "X", "Q1", "1", "")).message, /Aucune opération/);
env.props.setProperty("DATE_DEBUT", "2098-01-01");
env.props.setProperty("DATE_FIN", "2099-01-01");
assert.match(J(env.ctx.traiterSaisie("NEW", "X", "Q1", "1", "")).message, /pas encore commencé/);
console.log("test_forcer : OK");
