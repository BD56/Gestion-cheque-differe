const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const repo = process.argv[2];

// 1) Vannes (jamais marqué) : la marque est posée, RIEN n'est effacé
let env = makeEnv({
  repo,
  idClasseur: "VANNES",
  props: {
    DATE_DEBUT: "2026-10-01",
    DATE_FIN: "2026-10-20",
    MODE_ANNUAIRE: "B",
    ADMIN_PIN_HASH: "h",
    ADMIN_PIN_SEL: "s",
  },
  sheets: {
    Saisies: new FakeSheet("Saisies", [["Date", "Nom", "Prénom", "N° Pièce", "Montant", "CODE ", ""]]),
    _Annuaire: new FakeSheet("_Annuaire", [["Piece", "Nom", "Prenom", "DerniereVue"]]),
  },
  triggers: ["verificationClotureNocturne", "purgerAnnuaire"],
  activeEmail: "proprio@example.com",
});
env.ctx.onOpen();
assert.strictEqual(env.sidebars, 1, "Vannes : panneau ouvert comme avant");
assert.deepStrictEqual(env.menus, [
  "afficherPanneau",
  "ouvrirAssistant",
  "ouvrirTablettes",
  "installerDepuisMenu",
  "afficherCodeActivation",
  "passerLaMainDepuisMenu",
]);
assert.strictEqual(
  env.ctx.installer().replace(/\nVersion .*$/, ""),
  "« Saisies » : avertissement avant toute modification à la main."
);
assert.strictEqual(env.props._store.ID_CLASSEUR, "VANNES");
assert.strictEqual(env.props._store.DATE_FIN, "2026-10-20");
assert.strictEqual(env.props._store.ADMIN_PIN_HASH, "h");
// relancer + doGet : toujours rien d'effacé
env.ctx.installer();
assert.strictEqual(env.props._store.MODE_ANNUAIRE, "B");

// 2) Modèle : créé vierge puis installé -> marqué avec son propre ID
env = makeEnv({
  repo,
  idClasseur: "MODELE",
  sheets: { "Feuille 1": new FakeSheet("Feuille 1") },
  activeEmail: "proprio@example.com",
});
env.ctx.installerDepuisMenu();
assert.match(env.alertes[0], /Saisies/);
assert.match(env.alertes[0], /▶ Assistant d'installation/);
assert.match(
  env.alertes[0],
  /Code d'activation : \d{4}-\d{4}/,
  "code d'activation affiché (aucun code responsable)"
);
assert.strictEqual(env.props._store.ID_CLASSEUR, "MODELE");

// 3) Copie du modèle, cas où Google recopie les propriétés (+ restes accidentels)
const heritees = {
  ID_CLASSEUR: "MODELE",
  ADMIN_PIN_HASH: "h",
  ADMIN_PIN_SEL: "s",
  DATE_DEBUT: "2026-01-01",
  DATE_FIN: "2026-01-02",
  CFG_NOM_STRUCTURE: "Bryan test",
};
env = makeEnv({
  repo,
  idClasseur: "COPIE-X",
  props: Object.assign({}, heritees),
  activeEmail: "proprio@example.com",
  sheets: {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    ]),
  },
});
env.ctx.onOpen();
assert.strictEqual(env.sidebars, 0, "copie non installée : pas de panneau");
assert.match(env.toasts[0], /onglet « Démarrer », bouton vert « Installer l'application »/);
const rap = env.ctx.installer();
assert.match(rap, /Nouvelle copie détectée/);
assert.match(rap, /clôture/);
assert.deepStrictEqual(Object.keys(env.props._store), ["ID_CLASSEUR"]);
assert.strictEqual(env.props._store.ID_CLASSEUR, "COPIE-X");
assert.strictEqual(env.ctx.etatAdmin().pinDefini, false);
assert.strictEqual(env.ctx.getConfig().NOM_STRUCTURE, "l'Hypermarché Carrefour Vannes");
env.ctx.onOpen();
assert.strictEqual(env.sidebars, 1, "après installation : panneau normal");

// 4) Même copie, mais la tablette est ouverte AVANT l'installation : doGet nettoie aussi
env = makeEnv({
  repo,
  idClasseur: "COPIE-Y",
  props: Object.assign({}, heritees),
  activeEmail: "proprio@example.com",
});
env.ctx.HtmlService = {
  ...env.ctx.HtmlService, // garde les vrais fichiers (contrôle de l'installation)
  createTemplateFromFile: () => ({
    evaluate: () => ({
      setTitle() {
        return this;
      },
      addMetaTag() {
        return this;
      },
    }),
  }),
};
env.ctx.doGet({});
assert.deepStrictEqual(Object.keys(env.props._store), ["ID_CLASSEUR"]);
// Une fois installée et utilisée, la copie n'est plus jamais effacée
env.props.setProperty("DATE_FIN", "2026-12-31");
env.ctx.doGet({});
env.ctx.installer();
assert.strictEqual(env.props._store.DATE_FIN, "2026-12-31");

// 5) Copie où Google ne recopie PAS les propriétés : rien d'hérité, simple marquage
env = makeEnv({ repo, idClasseur: "COPIE-Z", activeEmail: "proprio@example.com" });
assert.doesNotMatch(env.ctx.installer(), /Nouvelle copie/);
assert.strictEqual(env.props._store.ID_CLASSEUR, "COPIE-Z");
console.log("test_modele : OK");
