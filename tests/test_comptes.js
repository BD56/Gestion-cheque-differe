// Comptes (identifiant + mot de passe) et sessions jusqu'à 3 h du matin
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
const sansPause = () => {
  for (const k in P)
    if (/^(CPT_ESSAIS_|PIN_ESSAIS_)/.test(k)) {
      const e = JSON.parse(P[k]);
      e.dernier = 0;
      P[k] = JSON.stringify(e);
    }
};
const finDe = (iso) => new Date(c.finDeSession_(new Date(iso))).toISOString();

// --- Fin de session : prochain 3 h du matin, heure de Paris (changements d'heure compris) ---
assert.strictEqual(finDe("2026-10-15T12:00:00Z"), "2026-10-16T01:00:00.000Z", "14 h → lendemain 3 h (été)");
assert.strictEqual(finDe("2026-10-15T00:30:00Z"), "2026-10-15T01:00:00.000Z", "2 h 30 → 3 h le jour même");
assert.strictEqual(finDe("2026-10-15T01:00:00Z"), "2026-10-16T01:00:00.000Z", "3 h pile → lendemain");
assert.strictEqual(
  finDe("2026-10-24T20:00:00Z"),
  "2026-10-25T02:00:00.000Z",
  "nuit du passage à l'heure d'hiver"
);
assert.strictEqual(
  finDe("2027-03-27T19:00:00Z"),
  "2027-03-28T01:00:00.000Z",
  "nuit du passage à l'heure d'été"
);
assert.strictEqual(finDe("2026-12-31T22:30:00Z"), "2027-01-01T02:00:00.000Z", "changement d'année");

// --- 1re installation : aucun compte, code d'activation exigé ---
assert.deepStrictEqual(J(c.etatAdmin()), { pinDefini: false, comptes: false });
// Sans session : tout ce que la page utilise est refusé (un lien qui fuite ne donne rien)
for (const f of [
  () => c.traiterSaisie("A", "B", "P1", "1", ""),
  () => c.forcerSaisie("A", "B", "P1", "1", "", "", false, false),
  () => c.chargerCacheVerif(),
  () => c.verifierPiece("P1"),
  () => c.genererDonneesImpression("offre", ""),
  () => c.getDatesOperation(),
  () => c.getInfosPanneau(),
  () => c.demarrage(),
  () => c.ouvrirSessionAdmin("258025", "x".repeat(64)),
  () => c.apercuResponsable("x".repeat(64)),
])
  assert.throws(f, /CONNEXION_REQUISE/);
assert.match(J(c.premierCompte("", "Caisse centrale 1", "motdepasse1")).message, /Code d'activation requis/);
const act = env.activation();
assert.match(J(c.premierCompte(act, "  ", "motdepasse1")).message, /Choisissez un identifiant/);
assert.match(J(c.premierCompte(act, "Caisse centrale 1", "court")).message, /au moins 8 caractères/);
assert.match(J(c.premierCompte("0000-0000", "Caisse centrale 1", "motdepasse1")).message, /incorrect/);
let r = J(c.premierCompte(act, "  Caisse centrale 1  ", "motdepasse1"));
assert.ok(r.ok, JSON.stringify(r));
assert.strictEqual(r.compte.identifiant, "Caisse centrale 1");
const s1 = r.session;
const id1 = r.compte.id;
assert.match(s1, /^S1\./);
assert.ok(!JSON.stringify(P).includes("motdepasse1"), "mot de passe jamais stocké en clair");
assert.ok(!JSON.stringify(P).includes(s1), "session jamais stockée");
assert.ok(!P.ACTIVATION_HASH, "code d'activation à usage unique");
assert.deepStrictEqual(J(c.etatAdmin()), { pinDefini: false, comptes: true });
assert.match(J(c.premierCompte(env.activation(), "Autre", "motdepasse2")).message, /Un compte existe déjà/);
// Le 1er compte reçoit un jeton responsable (code d'activation = accès au Sheet)
assert.ok(r.jeton, "jeton de la 1re installation");
assert.ok(J(c.getInfosAdmin({ j: r.jeton, c: s1 })).config);

// --- La session ouvre tout ce que la page utilise ---
assert.strictEqual(J(c.traiterSaisie("DUPONT", "JEAN", "P1", "10", "", s1)).status, "SUCCES");
assert.strictEqual(J(c.chargerCacheVerif(s1)).offre.length, 1);
assert.ok(P["COMPTE_VUE_" + id1], "dernière utilisation notée");
const refuse = (f) => assert.throws(f, /CONNEXION_REQUISE/);
refuse(() => c.chargerCacheVerif("S1.bidon"));
const m = s1.split(".");
refuse(() => c.chargerCacheVerif([m[0], m[1], m[2], Number(m[3]) + 86400000, m[4]].join(".")));
refuse(() => c.chargerCacheVerif(s1.slice(0, -2) + "xx"));
// session échue (signée, mais 3 h passé)
const corpsEchu = ["S1", id1, 1, Date.now() - 1000].join(".");
refuse(() => c.chargerCacheVerif(corpsEchu + "." + c.signatureSession_(P.SESSION_SECRET, corpsEchu)));
// le panneau du Sheet (éditeur) passe toujours
env.activeEmail = "editeur@example.com";
c.chargerCacheVerif("S1.bidon");
env.activeEmail = "";

// --- Connexion ---
assert.match(J(c.connexion("Inconnu", "motdepasse1")).message, /Identifiant inconnu/);
r = J(c.connexion("caisse CENTRALE-1", "motdepasse1"));
assert.ok(r.ok, "identifiant sans tenir compte des majuscules, accents, tirets");
assert.strictEqual(r.compte.id, id1);
c.chargerCacheVerif(r.session);
assert.match(J(c.connexion("Caisse centrale 1", "mauvais!!")).message, /4 essai\(s\) restant\(s\)/);
assert.match(J(c.connexion("Caisse centrale 1", "motdepasse1")).message, /Patientez/, "pause de 10 s");
sansPause();
assert.ok(J(c.connexion("Caisse centrale 1", "motdepasse1")).ok, "bon mot de passe : compteur remis à zéro");
assert.ok(!P["CPT_ESSAIS_" + id1]);

// --- Espace responsable sans code à part : un compte connecté l'ouvre directement ---
r = J(c.ouvrirSessionAdmin("", s1));
assert.ok(r.ok && r.jeton);
const adm1 = { j: r.jeton, c: s1 };
assert.ok(J(c.getInfosAdmin(adm1)).chiffres);
// … et crée d'autres comptes
assert.match(J(c.creerCompte("caisse centrale 1", "motdepasse2", adm1)).message, /existe déjà/);
assert.match(J(c.creerCompte("Caisse centrale 2", "court", adm1)).message, /au moins 8/);
r = J(c.creerCompte("Caisse centrale 2", "motdepasse2", adm1));
assert.ok(r.ok);
const id2 = r.compte.id;
assert.throws(() => c.creerCompte("Pirate", "motdepasse3", null), /ADMIN_REQUIS/);
const s2 = J(c.connexion("Caisse centrale 2", "motdepasse2")).session;
// jeton lié au compte : inutile avec la session d'un autre
assert.throws(() => c.getInfosAdmin({ j: adm1.j, c: s2 }), /ADMIN_REQUIS/);
const liste = J(c.listerComptes(adm1));
assert.deepStrictEqual(
  liste.map((x) => x.identifiant),
  ["Caisse centrale 1", "Caisse centrale 2"]
);
assert.ok(!JSON.stringify(liste).match(/hash|sel/), "ni empreinte ni sel");
assert.ok(liste[0].vueLe);

// --- Blocage PAR COMPTE : les erreurs sur l'un ne bloquent pas l'autre ---
for (let i = 0; i < 5; i++) {
  sansPause();
  c.connexion("Caisse centrale 2", "mauvais!!");
}
assert.match(J(c.connexion("Caisse centrale 2", "motdepasse2")).message, /bloqué|Trop d'essais/);
assert.ok(J(c.connexion("Caisse centrale 1", "motdepasse1")).ok, "l'autre compte n'est pas bloqué");
c.chargerCacheVerif(s2); // une session déjà ouverte reste valable

// --- Changer le mot de passe : les sessions ouvertes avec l'ancien tombent ---
r = J(c.changerMotDePasse(id2, "nouveau-mdp2", adm1, s1));
assert.ok(r.ok && !r.session, "pas le compte de l'appelant : pas de nouvelle session");
refuse(() => c.chargerCacheVerif(s2));
assert.ok(!P["CPT_ESSAIS_" + id2], "blocage levé avec le nouveau mot de passe");
assert.ok(J(c.connexion("Caisse centrale 2", "nouveau-mdp2")).ok);
c.chargerCacheVerif(s1); // les autres comptes ne sont pas touchés
r = J(c.changerMotDePasse(id1, "nouveau-mdp1", adm1, s1));
assert.ok(r.ok && r.session, "son propre compte : nouvelle session");
refuse(() => c.chargerCacheVerif(s1));
const s1b = r.session;
c.chargerCacheVerif(s1b);

// --- Code responsable « à part » : créé par un compte connecté, sans code d'activation ---
const adm1b = { j: J(c.ouvrirSessionAdmin("", s1b)).jeton, c: s1b };
assert.ok(J(c.definirPin("135790", null, s1b)).ok, "création du code par un compte connecté");
assert.strictEqual(c.etatAdmin().pinDefini, true);
assert.match(J(c.ouvrirSessionAdmin("", s1b)).message, /Code faux/, "désormais le code est demandé");
sansPause();
r = J(c.ouvrirSessionAdmin("135790", s1b));
assert.ok(r.ok);
assert.ok(!P["PIN_ESSAIS_C_" + id1], "compteur du code propre au compte");
// retirer le code : seulement un compte connecté, espace ouvert
assert.throws(() => c.retirerCodeResponsable(null, s1b), /ADMIN_REQUIS/);
assert.ok(J(c.retirerCodeResponsable({ j: r.jeton, c: s1b }, s1b)).ok);
assert.strictEqual(c.etatAdmin().pinDefini, false);
assert.ok(J(c.ouvrirSessionAdmin("", s1b)).ok);

// --- Retirer un compte : ses sessions tombent ; jamais le dernier ---
const s2b = J(c.connexion("Caisse centrale 2", "nouveau-mdp2")).session;
assert.ok(J(c.retirerCompte(id2, adm1b)).ok);
refuse(() => c.chargerCacheVerif(s2b));
assert.match(J(c.connexion("Caisse centrale 2", "nouveau-mdp2")).message, /Identifiant inconnu/);
assert.match(J(c.retirerCompte(id1, adm1b)).message, /dernier compte/);
assert.ok(!Object.keys(P).some((k) => k.endsWith(id2)), "propriétés du compte retiré effacées");

// --- Secours (panneau du Sheet) : tout retirer, retour à la 1re installation ---
assert.throws(() => c.reinitialiserComptesPanneau(), /Réservé/);
env.activeEmail = "editeur@example.com";
assert.match(c.reinitialiserComptesPanneau(), /première installation[\s\S]*Code d'activation : \d{4}-\d{4}/);
env.activeEmail = "";
refuse(() => c.chargerCacheVerif(s1b));
assert.deepStrictEqual(J(c.etatAdmin()), { pinDefini: false, comptes: false });
assert.ok(!Object.keys(P).some((k) => /^(COMPTE|CPT_|SESSION_)/.test(k)));
// une ancienne session, même rejouée après un nouveau 1er compte, ne sert plus (nouveau secret)
assert.ok(J(c.premierCompte(env.activation(), "Caisse centrale 1", "motdepasse1")).ok);
refuse(() => c.chargerCacheVerif(s1b));

// --- Ancienne clé d'appareil (avant les comptes) : refusée ---
refuse(() => c.chargerCacheVerif("0123456789abcdef".repeat(4)));

// --- Ce que la session donne : démarrage, aperçu, impression ---
const s3 = J(c.connexion("Caisse centrale 1", "motdepasse1")).session;
const dem = J(c.demarrage(s3));
assert.ok(dem.config && dem.config.PASSAGES_MAX, "réglages envoyés à la page");
assert.ok(!JSON.stringify(dem).includes("docs.google.com"), "pas d'adresse du Sheet");
assert.ok(J(c.genererDonneesImpression("offre", "", s3)).length >= 1);
assert.strictEqual(J(c.chargerCacheVerif(s3, true)).annuaire, null, "rechargement léger sans l'annuaire");
assert.notStrictEqual(J(c.chargerCacheVerif(s3)).annuaire, null);
// Aperçu de l'espace responsable (avant le code) : lectures seulement, rien de la sécurité
const nbRobots = c.ScriptApp.getProjectTriggers().length;
const ap = J(c.apercuResponsable(s3));
assert.ok(ap.saisies.length >= 1 && ap.chiffres && ap.config && ap.dates && Array.isArray(ap.archives));
assert.deepStrictEqual(
  ap.comptes.map((x) => x.identifiant),
  ["Caisse centrale 1"]
);
assert.ok(!("robots" in ap), "rien de la sécurité avant le code");
assert.ok(!/hash|"sel"|SESSION/.test(JSON.stringify(ap)), "ni empreinte, ni sel, ni secret");
assert.strictEqual(c.ScriptApp.getProjectTriggers().length, nbRobots, "aucun robot recréé");
// Jeton responsable seul (sans la session) : refusé
const jt = J(c.ouvrirSessionAdmin("", s3)).jeton;
assert.ok(J(c.getInfosAdmin({ j: jt, c: s3 })).config);
assert.throws(() => c.getInfosAdmin(jt), /ADMIN_REQUIS/);

// --- Menu du Sheet « 🔑 Code d'activation » : selon les COMPTES (pas le code responsable) ---
env.activeEmail = "editeur@example.com";
env.alertes.length = 0;
c.afficherCodeActivation();
assert.match(env.alertes[0], /Un compte existe déjà/);
const env2 = makeEnv({ repo: process.argv[2], sessionReelle: true });
env2.activeEmail = "editeur@example.com";
env2.props._store.ADMIN_PIN_HASH = "ancien-code"; // ancien Sheet : code responsable déjà là, aucun compte
env2.ctx.afficherCodeActivation();
assert.match(env2.alertes[0], /Code d'activation : \d{4}-\d{4}[\s\S]*créer le compte de la caisse centrale/);
env.activeEmail = "";

console.log("✅ test_comptes : OK");
