// Journal des actions sensibles : onglet masqué « _Journal » (date à la seconde, qui,
// action, détail), jamais de mot de passe ni de code, effacé après 12 mois.
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const env = makeEnv({
  repo: process.argv[2],
  props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" },
});
env.sheets.Saisies = new FakeSheet("Saisies", [
  ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
]);
env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
const c = env.ctx;
const lignes = () => (env.sheets._Journal ? env.sheets._Journal.getDataRange().getValues().slice(1) : []);
const derniere = () => {
  const l = lignes();
  return l[l.length - 1];
};
const att = (nom, prenom, piece) => ({ nom, prenom, piece });

const session = env.connecter(); // compte « Caisse test »
const jeton = env.creerCode("258025").jeton;
assert.deepStrictEqual(derniere().slice(1, 3), ["Caisse test", "Code responsable créé"]);
const j = env.sheets._Journal;
assert.ok(j.hidden, "onglet masqué");
assert.deepStrictEqual(j.getRange(1, 1, 1, 4).getValues()[0], ["Date et heure", "Qui", "Action", "Détail"]);
assert.ok(derniere()[0] instanceof Date, "date et heure (à la seconde)");

// Saisie normale : rien au journal ; ajout forcé : par quel compte
c.traiterSaisie("DUPONT", "JEAN", "AB123", "150", "", session);
const avant = lignes().length;
c.traiterSaisie("MARTIN", "PAUL", "CD456", "20", "", session);
assert.strictEqual(lignes().length, avant, "une saisie ordinaire n'est pas journalisée");
assert.strictEqual(
  J(c.forcerSaisie("DUPONT", "JEAN", "AB123", "10", "", "", false, false, session)).status,
  "SUCCES"
);
assert.deepStrictEqual(derniere().slice(1), [
  "Caisse test",
  "Ajout forcé (cas A)",
  "DUPONT JEAN · pièce AB123 · 10",
]);

// Correction : seulement ce qui change, avant → après
c.modifierSaisie(
  3,
  att("MARTIN", "PAUL", "CD456"),
  { nom: "MARTIN", prenom: "PIERRE", piece: "CD456", montant: "25" },
  false,
  jeton
);
assert.strictEqual(derniere()[2], "Correction d'une saisie");
assert.match(
  derniere()[3],
  /^MARTIN PAUL \(saisie le .+\) : Prénom : « PAUL » → « PIERRE » ; Montant : « 20 » → « 25 »$/
);
// Suppression : le contenu supprimé
c.supprimerSaisie(3, att("MARTIN", "PIERRE", "CD456"), jeton);
assert.strictEqual(derniere()[2], "Suppression d'une saisie");
assert.match(derniere()[3], /^MARTIN PIERRE · pièce CD456 · 25 · saisie le /);

// Mode, réglages (seulement les changés), dates, pré-remplissage
c.basculerModeWebApp(jeton);
assert.deepStrictEqual(derniere().slice(2), ["Mode de sécurité", "Signaler → Bloquant"]);
const nbAvantReglages = lignes().length;
c.setConfig({ NOM_OFFRE: c.getConfig().NOM_OFFRE }, jeton);
assert.strictEqual(lignes().length, nbAvantReglages, "réglage inchangé : rien au journal");
c.setConfig({ NOM_OFFRE: "Bons cadeaux", PASSAGES_MAX: "2" }, jeton);
assert.strictEqual(derniere()[2], "Réglages");
assert.match(derniere()[3], /NOM_OFFRE : « .+ » → « Bons cadeaux » ; PASSAGES_MAX : « 1 » → « 2 »/);
c.setDatesOperation("2026-12-01", "2026-12-24", jeton);
assert.deepStrictEqual(derniere().slice(2), [
  "Dates de l'offre",
  "du 01/01/2000 au 31/12/2099 → du 01/12/2026 au 24/12/2026",
]);
c.basculerModeAnnuaire(jeton);
assert.strictEqual(derniere()[2], "Pré-remplissage (anciens clients)");

// Comptes et code responsable (jamais le mot de passe ni le code)
c.creerCompte("Caisse 2", "motdepasse2", jeton);
assert.deepStrictEqual(derniere().slice(1), ["Caisse test", "Compte créé", "Caisse 2"]);
const id2 = c.lireComptes_().find((x) => x.identifiant === "Caisse 2").id;
c.changerMotDePasse(id2, "nouveau-mdp2", jeton);
assert.deepStrictEqual(derniere().slice(2), ["Mot de passe changé", "Caisse 2"]);
for (let i = 0; i < 5; i++) {
  for (const k in env.props._store)
    if (k.indexOf("CPT_ESSAIS_") === 0) {
      const e = JSON.parse(env.props._store[k]);
      e.dernier = 0;
      env.props._store[k] = JSON.stringify(e);
    }
  c.connexion("Caisse 2", "mauvais!!");
}
assert.deepStrictEqual(derniere().slice(1), [
  "Écran de connexion",
  "Compte bloqué 15 min (5 mots de passe faux)",
  "Caisse 2",
]);
c.retirerCompte(id2, jeton);
assert.deepStrictEqual(derniere().slice(2), ["Compte retiré", "Caisse 2"]);
const j2 = J(c.definirPin("135790", jeton));
assert.deepStrictEqual(derniere().slice(1, 3), ["Caisse test", "Code responsable changé"]);
c.retirerCodeResponsable({ j: j2.jeton, c: session });
assert.deepStrictEqual(derniere().slice(1, 3), ["Caisse test", "Code responsable retiré"]);
env.activeEmail = "editeur@example.com";
c.reinitialiserPinPanneau();
assert.deepStrictEqual(derniere().slice(1, 3), [
  "Panneau du Sheet (editeur@example.com)",
  "Code responsable réinitialisé",
]);
c.reinitialiserComptesPanneau();
assert.deepStrictEqual(derniere().slice(2), [
  "Comptes réinitialisés (retour à la première installation)",
  "Caisse test retiré(s)",
]);
env.activeEmail = "";
const tout = JSON.stringify(lignes());
for (const secret of ["motdepasse-test", "nouveau-mdp2", "mauvais!!", "258025", "135790", "S1."])
  assert.ok(!tout.includes(secret), "jamais de mot de passe, de code ni de session : " + secret);

// Clôture (espace responsable, puis robot de nuit)
const s2 = env.connecter();
const jt = env.creerCode("246802").jeton;
c.traiterSaisie("BERNARD", "LUC", "EF789", "5", "", s2);
c.archiverOffreWebApp(jt);
assert.strictEqual(derniere()[2], "Clôture de l'offre");
env.props._store.DATE_FIN = "2000-01-02";
env.activeEmail = env.owner;
c.verificationClotureNocturne();
assert.deepStrictEqual(derniere().slice(1, 3), ["Robot de nuit", "Clôture automatique de l'offre"]);

// Péremption : lignes de plus de 12 mois effacées par le robot de nuit
const vieux = new Date();
vieux.setMonth(vieux.getMonth() - 13);
const recent = new Date();
recent.setMonth(recent.getMonth() - 11);
j.cells.splice(1, 0, [vieux, "X", "Ancienne", ""], [recent, "Y", "Récente", ""]);
const nb = lignes().length;
env.props._store.DATE_FIN = "";
c.verificationClotureNocturne();
assert.strictEqual(lignes().length, nb - 1, "seule la ligne de plus de 12 mois est effacée");
assert.strictEqual(lignes()[0][2], "Récente");

// Une panne du journal n'empêche JAMAIS l'action
env.activeEmail = "";
c.feuilleJournal_ = () => {
  throw new Error("Service Spreadsheets indisponible");
};
env.props._store.DATE_FIN = "2099-12-31";
env.props._store.DATE_DEBUT = "2000-01-01";
env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
const s3 = env.connecter();
assert.strictEqual(J(c.traiterSaisie("PETIT", "ANNE", "GH1", "5", "", s3)).status, "SUCCES");
assert.strictEqual(J(c.forcerSaisie("PETIT", "ANNE", "GH1", "5", "", "", false, false, s3)).status, "SUCCES");

console.log("test_journal : OK");
