const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const repo = process.argv[2];
function env0(lignes, props) {
  const env = makeEnv({ repo, props: props || { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" } });
  env.sheets.Saisies = new FakeSheet(
    "Saisies",
    [["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""]].concat(lignes || [])
  );
  env.sheets.Saisies.getRange("Z1").setValue("BLOQUANT");
  const ss = env.ctx.SpreadsheetApp.getActiveSpreadsheet(),
    ins = ss.insertSheet;
  ss.insertSheet = (n, i) => {
    if (env.sheets[n]) throw new Error("existe déjà : " + n);
    return ins(n, i);
  }; // comme Google
  return env;
}
const t = new Date();
// #13 deux clôtures dans la même minute
let e = env0([[t, "A", "B", "P1", "1", ""]]);
e.ctx.archiverOffre_();
e.sheets.Saisies.appendRow([t, "C", "D", "P2", "1", ""]);
assert.match(e.ctx.archiverOffre_(), /archivée/);
const arch = Object.keys(e.sheets)
  .filter((n) => n.indexOf("Archives_") === 0)
  .sort();
assert.strictEqual(arch.length, 2);
assert.ok(/_2$/.test(arch[1]), "suffixe _2 : " + arch.join(","));
const j0 = e.creerCode("258025").jeton;
assert.strictEqual(J(e.ctx.listerArchives(j0)).length, 2);
assert.match(J(e.ctx.listerArchives(j0))[0].libelle, /Clôturée le/);
// #14 offre vide : pas d'archive, dates remises à zéro, mode CONSERVÉ (décision Bryan)
e = env0([], { DATE_DEBUT: "2026-01-01", DATE_FIN: "2026-01-10" });
// robot de nuit : un visiteur de l'application ne peut pas le lancer
assert.throws(() => e.ctx.verificationClotureNocturne(), /Google Sheets/);
assert.throws(() => e.ctx.verificationClotureNocturne({ triggerUid: "uid-inventé" }), /Google Sheets/);
e.triggers.push("verificationClotureNocturne");
e.ctx.verificationClotureNocturne({ triggerUid: "uid-verificationClotureNocturne" });
assert.ok(!Object.keys(e.sheets).some((n) => n.indexOf("Archives_") === 0), "pas d'archive vide");
assert.strictEqual(e.props._store.DATE_FIN, "");
assert.strictEqual(e.sheets.Saisies.getRange("Z1").getValue(), "BLOQUANT", "mode conservé à la clôture");
assert.ok(e.props._store.DERNIERE_NUIT_MS, "passage du robot noté");
// #15 dates
e = env0([]);
const j = e.creerCode("258025").jeton;
assert.throws(() => e.ctx.setDatesOperation("2026-12-31", "2026-01-01", j), /précéder/);
assert.throws(() => e.ctx.setDatesOperation("2026-01-01", "", j), /ET la date de fin/);
assert.throws(() => e.ctx.setDatesOperation("01/01/2026", "2026-02-01", j), /ET la date de fin/);
e.ctx.setDatesOperation("2026-01-01", "2026-01-01", j);
assert.strictEqual(e.props._store.DATE_FIN, "2026-01-01");
e.ctx.setDatesOperation("", "", j);
assert.strictEqual(e.props._store.DATE_DEBUT, "");
// #19 reconstruireAnnuaire : refusée sans accès au classeur, permise pour l'éditeur
e = env0([[t, "DUPONT", "JEAN", "0123", "1", ""]]);
assert.throws(() => e.ctx.reconstruireAnnuaire(), /Réservé/);
e.activeEmail = e.owner;
assert.match(e.ctx.reconstruireAnnuaire(), /1 pièces/);
assert.strictEqual(e.sheets._Annuaire.getRange(2, 1).getValue(), "123", "clé normalisée, stockée en texte");
// #20 champs manquants
e = env0([]);
const r = J(e.ctx.traiterSaisie("DUPONT", "JEAN", "", "", ""));
assert.strictEqual(r.status, "BLOQUE");
assert.match(r.message, /N° de pièce, Montant/);
assert.strictEqual(J(e.ctx.forcerSaisie("", "JEAN", "P1", "1", "", "", false, false)).status, "BLOQUE");
assert.strictEqual(J(e.ctx.traiterSaisie(undefined, null, "P1", "1", "")).status, "BLOQUE");
e.props.setProperty("CFG_MONTANT_OBLIGATOIRE", "NON");
assert.strictEqual(
  J(e.ctx.traiterSaisie("DUPONT", "JEAN", "P1", "", "")).status,
  "SUCCES",
  "montant facultatif"
);
assert.strictEqual(e.sheets.Saisies.getLastRow(), 2);
// #22 purge : sous verrou, garde le texte (0 initial), retire les entrées expirées
e = env0([]);
let verrou = 0;
e.ctx.LockService = {
  getScriptLock: () => ({
    waitLock() {
      verrou++;
    },
    releaseLock() {},
  }),
};
const vieux = new Date();
vieux.setFullYear(vieux.getFullYear() - 4);
e.sheets._Annuaire = new FakeSheet("_Annuaire", [
  ["Piece", "Nom", "Prenom", "DerniereVue"],
  ["'0042", "A", "B", t],
  ["OLD1", "C", "D", vieux],
  ["ZZ", "E", "F", t],
]);
assert.throws(() => e.ctx.purgerAnnuaire(), /Google Sheets/);
e.activeEmail = e.owner;
e.ctx.purgerAnnuaire(); // lancement manuel par un éditeur : permis
const reste = e.sheets._Annuaire
  .getDataRange()
  .getValues()
  .slice(1)
  .filter((x) => x[0] !== "");
assert.deepStrictEqual(
  reste.map((x) => x[0]),
  ["0042", "ZZ"]
);
assert.strictEqual(verrou, 1);
console.log("test_mineurs : OK");
