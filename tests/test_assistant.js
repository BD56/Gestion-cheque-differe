// Assistant d'installation (Assistant.gs) : modèle préparé (onglet « Démarrer » + bouton),
// copie neuve, autorisation incomplète (case décochée), écrans de la fenêtre, fin.
const assert = require("assert");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const repo = process.argv[2];
const J = (x) => JSON.parse(JSON.stringify(x));
const EMAIL = "https://www.googleapis.com/auth/userinfo.email";
const DECLENCHEURS = "https://www.googleapis.com/auth/script.scriptapp";
const ADRESSE = "https://script.google.com/macros/s/AKfycbTEST_magasin-X/exec";
const erreur = (f) => {
  try {
    f();
  } catch (e) {
    return e.message;
  }
  return "";
};

// --- 1) Le modèle : préparé par l'auteur (Sheet neuf créé par clasp, « Feuille 1 » vide) ---
let env = makeEnv({
  repo,
  idClasseur: "MODELE",
  activeEmail: "proprio@example.com",
  sheets: { "Feuille 1": new FakeSheet("Feuille 1") },
});
let c = env.ctx;
assert.match(c.preparerModele(), /^Modèle prêt \(version [\d.-]+\) : onglet « Démarrer » et son bouton\.$/);
assert.deepStrictEqual(
  Object.keys(env.sheets),
  ["Démarrer", "Saisies", "_Annuaire"],
  "Feuille 1 vide retirée"
);
assert.strictEqual(env.feuilleActive, "Démarrer");
const bouton = env.sheets["Démarrer"].getImages();
assert.strictEqual(bouton.length, 1);
assert.strictEqual(bouton[0].script, "ouvrirAssistant");
assert.deepStrictEqual(
  [bouton[0].largeur, bouton[0].hauteur, bouton[0].colonne, bouton[0].ligne],
  [320, 64, 2, 5]
);
assert.strictEqual(bouton[0].blob.type, "image/png");
assert.deepStrictEqual(bouton[0].blob.octets.slice(1, 4), [80, 78, 71], "vraie image PNG");
assert.match(env.sheets["Démarrer"].getRange(10, 2).getValue(), /Paramètres avancés.*Tout sélectionner/);
assert.strictEqual(env.props._store.ID_CLASSEUR, "MODELE", "modèle marqué : ses copies se reconnaissent");
assert.deepStrictEqual(env.triggers, [], "pas de robots de nuit sur le modèle");
assert.ok(!env.props._store.ACTIVATION_HASH, "pas de code d'activation sur le modèle");
// relancé (mise à jour du modèle) : un seul onglet « Démarrer », un seul bouton
c.preparerModele();
assert.strictEqual(env.sheets["Démarrer"].getImages().length, 1);
// une feuille « Feuille 2 » qui contient quelque chose n'est jamais retirée
env.sheets["Feuille 2"] = new FakeSheet("Feuille 2", [["à garder"]]);
c.preparerModele();
assert.ok(env.sheets["Feuille 2"]);
// réservé aux personnes ayant accès au fichier
env.activeEmail = "";
assert.match(erreur(c.preparerModele), /Réservé aux personnes ayant accès/);

// --- 2) Une copie neuve (même contenu, autre identifiant) ---
const copie = (opts) => {
  const e = makeEnv(
    Object.assign(
      {
        repo,
        idClasseur: "COPIE",
        activeEmail: "proprio@example.com",
        props: { ID_CLASSEUR: "MODELE", CFG_NOM_STRUCTURE: "l'Hypermarché Modèle" },
        sheets: {
          Démarrer: new FakeSheet("Démarrer"),
          Saisies: new FakeSheet("Saisies", [["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes", ""]]),
          "Feuille 1": new FakeSheet("Feuille 1"),
        },
      },
      opts
    )
  );
  e.ctx.onOpen();
  return e;
};
env = copie();
c = env.ctx;
assert.match(env.toasts[0], /onglet « Démarrer », bouton vert « Installer l'application »/);
assert.strictEqual(env.sidebars, 0, "copie non installée : pas de panneau (il échouerait)");
assert.deepStrictEqual(env.menus.slice(0, 3), ["afficherPanneau", "ouvrirAssistant", "ouvrirTablettes"]);
// clic sur le bouton : la fenêtre s'ouvre (modèle rendu, bibliothèque QR incluse)
c.ouvrirAssistant();
assert.strictEqual(env.dialogues.length, 1);
assert.strictEqual(env.dialogues[0].titre, "▶ Installation de l'application");
assert.match(env.dialogues[0].contenu, /<body data-mode="assistant">/);
assert.match(env.dialogues[0].contenu, /QR Code Generator for JavaScript/);
assert.ok(!/<\?/.test(env.dialogues[0].contenu), "plus aucune balise de modèle");
c.ouvrirTablettes();
assert.strictEqual(env.dialogues[1].titre, "📱 Connecter une tablette");
assert.match(env.dialogues[1].contenu, /<body data-mode="tablettes">/);

// --- 3) Autorisation incomplète : la case « adresse e-mail » n'a pas été cochée ---
env = copie();
c = env.ctx;
env.autorisations = [DECLENCHEURS];
assert.match(erreur(c.ouvrirAssistant), /ÉCRAN DE GOOGLE/, "Google réaffiche son écran");
assert.deepStrictEqual(J(env.demandesAutorisation), [[EMAIL]], "seulement la case manquante");
assert.strictEqual(env.dialogues.length, 0);
assert.match(erreur(c.installerDepuisMenu), /ÉCRAN DE GOOGLE/, "« Installer » aussi");
// plateforme sans requireScopes : message clair au lieu de « Réservé… »
delete c.ScriptApp.requireScopes;
const MSG =
  /^Autorisation Google incomplète \(une case n'a pas été cochée\) : menu 🚀 APPLICATION → ▶ Assistant d'installation, puis cochez « Tout sélectionner »\.$/;
assert.match(erreur(c.ouvrirAssistant), MSG);
assert.match(erreur(c.preparerInstallation), MSG, "fenêtre déjà ouverte : même message");
// le panneau du Sheet (sans session) le dit aussi, au lieu de CONNEXION_REQUISE
env = copie({ sessionReelle: true });
env.autorisations = [DECLENCHEURS];
assert.match(
  erreur(() => env.ctx.getDatesOperation()),
  MSG
);
// tout coché : plus de message
env.autorisations = null;
assert.strictEqual(
  erreur(() => env.ctx.getDatesOperation()),
  ""
);
// quelqu'un qui n'a pas accès au fichier : toujours « Réservé… »
env.activeEmail = "inconnu@example.com";
assert.match(erreur(env.ctx.ouvrirAssistant), /Réservé aux personnes ayant accès/);

// --- 4) Écrans de la fenêtre ---
env = copie();
c = env.ctx;
// 1. Préparation (= « Installer ») : copie nettoyée, robots de nuit, version
const prep = J(c.preparerInstallation());
assert.strictEqual(prep.incomplet, false);
assert.match(prep.rapport, /Nouvelle copie détectée/);
assert.match(prep.version, /^[\d.-]+$/);
assert.deepStrictEqual(env.triggers.sort(), ["purgerAnnuaire", "verificationClotureNocturne"]);
assert.strictEqual(env.props._store.ID_CLASSEUR, "COPIE");
// 2. Nom du magasin : vide au départ (le défaut est celui d'un autre magasin)
assert.strictEqual(c.lireNomMagasin(), "");
assert.match(
  erreur(() => c.enregistrerNomMagasin("   ")),
  /Écrivez le nom du magasin/
);
assert.strictEqual(c.enregistrerNomMagasin("  l'Hypermarché Test "), "l'Hypermarché Test");
assert.strictEqual(c.getConfig().NOM_STRUCTURE, "l'Hypermarché Test");
assert.strictEqual(c.lireNomMagasin(), "l'Hypermarché Test");
// 3. Mise en ligne : pas encore déployée ; adresse /dev ignorée ; puis trouvée seule
const ml = J(c.etatMiseEnLigne());
assert.deepStrictEqual(ml, { adresse: "", lienEditeur: "https://script.google.com/d/ID-SCRIPT/edit" });
env.urlService = "https://script.google.com/macros/s/AKfycbTEST/dev";
assert.strictEqual(c.etatMiseEnLigne().adresse, "");
env.urlService = ADRESSE;
assert.strictEqual(c.etatMiseEnLigne().adresse, ADRESSE);
// adresse collée par le manager (si l'assistant ne la trouve pas)
assert.match(
  erreur(() => c.enregistrerAdresseApplication("https://example.com/exec")),
  /finit par \/exec/
);
const ADRESSE_PRO = "https://script.google.com/a/macros/magasin.fr/s/AKfycbPRO/exec";
assert.strictEqual(c.enregistrerAdresseApplication(" " + ADRESSE_PRO + " "), ADRESSE_PRO);
assert.strictEqual(c.etatMiseEnLigne().adresse, ADRESSE_PRO, "l'adresse notée passe avant");
// celle qu'un appareil a vraiment ouverte (doGet) est notée
c.noterAdresseApplication_(ADRESSE);
assert.strictEqual(env.props._store.ADRESSE_APP, ADRESSE);
c.noterAdresseApplication_("https://script.google.com/macros/s/AKfycbTEST/dev");
assert.strictEqual(env.props._store.ADRESSE_APP, ADRESSE, "jamais l'adresse /dev");
// 4. Tablettes : code d'activation neuf au premier affichage seulement
const t1 = J(c.etatTablettes(true));
assert.strictEqual(t1.adresse, ADRESSE);
assert.strictEqual(t1.compte, false);
assert.match(t1.code, /^\d{4}-\d{4}$/);
const hash = env.props._store.ACTIVATION_HASH;
assert.deepStrictEqual(J(c.etatTablettes(false)), { adresse: ADRESSE, compte: false, code: "" });
assert.strictEqual(env.props._store.ACTIVATION_HASH, hash, "l'attente ne change pas le code affiché");
// la tablette crée le compte avec ce code (tapé à la main)
assert.ok(J(c.premierCompte(t1.code, "Caisse centrale", "motdepasse-test")).ok);
assert.deepStrictEqual(J(c.etatTablettes(false)), { adresse: ADRESSE, compte: true, code: "" });
assert.strictEqual(c.etatTablettes(true).code, "", "compte créé : plus de code d'activation");
// Fin : « Démarrer » et l'onglet vide de Google retirés
assert.strictEqual(c.terminerAssistant(), true);
assert.ok(!env.sheets["Démarrer"] && !env.sheets["Feuille 1"]);
assert.strictEqual(env.feuilleActive, "Saisies");
// réservé aux personnes ayant accès au fichier
env.activeEmail = "";
["lireNomMagasin", "etatMiseEnLigne", "terminerAssistant", "preparerInstallation"].forEach(function (f) {
  assert.match(erreur(c[f]), /Réservé aux personnes ayant accès/, f);
});
assert.match(
  erreur(() => c.etatTablettes(true)),
  /Réservé/
);
assert.match(
  erreur(() => c.enregistrerNomMagasin("X")),
  /Réservé/
);
assert.match(
  erreur(() => c.enregistrerAdresseApplication(ADRESSE)),
  /Réservé/
);
console.log("test_assistant : OK");
