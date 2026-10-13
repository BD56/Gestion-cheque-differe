// Contrôle de l'installation (refonte, étape 6) : tous les fichiers présents et au même
// numéro de version, sinon « Installation incomplète » au lieu d'une application à moitié.
const assert = require("assert");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { makeEnv } = require("./mocks");
const { valeurGlobale } = require("./harness");
const repo = process.argv[2];
try {
  // 1) Dépôt : même numéro partout, listes de fichiers à jour
  execFileSync("node", [repo + "/outils/version.js", "--verifier"], { encoding: "utf8" });
  const env0 = makeEnv({ repo });
  const disque = (ext) =>
    fs
      .readdirSync(repo)
      .filter((f) => f.endsWith(ext))
      .map((f) => f.slice(0, -ext.length))
      .sort();
  assert.deepStrictEqual(
    [...valeurGlobale(env0.ctx, "FICHIERS_SERVEUR")].sort(),
    disque(".gs"),
    "FICHIERS_SERVEUR"
  );
  assert.deepStrictEqual(
    [...valeurGlobale(env0.ctx, "FICHIERS_PAGE")].sort(),
    disque(".html"),
    "FICHIERS_PAGE"
  );
  assert.deepStrictEqual([...env0.ctx.verifierInstallation_()], [], "installation complète");

  // doGet : page normale si tout va bien
  function env1() {
    const env = makeEnv({ repo, props: { DATE_DEBUT: "2000-01-01", DATE_FIN: "2099-12-31" } });
    env.ctx.HtmlService.createTemplateFromFile = () => ({
      evaluate: () => ({
        normale: true,
        setTitle() {
          return this;
        },
        addMetaTag() {
          return this;
        },
      }),
    });
    return env;
  }
  let e = env1();
  assert.ok(e.ctx.doGet({}).normale, "application ouverte");

  // 2) Un .gs resté à l'ancienne version -> page « Installation incomplète »
  e = env1();
  e.ctx.version_Saisie_ = () => "2020.01.01-0000";
  let p = e.ctx.doGet({});
  assert.strictEqual(p.titre, "Installation incomplète");
  assert.match(p.contenu, /Saisie\.gs : version 2020\.01\.01-0000 au lieu de/);
  // ... et « Installer » le dit au responsable
  e.activeEmail = e.owner;
  assert.match(e.ctx.installer(), /INSTALLATION INCOMPLÈTE[\s\S]*Saisie\.gs/);

  // 3) Un .gs absent (fonction de version inexistante)
  e = env1();
  e.ctx.version_Annuaire_ = undefined; // (une fonction déclarée ne peut pas être supprimée)
  assert.match(e.ctx.doGet({}).contenu, /Annuaire\.gs : absent/);

  // 4) Morceau de page absent, ou ancien (sans numéro)
  e = env1();
  const lire = e.ctx.HtmlService.createHtmlOutputFromFile;
  e.ctx.HtmlService.createHtmlOutputFromFile = (nom) => {
    if (nom === "ScriptOffre") throw new Error("Aucun fichier HTML nommé ScriptOffre");
    if (nom === "Style") return { getContent: () => "<style></style>" };
    return lire(nom);
  };
  p = e.ctx.doGet({});
  assert.match(p.contenu, /ScriptOffre\.html : absent/);
  assert.match(p.contenu, /Style\.html : sans numéro de version/);
  assert.doesNotMatch(p.contenu, /Index\.html/, "les autres fichiers sont bons");

  // 5) Panne du contrôle lui-même : la caisse n'est pas bloquée (application ouverte)
  e = env1();
  e.ctx.version_Installation_ = undefined;
  assert.ok(e.ctx.doGet({}).normale, "contrôle en panne : application quand même ouverte");

  // ... ou lecture des fichiers impossible (Index.html illisible) : application ouverte
  e = env1();
  e.ctx.HtmlService.createHtmlOutputFromFile = () => {
    throw new Error("Service indisponible");
  };
  assert.ok(e.ctx.doGet({}).normale, "lecture impossible : application quand même ouverte");

  // 6) Installer sur une installation complète : numéro de version affiché
  e = env1();
  e.activeEmail = e.owner;
  assert.match(e.ctx.installer(), /Version \d{4}\.\d{2}\.\d{2}/);
  assert.doesNotMatch(e.ctx.installer(), /INCOMPLÈTE/);
  console.log("test_version : OK");
} catch (err) {
  console.log("test_version : ÉCHEC " + ((err && err.stack) || err));
  process.exit(1);
}
