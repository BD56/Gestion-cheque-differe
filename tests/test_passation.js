// Changement de manager : menu « 🔁 Passer la main » (supprime les robots de nuit du
// compte qui part, journalisé et montré au bandeau, puis affiche les gestes restants) ;
// robot de nuit : journal vérifié et purgé sous verrou (robots en double sans danger).
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const env = makeEnv({
  repo: process.argv[2],
  props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" },
  triggers: ["verificationClotureNocturne", "purgerAnnuaire"],
});
env.sheets.Saisies = new FakeSheet("Saisies", [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
]);
env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
const c = env.ctx;
const derniere = () => {
  const l = env.sheets._Journal.getDataRange().getValues();
  return l[l.length - 1];
};

// Réservé aux personnes qui peuvent modifier le Sheet
assert.throws(() => c.passerLaMainDepuisMenu(), /Google Sheets/);
env.activeEmail = "proprio@example.com";
// « Non » : rien n'est touché
env.reponseUi = "NO";
c.passerLaMainDepuisMenu();
assert.strictEqual(env.triggers.length, 2);
assert.match(env.alertes[0], /^🔁 Passer la main \| Vous quittez la gestion/);
assert.match(env.alertes[0], /compte Google du magasin/);
assert.strictEqual(env.alertes.length, 1);
// « Oui » : robots de CE compte supprimés, gestes restants affichés
env.reponseUi = "YES";
c.passerLaMainDepuisMenu();
assert.deepStrictEqual(env.triggers, []);
const fin = env.alertes[env.alertes.length - 1];
assert.match(fin, /Vos robots de nuit sont supprimés/);
assert.match(fin, /Il reste 2 gestes/);
assert.match(fin, /Transférer la propriété/);
assert.match(fin, /🧰 Installer/);
assert.match(fin, /Nouvelle version/);
assert.deepStrictEqual(derniere().slice(1, 4), [
  "Panneau du Sheet (proprio@example.com)",
  "Passer la main (robots de nuit de ce compte supprimés)",
  "2 robot(s)",
]);
assert.match(J(c.getSurveillancePanneau()).changements.lignes[0], /^Passer la main/);
// Rien à supprimer : dit tel quel
c.passerLaMainDepuisMenu();
assert.match(env.alertes[env.alertes.length - 1], /aucun robot de nuit sous votre compte/);
// Le successeur : « Installer » recrée les robots à son nom
env.activeEmail = "editeur@example.com";
assert.match(c.installer(), /Déclencheur créé/);
assert.deepStrictEqual(env.triggers.sort(), ["purgerAnnuaire", "verificationClotureNocturne"]);

// Robot de nuit : vérification et purge du journal SOUS VERROU
let tenu = false;
const verrous = [];
c.LockService = {
  getScriptLock: () => ({
    waitLock() {
      assert.ok(!tenu, "verrou déjà tenu");
      tenu = true;
      verrous.push("pris");
    },
    tryLock() {
      tenu = true;
      return true;
    },
    releaseLock() {
      tenu = false;
    },
  }),
};
const purger = c.purgerJournal_,
  verifier = c.verifierJournalNuit_;
const vus = [];
c.purgerJournal_ = function () {
  vus.push("purge:" + tenu);
  return purger();
};
c.verifierJournalNuit_ = function () {
  vus.push("vérif:" + tenu);
  return verifier();
};
env.activeEmail = env.owner;
c.verificationClotureNocturne();
assert.deepStrictEqual(vus, ["vérif:true", "purge:true"]);
assert.ok(!tenu, "verrou rendu");
// une panne de la vérification n'empêche pas la purge, ni le reste du robot
c.verifierJournalNuit_ = () => {
  throw new Error("panne");
};
vus.length = 0;
c.verificationClotureNocturne();
assert.deepStrictEqual(vus, ["purge:true"]);
assert.ok(!tenu);

console.log("test_passation : OK");
