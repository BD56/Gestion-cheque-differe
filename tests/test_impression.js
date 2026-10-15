const { loadCode, makeProps } = require("./harness");
const assert = require("assert");
const J = (x) => JSON.parse(JSON.stringify(x));
function fmt(d, tz, pat) {
  // sous-ensemble de Utilities.formatDate
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  );
  return pat
    .replace("yyyy", p.year)
    .replace("MM", p.month)
    .replace("dd", p.day)
    .replace("HH", p.hour)
    .replace("mm", p.minute)
    .replace("ss", p.second);
}
// Faux « Saisies » : en-tête + lignes (une vide au milieu, une date texte)
const D = (s) => new Date(s);
const rows = [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "CODE "],
  [D("2026-09-26T08:10:00Z"), "TEST", "UN", "P1", "150,50 €", "c1"],
  [D("2026-09-26T21:30:00Z"), "TEST", "DEUX", "P2", "20 €", ""], // 23h30 à Paris -> 26/09
  [D("2026-09-26T22:30:00Z"), "TEST", "TROIS", "P3", "30 €", ""], // 00h30 à Paris -> 27/09
  ["", "", "", "", "", ""],
  ["texte", "TEST", "QUATRE", "P4", "5 €", ""],
];
const disp = rows.map((r) =>
  r.map((v) => (v instanceof Date ? fmt(v, "Europe/Paris", "dd/MM/yyyy HH:mm:ss") : String(v)))
);
const sheet = {
  getLastRow: () => rows.length,
  getRange: (r, c, nr, nc) => ({
    getValues: () => rows.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc)),
    getDisplayValues: () => disp.slice(r - 1, r - 1 + nr).map((x) => x.slice(c - 1, c - 1 + nc)),
  }),
};
const ss = {
  getSheetByName: (n) => (n === "Saisies" ? sheet : null),
  getSpreadsheetTimeZone: () => "Europe/Paris",
};
const props = makeProps();
const ctx = loadCode(process.argv[2], {
  PropertiesService: { getDocumentProperties: () => props },
  SpreadsheetApp: { getActiveSpreadsheet: () => ss },
  Utilities: { formatDate: fmt },
});
ctx.exigerSession_ = function () {}; // contrôle de la session testé à part

let r = J(ctx.genererDonneesImpression("jour", "2026-09-26"));
assert.deepStrictEqual(r[0], ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos"]);
assert.deepStrictEqual(
  r.slice(1).map((x) => x[2]),
  ["UN", "DEUX"]
); // fuseau Paris respecté
assert.strictEqual(r[1][0], "26/09/2026");
assert.strictEqual(r[1][4], "150,50 €");
r = J(ctx.genererDonneesImpression("jour", "2026-09-27"));
assert.deepStrictEqual(
  r.slice(1).map((x) => x[2]),
  ["TROIS"]
);
assert.deepStrictEqual(J(ctx.genererDonneesImpression("jour", "2026-01-01")), []); // rien -> []
r = J(ctx.genererDonneesImpression("offre", ""));
assert.deepStrictEqual(
  r.slice(1).map((x) => x[2]),
  ["UN", "DEUX", "TROIS", "QUATRE"]
); // ligne vide sautée
assert.strictEqual(r[1][0], "26/09/2026 10:10:00");
props.setProperty("CFG_LIBELLE_MONTANT", "Valeur");
props.setProperty("CFG_LIBELLE_NOTES", "Code");
assert.deepStrictEqual(J(ctx.genererDonneesImpression("offre", ""))[0].slice(4), ["Valeur", "Code"]);
rows.length = 1;
assert.deepStrictEqual(J(ctx.genererDonneesImpression("offre", "")), []); // feuille vide
console.log("test_impression : OK");
