const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const env = makeEnv({
  repo: process.argv[2],
  tabletteReelle: true,
  props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" },
});
env.sheets.Saisies = new FakeSheet("Saisies", [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
]);
env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
const c = env.ctx,
  P = env.props._store;
const refuse = (f) => assert.throws(f, /TABLETTE_NON_AUTORISEE/);
const sansPause = (g) => {
  const k = "PIN_ESSAIS_" + (g || "INCONNU");
  const e = JSON.parse(P[k] || "{}");
  e.dernier = 0;
  P[k] = JSON.stringify(e);
};

// Sans clé : tout ce que la tablette utilise est refusé (un lien qui fuite ne donne rien)
refuse(() => c.traiterSaisie("A", "B", "P1", "1", ""));
refuse(() => c.forcerSaisie("A", "B", "P1", "1", "", "", false, false));
refuse(() => c.chargerCacheVerif());
refuse(() => c.verifierPiece("P1"));
refuse(() => c.genererDonneesImpression("offre", ""));
refuse(() => c.getDatesOperation());
refuse(() => c.getInfosPanneau());
refuse(() => c.ouvrirSessionAdmin("258025", "cle-bidon-cle-bidon-cle-bidon-cle-bidon"));
// 1re installation : n'importe qui ayant le lien ne peut PAS choisir le code…
assert.strictEqual(J(c.definirPin("258025", null, null)).ok, false);
assert.strictEqual(c.etatAdmin().pinDefini, false);
// … il faut le code d'activation affiché dans le Google Sheets
assert.ok(J(c.definirPin("258025", null, null, env.activation())).ok);
let r = J(c.appairerTablette("000000", "X"));
assert.strictEqual(r.ok, false);
assert.match(
  J(c.appairerTablette("258025", "X")).message,
  /Patientez/,
  "pause de 10 s aussi pour l'autorisation"
);
sansPause();
r = J(c.appairerTablette("258025", "  Caisse centrale 1  "));
assert.ok(r.ok);
assert.strictEqual(r.cle.length, 64);
assert.strictEqual(r.nom, "Caisse centrale 1");
const cle = r.cle;
assert.ok(!JSON.stringify(P).includes(cle), "clé jamais stockée en clair");
// Avec la clé : tout fonctionne
assert.strictEqual(J(c.traiterSaisie("DUPONT", "JEAN", "P1", "10", "", cle)).status, "SUCCES");
assert.strictEqual(J(c.chargerCacheVerif(cle)).offre.length, 1);
assert.ok(J(c.genererDonneesImpression("offre", "", cle)).length === 2);
const s1 = J(c.ouvrirSessionAdmin("258025", cle));
assert.ok(s1.ok);
// Jeton LIÉ à la tablette : seul, ou avec une autre clé, il ne sert à rien
assert.ok(J(c.getInfosAdmin({ j: s1.jeton, c: cle })).config, "jeton + clé de la tablette : accepté");
assert.throws(() => c.getInfosAdmin(s1.jeton), /ADMIN_REQUIS/);
assert.throws(() => c.getInfosAdmin({ j: s1.jeton, c: "x".repeat(64) }), /ADMIN_REQUIS/);
// Un inconnu qui tape des codes faux (écran d'autorisation) ne bloque pas l'espace
// responsable des tablettes autorisées
for (let i = 0; i < 5; i++) {
  sansPause();
  c.appairerTablette("000000", "pirate");
}
assert.match(J(c.appairerTablette("258025", "X")).message, /Réessayez/);
assert.ok(
  J(c.ouvrirSessionAdmin("258025", cle)).ok,
  "la tablette autorisée ouvre toujours l'espace responsable"
);
const inf = J(c.getInfosAdmin({ j: s1.jeton, c: cle }));
assert.strictEqual(inf.essaisInconnus.n, 6, "codes faux d'inconnus signalés au responsable");
delete P.PIN_ESSAIS_INCONNU;
// Démarrage : réglages joints, adresse du Google Sheets non transmise
const dem = J(c.demarrage(cle));
assert.ok(dem.config && dem.config.PASSAGES_MAX && dem.cache.config, "réglages envoyés à la tablette");
assert.ok(!JSON.stringify(dem).includes("docs.google.com"), "pas d'adresse du Sheet");
assert.ok(
  Object.keys(P).some((k) => k.indexOf("TABLETTE_VUE_") === 0),
  "date de dernière utilisation notée"
);
// Clé inventée / tronquée : refusée
refuse(() => c.chargerCacheVerif(cle.slice(0, 63) + "x"));
refuse(() => c.chargerCacheVerif(cle.slice(0, 20)));
// Panneau du Sheet (éditeur) : sans clé
env.activeEmail = env.owner;
assert.ok(J(c.getDatesOperation()).fin === "2099-12-31");
// Code réinitialisé depuis le Sheet : sans le code d'activation, personne ne peut le
// recréer (même une tablette autorisée : elle a pu être volée) ; avec, n'importe laquelle
const act = c.reinitialiserPinPanneau().match(/(\d{4}-\d{4})/)[1];
env.activeEmail = "";
assert.strictEqual(J(c.definirPin("111111", null, null)).ok, false);
assert.strictEqual(J(c.definirPin("111111", null, cle)).ok, false);
const j0 = J(c.definirPin("333333", null, cle, act));
assert.ok(j0.ok && j0.jeton);
const j = { j: j0.jeton, c: cle }; // jeton de cette tablette
// Liste / retrait
sansPause();
const r2 = J(c.appairerTablette("333333", "Caisse 2"));
const liste = J(c.listerTablettes(j));
assert.deepStrictEqual(
  liste.map((t) => t.nom),
  ["Caisse centrale 1", "Caisse 2"]
);
assert.throws(() => c.listerTablettes(null), /ADMIN_REQUIS/);
c.retirerTablette(liste[1].id, j);
refuse(() => c.chargerCacheVerif(r2.cle));
assert.strictEqual(J(c.chargerCacheVerif(cle)).offre.length, 1, "l'autre tablette garde son accès");
c.retirerToutesTablettes(j);
refuse(() => c.chargerCacheVerif(cle));
// Plafond
for (let i = 0; i < 20; i++) {
  sansPause();
  assert.ok(J(c.appairerTablette("333333", "T" + i)).ok);
}
sansPause();
assert.match(J(c.appairerTablette("333333", "T21")).message, /20 tablettes maximum/);
console.log("test_tablettes : OK");
