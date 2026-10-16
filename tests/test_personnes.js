// Codes responsables PERSONNELS : chaque personne ouvre l'espace avec SON code, sur
// n'importe quel appareil ; le journal la nomme ; essais faux par personne ; jeton de 3 min.
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const env = makeEnv({
  repo: process.argv[2],
  sessionReelle: true,
  props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" },
});
env.sheets.Saisies = new FakeSheet("Saisies", [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
]);
env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
const c = env.ctx,
  P = env.props._store;
const derniere = () => {
  const l = env.sheets._Journal.getDataRange().getValues();
  return l[l.length - 1];
};
const sansPause = () => {
  for (const k in P)
    if (k.indexOf("PIN_ESSAIS_") === 0) {
      const e = JSON.parse(P[k]);
      e.dernier = 0;
      P[k] = JSON.stringify(e);
    }
};

// Le compte du magasin, connecté sur deux appareils (deux sessions)
const sa = env.connecter(); // « Caisse test »
const sb = J(c.connexion("Caisse test", "motdepasse-test")).session;

// --- Passer aux codes personnels (sans code : le compte connecté suffit) ---
assert.match(J(c.passerCodesPersonnels("Marie", "12a456", null, sa)).message, /6 chiffres/);
let r = J(c.passerCodesPersonnels("  Marie ", "111111", null, sa));
assert.ok(r.ok && r.jeton);
assert.deepStrictEqual(J(c.etatAdmin()), { pinDefini: true, codePersonnel: true, comptes: true });
assert.ok(!P.ADMIN_PIN_HASH, "pas de code commun en même temps");
assert.ok(!JSON.stringify(P).includes("111111"), "code jamais en clair");
assert.deepStrictEqual(derniere().slice(1, 4), [
  "Caisse test",
  "Codes personnels activés",
  "première personne : Marie",
]);
assert.throws(
  () => c.passerCodesPersonnels("Paul", "222222", null, sa),
  /ADMIN_REQUIS/,
  "déjà protégé : jeton exigé"
);

// « Qui êtes-vous ? » : noms seulement, compte connecté exigé
const noms = J(c.personnesResponsables(sb));
assert.deepStrictEqual(
  noms.map((p) => p.nom),
  ["Marie"]
);
assert.ok(!/hash|sel/.test(JSON.stringify(noms)));
assert.throws(() => c.personnesResponsables(""), /CONNEXION_REQUISE/);
const idMarie = noms[0].id;

// --- Ouvrir l'espace : nom + SON code, depuis N'IMPORTE QUEL compte ---
assert.match(J(c.ouvrirSessionAdmin("111111", sb)).message, /Choisissez votre nom/);
r = J(c.ouvrirSessionAdmin("111111", sb, idMarie));
assert.ok(r.ok && r.personne === "Marie");
const jm = { j: r.jeton, c: sb };
assert.ok(env.cacheStore["ADM_" + r.jeton].exp - Date.now() <= 180000, "jeton personnel : 3 min");
// le journal nomme la personne
c.basculerModeWebApp(jm);
assert.deepStrictEqual(derniere().slice(1, 3), ["Caisse test · Marie", "Mode de sécurité"]);

// --- Ajouter une personne (son code tapé par elle) ---
assert.match(J(c.ajouterPersonne("marie", "333333", jm)).message, /existe déjà/);
assert.match(J(c.ajouterPersonne("Paul", "12", jm)).message, /6 chiffres/);
assert.ok(J(c.ajouterPersonne("Paul", "222222", jm)).ok);
assert.deepStrictEqual(derniere().slice(1, 4), [
  "Caisse test · Marie",
  "Personne ajoutée (code personnel)",
  "Paul",
]);
const idPaul = J(c.listerPersonnes(jm)).find((p) => p.nom === "Paul").id;
assert.throws(() => c.listerPersonnes(null), /ADMIN_REQUIS/);

// Essais faux PAR PERSONNE : Paul bloqué n'empêche pas Marie
for (let i = 0; i < 5; i++) {
  sansPause();
  c.ouvrirSessionAdmin("000000", sa, idPaul);
}
assert.match(J(c.ouvrirSessionAdmin("222222", sa, idPaul)).message, /Réessayez|Patientez/);
sansPause();
assert.ok(J(c.ouvrirSessionAdmin("111111", sa, idMarie)).ok, "Marie n'est pas bloquée");
// le code d'une personne ne vaut pas pour une autre
sansPause();
assert.match(J(c.ouvrirSessionAdmin("111111", sa, idPaul)).message, /Réessayez|Code faux|Patientez/);

// --- Changer son code ---
assert.ok(J(c.changerMonCode("444444", jm)).ok);
assert.deepStrictEqual(derniere().slice(1, 4), ["Caisse test · Marie", "Code personnel changé", "Marie"]);
sansPause();
assert.match(J(c.ouvrirSessionAdmin("111111", sa, idMarie)).message, /Code faux/);
sansPause();
const jm2 = { j: J(c.ouvrirSessionAdmin("444444", sa, idMarie)).jeton, c: sa };
env.activeEmail = "editeur@example.com"; // panneau du Sheet : espace sans personne
assert.match(J(c.changerMonCode("555555")).message, /Ouvrez l'espace avec votre code personnel/);
env.activeEmail = "";

// --- Retirer une personne : ses espaces ouverts se referment ; jamais la dernière ---
for (const k in P) if (k === "PIN_ESSAIS_P_" + idPaul) delete P[k];
const jp = { j: J(c.ouvrirSessionAdmin("222222", sb, idPaul)).jeton, c: sb };
assert.ok(J(c.getInfosAdmin(jp)).config);
assert.ok(J(c.retirerPersonne(idPaul, jm2)).ok);
assert.throws(() => c.getInfosAdmin(jp), /ADMIN_REQUIS/, "espace de Paul refermé");
assert.match(J(c.retirerPersonne(idMarie, jm2)).message, /dernière personne/);

// Impression de toute l'offre : réservée aussi en codes personnels
assert.throws(() => c.genererDonneesImpression("offre", "", sa, null), /ADMIN_REQUIS/);
assert.ok(Array.isArray(c.genererDonneesImpression("offre", "", sa, jm2)));

// --- Retour au code commun (codes personnels retirés) ---
r = J(c.definirPin("666666", jm2));
assert.ok(r.ok);
assert.deepStrictEqual(J(c.etatAdmin()), { pinDefini: true, codePersonnel: false, comptes: true });
assert.deepStrictEqual(derniere().slice(1, 3), [
  "Caisse test · Marie",
  "Retour au code commun (codes personnels retirés)",
]);
sansPause();
const jc = { j: J(c.ouvrirSessionAdmin("666666", sa)).jeton, c: sa };
assert.ok(J(c.getInfosAdmin(jc)).config);
// du code commun vers les codes personnels : jeton exigé, code commun retiré
assert.throws(() => c.passerCodesPersonnels("Marie", "111111", null, sa), /ADMIN_REQUIS/);
assert.ok(J(c.passerCodesPersonnels("Marie", "111111", jc)).ok);
assert.ok(!P.ADMIN_PIN_HASH);
assert.throws(() => c.getInfosAdmin(jc), /ADMIN_REQUIS/, "espace ouvert avec le code commun : refermé");

// --- Panneau du Sheet : « Réinitialiser le code » retire aussi les codes personnels ;
// l'espace ne s'ouvre plus sans en choisir un nouveau (code obligatoire) ---
assert.strictEqual(typeof c.retirerCodeResponsable, "undefined", "plus de « ne plus demander de code »");
env.activeEmail = "editeur@example.com";
c.reinitialiserPinPanneau();
env.activeEmail = "";
assert.deepStrictEqual(J(c.etatAdmin()), { pinDefini: false, codePersonnel: false, comptes: true });
assert.ok(J(c.ouvrirSessionAdmin("", sa)).codeACreer, "sans code : en choisir un d'abord");
assert.ok(J(c.passerCodesPersonnels("Marie", "111111", null, sa)).ok, "rechoisi par un compte connecté");
assert.match(J(c.ouvrirSessionAdmin("111111", sa)).message, /Choisissez votre nom/);

console.log("test_personnes : OK");
