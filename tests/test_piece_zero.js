const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const repo = process.argv[2];
function env0(lignes, mode) {
  const env = makeEnv({ repo, props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" } });
  env.sheets.Saisies = new FakeSheet(
    "Saisies",
    [["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""]].concat(lignes || [])
  );
  env.sheets.Saisies.getRange("Z1").setValue(mode || "SIGNALER");
  return env;
}
const t = new Date("2026-10-01T08:00:00Z");
// 1) Une nouvelle saisie garde le 0 (texte)
let e = env0([]);
assert.strictEqual(J(e.ctx.traiterSaisie("Dupont", "Jean", "012345678901", "10", "")).status, "SUCCES");
assert.strictEqual(
  e.sheets.Saisies.getRange(2, 4).getValue(),
  "012345678901",
  "le 0 initial doit être conservé"
);
// 2) Ressaisie identique -> vrai doublon A (et refusé en BLOQUANT)
assert.strictEqual(J(e.ctx.traiterSaisie("DUPONT", "JEAN", "012345678901", "10", "")).details[0].type, "A");
// 3) Données ANCIENNES déjà converties en nombre (0 perdu) : toujours reconnues
e = env0([[t, "DUPONT", "JEAN", 12345678901, "10 €", ""]], "BLOQUANT");
let r = J(e.ctx.traiterSaisie("DUPONT", "JEAN", "012345678901", "10", ""));
assert.strictEqual(r.status, "BLOQUE", "ancienne ligne sans 0 : doit être un doublon A refusé en BLOQUANT");
r = J(e.ctx.traiterSaisie("AUTRE", "NOM", "0123 4567 8901", "10", ""));
assert.strictEqual(r.status, "BLOQUE", "même pièce, autre nom, avec espaces : usurpation B refusée");
// forçage et correction : mêmes règles
assert.strictEqual(
  J(e.ctx.forcerSaisie("DUPONT", "JEAN", "012345678901", "1", "", "", false, false)).status,
  "BLOQUE"
);
// 4) Pré-avertissement N2 + copie locale + annuaire
const c = J(e.ctx.chargerCacheVerif());
assert.strictEqual(c.offre[0].pieceNorm, "12345678901");
assert.strictEqual(J(e.ctx.verifierPiece("012345678901")).trouve, true);
e = env0([]);
e.ctx.traiterSaisie("DUPONT", "JEAN", "005", "1", "");
const ann = e.sheets._Annuaire.getDataRange().getValues()[1];
assert.strictEqual(typeof ann[0], "string", "clé annuaire stockée en texte");
assert.deepStrictEqual(J(e.ctx.chercherAnnuaire_(e.ctx._normPiece_("0005"))), {
  nom: "DUPONT",
  prenom: "JEAN",
});
// 5) Pièces alphanumériques : rien ne change (les 0 internes / lettres sont gardés)
assert.strictEqual(e.ctx._normPiece_("0a-12 3"), "0A123");
assert.strictEqual(e.ctx._normPiece_("000"), "0");
// 6) Injection de formule : un nom commençant par « = » est écrit comme du texte
e = env0([]);
e.ctx.traiterSaisie('=HYPERLINK("x")', "JEAN", "P1", "1", "=1+1");
assert.strictEqual(e.sheets.Saisies.getRange(2, 2).getValue(), '=HYPERLINK("X")');
assert.strictEqual(e.sheets.Saisies.getRange(2, 6).getValue(), "=1+1");
// 7) onEdit : la saisie manuelle d'un N° avec 0 reste du texte et est comparée correctement
e = env0([[t, "DUPONT", "JEAN", 12345678901, "10 €", ""]]);
const S = e.sheets.Saisies;
e.ctx.Utilities.sleep = () => {};
S._set(3, 2, "DUPONT");
S._set(3, 3, "JEAN");
S._set(3, 4, 12345678901); // Sheets a déjà converti la frappe
const cell = Object.assign(S.getRange(3, 4), { getSheet: () => S, getRow: () => 3, getColumn: () => 4 });
e.ctx.onEdit({ range: cell, value: "012345678901" });
assert.strictEqual(S.getRange(3, 4).getValue(), "012345678901", "onEdit réécrit le N° en texte");
assert.match(S.getRange(3, 6).getValue(), /Cas A/);
console.log("test_piece_zero : OK");
