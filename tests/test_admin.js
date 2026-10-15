const assert = require("assert");
const { makeEnv } = require("./mocks");
const J = (x) => JSON.parse(JSON.stringify(x));
const env = makeEnv({ repo: process.argv[2] });
const c = env.ctx;
const doitRefuser = (f) => assert.throws(f, /ADMIN_REQUIS/);

// Avant création : pas de code
assert.strictEqual(c.etatAdmin().pinDefini, false);
assert.strictEqual(c.ouvrirSessionAdmin("123456").ok, false);
// Fonctions protégées refusées sans jeton (visiteur web app : pas d'e-mail)
doitRefuser(() => c.setDatesOperation("2026-01-01", "2026-01-10", null));
doitRefuser(() => c.basculerModeAnnuaire());
doitRefuser(() => c.setConfig({ NOM_OFFRE: "X" }, "faux-jeton"));
doitRefuser(() => c.getInfosAdmin(undefined));
doitRefuser(() => c.archiverOffreWebApp(""));
// Création : format vérifié
assert.strictEqual(c.definirPin("12a4", null).ok, false);
assert.strictEqual(c.definirPin("123", null).ok, false);
assert.strictEqual(c.definirPin("1234", null).ok, false, "4 chiffres refusés");
assert.strictEqual(c.definirPin("1234567", null).ok, false, "7 chiffres refusés");
// Création : réservée à un compte connecté (ou au panneau du Sheet)
assert.match(c.definirPin("258025", null).message, /Connectez-vous avec un compte/);
assert.match(c.definirPin("258025", null, "S1.bidon").message, /Connectez-vous avec un compte/);
assert.strictEqual(c.etatAdmin().pinDefini, false);
const session = env.connecter();
const r0 = J(c.definirPin("258025", null, session));
assert.ok(r0.ok && r0.jeton);
const r = { jeton: { j: r0.jeton, c: session } }; // jeton lié au compte : envoyé avec sa session
assert.ok(!JSON.stringify(env.props._store).includes("258025"), "code stocké en clair !");
// Changement sans jeton refusé une fois le code défini
doitRefuser(() => c.definirPin("999999", null));
// Jeton valide -> actions autorisées
c.setDatesOperation("2026-01-01", "2026-01-10", r.jeton);
assert.strictEqual(env.props._store.DATE_FIN, "2026-01-10");
assert.strictEqual(c.basculerModeAnnuaire(r.jeton), "B");
// setConfig : validation
const cfg = J(
  c.setConfig({ NOM_OFFRE: "  Bons cadeaux ", MONTANT_OBLIGATOIRE: "NON", INCONNU: "x" }, r.jeton)
);
assert.strictEqual(cfg.NOM_OFFRE, "Bons cadeaux");
assert.strictEqual(cfg.MONTANT_OBLIGATOIRE, "NON");
assert.ok(!("CFG_INCONNU" in env.props._store));
assert.throws(() => c.setConfig({ NOM_STRUCTURE: "  " }, r.jeton), /vide/);
assert.throws(() => c.setConfig({ LIBELLE_NOTES: "x".repeat(101) }, r.jeton), /100/);
assert.strictEqual(J(c.setConfig({ PRECISION_NOTES: "" }, r.jeton)).PRECISION_NOTES, ""); // facultatif vide OK
// Fermeture de session -> jeton invalide
c.fermerSessionAdmin(r.jeton);
doitRefuser(() => c.getInfosAdmin(r.jeton));
// Ouverture : code juste / faux / blocage après 5 essais
const ok = J(c.ouvrirSessionAdmin("258025"));
assert.ok(ok.ok && ok.jeton);
const ESSAIS = "PIN_ESSAIS_EDITEUR"; // ouvrirSessionAdmin sans tablette (contrôle neutralisé ici)
const etat = () => JSON.parse(env.props._store[ESSAIS] || "{}");
const sansPause = () => {
  const e = etat();
  e.dernier = 0;
  env.props._store[ESSAIS] = JSON.stringify(e);
};
// Pause de 10 s imposée par le serveur après un code faux (même le bon code est refusé)
assert.match(c.ouvrirSessionAdmin("000000").message, /essai/);
assert.match(c.ouvrirSessionAdmin("258025").message, /Patientez \d+ s/);
assert.match(c.ouvrirSessionAdmin("000000").message, /Patientez/, "un essai pendant la pause ne compte pas");
for (let i = 2; i <= 4; i++) {
  sansPause();
  assert.match(c.ouvrirSessionAdmin("000000").message, new RegExp(5 - i + " essai"));
}
sansPause();
assert.match(c.ouvrirSessionAdmin("000000").message, /bloqué 15 min/);
assert.match(c.ouvrirSessionAdmin("258025").message, /Réessayez/); // même le bon code est bloqué
{
  const e = etat();
  e.bloque = Date.now() - 1;
  env.props._store[ESSAIS] = JSON.stringify(e);
}
sansPause(); // fin du blocage
assert.ok(c.ouvrirSessionAdmin("258025").ok);
// Changement de code avec jeton
assert.ok(c.definirPin("135791", ok.jeton).ok);
assert.strictEqual(c.ouvrirSessionAdmin("258025").ok, false);
sansPause();
assert.ok(c.ouvrirSessionAdmin("135791").ok);
// Jeton expiré (TTL)
const j2 = c.ouvrirSessionAdmin("135791").jeton;
env.cacheStore["ADM_" + j2].exp = Date.now() - 1;
doitRefuser(() => c.getInfosAdmin(j2));
// Panneau du Sheet : éditeur -> passe sans jeton ; reset du code
assert.throws(() => c.reinitialiserPinPanneau(), /Google Sheets/);
env.activeEmail = "editeur@example.com";
c.setDatesOperation("", "", undefined);
const reset = c.reinitialiserPinPanneau();
assert.match(reset, /effacé/);
assert.strictEqual(c.etatAdmin().pinDefini, false);
// Un compte existe : pas de code d'activation ; un compte connecté choisit le nouveau code
assert.doesNotMatch(reset, /\d{4}-\d{4}/);
env.activeEmail = "";
assert.ok(c.definirPin("246802", null, session).ok, "code recréé par un compte connecté");
assert.ok(c.ouvrirSessionAdmin("246802").ok);
// Code d'activation (1er compte) : expiré / trop d'essais
const e2 = makeEnv({ repo: process.argv[2] });
e2.activation();
e2.props._store.ACTIVATION_EXPIRE = String(Date.now() - 1);
assert.match(e2.ctx.premierCompte("1234-5678", "Caisse 1", "motdepasse1").message, /expiré/);
const act = e2.activation();
for (let i = 0; i < 10; i++) e2.ctx.premierCompte("0000-0000", "Caisse 1", "motdepasse1");
assert.match(
  e2.ctx.premierCompte(act, "Caisse 1", "motdepasse1").message,
  /Trop d'essais/,
  "le bon code ne passe plus après 10 essais"
);
assert.strictEqual(e2.ctx.lireComptes_().length, 0);
env.activeEmail = "editeur@example.com";
c.reinitialiserPinPanneau();
assert.strictEqual(c.etatAdmin().pinDefini, false);
env.activeEmail = "inconnu@example.com";
doitRefuser(() => c.basculerModeAnnuaire());
// Montant : jamais une formule
assert.strictEqual(c.montantSur_('=IMPORTXML("http://x")'), '\'=IMPORTXML("http://x")');
assert.strictEqual(c.montantSur_(" +1"), "' +1");
assert.strictEqual(c.montantSur_("150,00 €"), "150,00 €");
console.log("test_admin : OK");
