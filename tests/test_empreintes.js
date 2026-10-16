// Journal à empreintes chaînées (une modification à la main se voit, vérifiée par le robot
// de nuit, alerte gardée jusqu'à ce que la direction la marque comme vue) et bandeau des
// changements récents (« qui peut faire quoi », 48 h, 5 lignes).
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => JSON.parse(JSON.stringify(x));
const nouvelEnv = (opts) => {
  const env = makeEnv(
    Object.assign(
      { repo: process.argv[2], props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" } },
      opts
    )
  );
  env.sheets.Saisies = new FakeSheet("Saisies", [
    ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
  ]);
  env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  return env;
};
let env = nouvelEnv();
let c = env.ctx;
const P = () => env.props._store;
const lignes = () => env.sheets._Journal.getDataRange().getValues().slice(1);
const nuit = () => {
  env.activeEmail = env.owner;
  c.verificationClotureNocturne();
  env.activeEmail = "";
};

// --- Écriture : 5e colonne « Empreinte », chaîne intacte ---
const session = env.connecter();
const jeton = env.creerCode("258025").jeton;
c.basculerModeWebApp(jeton);
c.basculerModeAnnuaire(jeton);
c.setConfig({ PASSAGES_MAX: "2" }, jeton);
const j = env.sheets._Journal;
assert.deepStrictEqual(j.getRange(1, 1, 1, 5).getValues()[0], [
  "Date et heure",
  "Qui",
  "Action",
  "Détail",
  "Empreinte",
]);
assert.ok(
  lignes().every((l) => typeof l[4] === "string" && l[4].length === 22),
  "empreinte sur chaque ligne"
);
assert.ok(
  lignes().every((l) => l[0].getMilliseconds() === 0),
  "heure à la seconde"
);
assert.strictEqual(c.verifierJournal_(), null);
assert.ok(P().JOURNAL_CLE && P().JOURNAL_DERNIERE === lignes()[lignes().length - 1][4]);
assert.ok(!JSON.stringify(lignes()).includes(P().JOURNAL_CLE), "clé jamais dans le journal");
nuit();
assert.ok(!P().JOURNAL_ALERTE, "journal intact : pas d'alerte");

// --- Une cellule modifiée à la main : vue par le robot de nuit, signalée UNE fois ---
const nb = lignes().length;
j.cells[2][3] = "Signaler → Signaler"; // ligne 3 : détail du mode changé
assert.deepStrictEqual(J(c.verifierJournal_()).ligne, 3);
nuit();
const alerte = JSON.parse(P().JOURNAL_ALERTE);
assert.match(
  alerte.texte,
  /^à partir de la ligne 3 \(action du \d\d\/\d\d\/\d{4} \d\d:\d\d\) : ligne modifiée/
);
assert.deepStrictEqual(lignes()[lignes().length - 1].slice(1, 3), [
  "Robot de nuit",
  "Journal modifié à la main",
]);
nuit();
assert.strictEqual(lignes().length, nb + 1, "une seule fois (alerte en attente)");
// visible dans l'espace responsable et le panneau du Sheet
assert.strictEqual(J(c.getInfosAdmin(jeton)).alerteJournal.texte, alerte.texte);
assert.throws(() => c.getSurveillancePanneau(), /Google Sheets/);
env.activeEmail = "editeur@example.com";
assert.strictEqual(J(c.getSurveillancePanneau()).alerteJournal.texte, alerte.texte);

// --- Vue par la direction (panneau) : journal rescellé, geste journalisé ---
env.activeEmail = "";
assert.throws(() => c.prendreEnCompteAlerteJournal(), /Google Sheets/, "réservé au Sheet");
env.activeEmail = "editeur@example.com";
assert.match(c.prendreEnCompteAlerteJournal(), /Alerte notée comme vue/);
assert.ok(!P().JOURNAL_ALERTE);
assert.deepStrictEqual(lignes()[lignes().length - 1].slice(1, 3), [
  "Panneau du Sheet (editeur@example.com)",
  "Alerte du journal vue (empreintes recalculées)",
]);
assert.match(lignes()[lignes().length - 1][3], /à partir de la ligne 3 .* · constatée le /);
assert.strictEqual(c.verifierJournal_(), null);
assert.strictEqual(c.prendreEnCompteAlerteJournal(), "Aucune alerte du journal.");
env.activeEmail = "";

// --- Autres retouches : ligne effacée au milieu, ajoutée, dernières lignes, onglet ---
const copie = j.cells.map((l) => l.slice());
const remettre = () => {
  j.cells = copie.map((l) => l.slice());
};
j.deleteRow(4);
assert.strictEqual(J(c.verifierJournal_()).ligne, 4, "ligne effacée : la suivante ne s'enchaîne plus");
remettre();
j.cells.splice(3, 0, [new Date(), "Caisse test", "Compte créé", "Faux", "AAAAAAAAAAAAAAAAAAAAAA"]);
assert.strictEqual(J(c.verifierJournal_()).ligne, 4, "ligne ajoutée");
remettre();
j.cells[3][0] = new Date(j.cells[3][0].getTime() + 60000);
assert.strictEqual(J(c.verifierJournal_()).ligne, 4, "heure changée");
remettre();
j.deleteRow(j.getLastRow());
assert.deepStrictEqual(J(c.verifierJournal_()), { fin: true }, "dernière ligne effacée");
remettre();
assert.strictEqual(c.verifierJournal_(), null);
const dern = P().JOURNAL_DERNIERE;
delete env.sheets._Journal;
assert.deepStrictEqual(J(c.verifierJournal_()), { absent: true });
nuit();
assert.match(JSON.parse(P().JOURNAL_ALERTE).texte, /onglet « _Journal » supprimé/);
env.sheets._Journal = j; // (le robot avait recréé un onglet pour noter l'alerte)
P().JOURNAL_DERNIERE = dern;
delete P().JOURNAL_ALERTE;

// --- Deux actions au même instant (sans verrou commun) : pas de fausse alerte ---
const avant = P().JOURNAL_DERNIERE;
c.journaliser_("Caisse test", "Essai", "un");
P().JOURNAL_DERNIERE = avant; // la 2e a lu la même « dernière » que la 1re
c.journaliser_("Caisse 2", "Essai", "deux");
assert.strictEqual(c.verifierJournal_(), null, "tolérance : chaînée à l'avant-dernière");

// --- Purge des 12 mois : la chaîne reste vérifiable (ancres) ---
const vieux = new Date();
vieux.setMonth(vieux.getMonth() - 13);
vieux.setMilliseconds(0);
j.cells.splice(1, 0, [vieux, "X", "Ancienne", ""], [vieux, "Y", "Ancienne 2", ""]);
c.rescellerJournal_(j);
assert.strictEqual(c.verifierJournal_(), null);
assert.strictEqual(c.purgerJournal_(), 2);
assert.strictEqual(c.verifierJournal_(), null, "après la purge, pas de fausse alerte");
assert.strictEqual(JSON.parse(P().JOURNAL_ANCRES).length, 3);
c.journaliser_("Caisse test", "Essai", "après purge");
assert.strictEqual(c.verifierJournal_(), null);
// tout purgé : vide mais intact ; puis une nouvelle ligne
for (let i = 2; i <= j.getLastRow(); i++) j.cells[i - 1][0] = vieux;
c.rescellerJournal_(j);
c.purgerJournal_();
assert.strictEqual(j.getLastRow(), 1);
assert.strictEqual(c.verifierJournal_(), null, "journal vide après purge : intact");
c.journaliser_("Caisse test", "Essai", "repart");
assert.strictEqual(c.verifierJournal_(), null);
// toutes les lignes effacées à la main (hors purge) : vu
j.deleteRows(2, 1);
assert.deepStrictEqual(J(c.verifierJournal_()), { fin: true });

// --- Journal d'avant les empreintes (4 colonnes) : scellé tel quel au 1er ajout ---
env = nouvelEnv();
c = env.ctx;
env.sheets._Journal = new FakeSheet("_Journal", [
  ["Date et heure", "Qui", "Action", "Détail"],
  [new Date(Date.now() - 3600000), "Caisse test", "Code responsable créé", ""],
]);
env.sheets._Journal.hidden = true;
c.journaliser_("Caisse test", "Mode de sécurité", "Signaler → Bloquant");
assert.strictEqual(env.sheets._Journal.getRange(1, 5).getValue(), "Empreinte");
assert.strictEqual(lignes().length, 2);
assert.ok(lignes().every((l) => l[4].length === 22));
assert.strictEqual(c.verifierJournal_(), null);

// --- Nouvelle copie d'un Sheet (propriétés et clé effacées) : « Installer » rescelle ---
const cellules = env.sheets._Journal.cells.map((l) => l.slice());
env = nouvelEnv({ idClasseur: "AUTRE" });
c = env.ctx;
env.props._store.ID_CLASSEUR = "ID-ORIGINE";
env.sheets._Journal = new FakeSheet("_Journal");
env.sheets._Journal.cells = cellules;
env.activeEmail = env.owner;
assert.match(c.installer(), /Journal des actions : empreintes recalculées \(nouvelle copie\)/);
assert.strictEqual(c.verifierJournal_(), null);
assert.doesNotMatch(c.installer(), /empreintes/, "une seule fois");
env.activeEmail = "";

// --- Changements récents : « qui peut faire quoi », 48 h, 5 lignes, non effaçables ---
env = nouvelEnv({ sessionReelle: true });
c = env.ctx;
const sa = env.connecter();
// début attendu (expression régulière), puis « — le jj/mm à hh h mm par … »
function lignesTexte(t, debut) {
  assert.match(t, new RegExp("^" + debut + " — le \\d\\d/\\d\\d à \\d\\d h \\d\\d par "));
}
let ch = c.changementsRecents_();
assert.strictEqual(ch.lignes.length, 1);
lignesTexte(ch.lignes[0], "Premier compte créé \\(code d'activation\\) : Caisse test");
assert.match(ch.lignes[0], / par Caisse test$/);
assert.ok(J(c.passerCodesPersonnels("Marie", "111111", null, sa)).ok);
const noms = J(c.personnesResponsables(sa));
const jm = { j: J(c.ouvrirSessionAdmin("111111", sa, noms[0].id)).jeton, c: sa };
c.basculerModeWebApp(jm); // pas un changement de « qui peut faire quoi »
c.setConfig({ PASSAGES_MAX: "3" }, jm);
assert.strictEqual(J(c.getInfosAdmin(jm)).changements.lignes.length, 2, "mode, réglages : journal seulement");
assert.ok(J(c.ajouterPersonne("Paul", "222222", jm)).ok);
ch = J(c.getInfosAdmin(jm)).changements;
lignesTexte(ch.lignes[0], "Personne ajoutée \\(code personnel\\) : Paul");
assert.match(ch.lignes[0], / par Caisse test · Marie$/);
lignesTexte(ch.lignes[1], "Codes personnels activés : première personne : Marie");
// retour au code commun (possible dans l'appli : option A+), visible de tous
assert.ok(J(c.definirPin("333333", jm)).ok);
ch = J(c.getInfosAdmin({ j: J(c.ouvrirSessionAdmin("333333", sa)).jeton, c: sa })).changements;
lignesTexte(ch.lignes[0], "Retour au code commun \\(codes personnels retirés\\)");
assert.strictEqual(ch.lignes.length, 4);
// effacer la ligne du journal n'efface pas le bandeau
env.sheets._Journal.deleteRow(env.sheets._Journal.getLastRow());
const jc = { j: J(c.ouvrirSessionAdmin("333333", sa)).jeton, c: sa };
assert.strictEqual(J(c.getInfosAdmin(jc)).changements.lignes.length, 4);
// 5 lignes au plus, les autres comptées
const jz = { j: J(c.passerCodesPersonnels("Marie", "111111", jc)).jeton, c: sa };
c.ajouterPersonne("Zoé", "444444", jz);
ch = J(c.getInfosAdmin(jz)).changements;
assert.strictEqual(ch.lignes.length, 5);
assert.strictEqual(ch.autres, 1);
lignesTexte(ch.lignes[0], "Personne ajoutée \\(code personnel\\) : Zoé");
// panneau du Sheet : mêmes changements, et ses propres gestes y figurent
env.activeEmail = "editeur@example.com";
c.reinitialiserPinPanneau();
ch = J(c.getSurveillancePanneau()).changements;
lignesTexte(ch.lignes[0], "Code responsable réinitialisé");
assert.match(ch.lignes[0], /par Panneau du Sheet \(editeur@example\.com\)$/);
env.activeEmail = "";
// au-delà de 48 h : disparu
const brut = JSON.parse(env.props._store.CHANGEMENTS_RECENTS);
brut.forEach((x, i) => {
  if (i < brut.length - 1) x.t -= 49 * 3600000;
});
env.props._store.CHANGEMENTS_RECENTS = JSON.stringify(brut);
env.activeEmail = "editeur@example.com";
assert.strictEqual(J(c.getSurveillancePanneau()).changements.lignes.length, 1);
assert.strictEqual(J(c.getSurveillancePanneau()).changements.autres, 0);
env.activeEmail = "";
// la page ne lit pas les changements sans l'espace responsable
assert.throws(() => c.getInfosAdmin(null), /ADMIN_REQUIS/);

console.log("test_empreintes : OK");
