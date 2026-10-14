// Résumé des archives (dates de l'offre, nombre de saisies, montant total) : calculé à
// la clôture, ou une fois pour une archive plus ancienne ; effacé avec l'archive.
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const repo = process.argv[2];
const env = makeEnv({ repo, props: { DATE_DEBUT: "2026-12-01", DATE_FIN: "2026-12-24" } });
env.sheets.Saisies = new FakeSheet("Saisies", [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
  [new Date("2026-12-03T10:00:00"), "MARTIN", "SOPHIE", "'123456", "150,00 €", ""],
  [new Date("2026-12-05T10:00:00"), "DURAND", "PAUL", "'880412", 1000.5, "⚠️ Ajout forcé (Cas C)"],
  [new Date("2026-12-06T10:00:00"), "PETIT", "LEA", "'777", "illisible", ""],
]);
env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
const P = env.props._store;
const c = env.ctx;

// Clôture : résumé avec les dates de l'OFFRE (pas celles des saisies)
assert.match(c.archiverOffre_(), /archivée/);
const nom = Object.keys(env.sheets).find((n) => n.indexOf("Archives_") === 0);
assert.deepStrictEqual(JSON.parse(P["RESUME_" + nom]), {
  debut: "2026-12-01",
  fin: "2026-12-24",
  saisies: 3,
  total: 1150.5,
});
assert.strictEqual(P.DATE_FIN, "", "offre clôturée");

// Archive d'avant les résumés : calculé à la 1re lecture (dates des saisies), puis gardé
env.sheets["Archives_02-01-2026_01-00"] = new FakeSheet("Archives_02-01-2026_01-00", [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "CODE "],
  ["15/12/2025 18:02", "A", "B", "P1", "10", ""],
  [new Date("2025-12-10T09:00:00"), "C", "D", "P2", "5,50 €", ""],
  ["", "", "", "", "", ""],
]);
const ap = J(c.apercuResponsable("")); // contrôle d'appareil neutralisé dans ce banc
assert.deepStrictEqual(ap.archives, [
  {
    nom: nom,
    libelle: ap.archives[0].libelle,
    debut: "2026-12-01",
    fin: "2026-12-24",
    saisies: 3,
    total: 1150.5,
  },
  {
    nom: "Archives_02-01-2026_01-00",
    libelle: "Clôturée le 02/01/2026 à 01h00",
    debut: "2025-12-10",
    fin: "2025-12-15",
    saisies: 2,
    total: 15.5,
  },
]);
assert.ok(P["RESUME_Archives_02-01-2026_01-00"], "gardé");
const sansNoms = JSON.stringify(ap.archives);
assert.ok(!/MARTIN|DURAND|123456/.test(sansNoms), "aucune donnée personnelle dans les résumés");
// Gardé : plus relu dans l'archive
env.sheets["Archives_02-01-2026_01-00"].getRange = () => {
  throw new Error("archive relue");
};
assert.strictEqual(J(c.apercuResponsable("")).archives.length, 2);

// Purge (nuit) : résumé effacé avec l'archive, et résumé orphelin effacé
P["RESUME_Archives_01-01-2020_10-00"] = "{}";
env.sheets["Archives_01-01-2020_10-00"] = new FakeSheet("Archives_01-01-2020_10-00", [["Date"]]);
P["RESUME_Archives_05-05-2026_10-00"] = "{}"; // onglet supprimé à la main
c.purgerArchives_();
assert.ok(!env.sheets["Archives_01-01-2020_10-00"], "archive de plus de 3 ans supprimée");
assert.ok(!("RESUME_Archives_01-01-2020_10-00" in P), "son résumé aussi");
assert.ok(!("RESUME_Archives_05-05-2026_10-00" in P), "résumé orphelin effacé");
assert.ok(P["RESUME_" + nom] && P["RESUME_Archives_02-01-2026_01-00"], "les autres restent");

// Clôture sans dates d'offre : dates de la 1re et de la dernière saisie
env.sheets.Saisies.appendRow([new Date("2027-01-04T10:00:00"), "X", "Y", "'1", "2", ""]);
c.archiverOffre_();
const nom2 = Object.keys(P).find(
  (k) => k.indexOf("RESUME_") === 0 && k !== "RESUME_" + nom && !/02-01-2026/.test(k)
);
assert.deepStrictEqual(JSON.parse(P[nom2]), { debut: "2027-01-04", fin: "2027-01-04", saisies: 1, total: 2 });
console.log("test_resume_archives: OK");
