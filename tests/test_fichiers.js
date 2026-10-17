// Code découpé en plusieurs fichiers (refonte, étapes 3 et 4). Une seule portée globale
// côté serveur (tous les .gs) et une côté page (tous les <script> des morceaux) :
// - aucun nom déclaré dans deux fichiers (rien ne le signale : le dernier lu gagne) ;
// - serveur : que des déclarations au premier niveau, mêmes constantes quel que soit
//   l'ordre de lecture des .gs ;
// - page : chaque morceau (Style.html, Script*.html) est inclus une fois dans Index.html,
//   existe, et ne contient aucune balise de modèle (inséré tel quel par include_).
const assert = require("assert");
const fs = require("fs"),
  vm = require("vm");
const {
  fichiersGs,
  morceauxPage,
  declarationsServeur,
  declarationsPage,
  nomsDeclares,
} = require("./declarations");
const repo = process.argv[2];
try {
  // --- Serveur ---
  const fichiers = fichiersGs(repo);
  assert.ok(fichiers.length > 1 && fichiers[0] === "00_Constantes.gs", "00_Constantes.gs lu en premier");
  assert.ok(!fichiers.includes("Code.gs"), "l'ancien Code.gs ne doit plus exister");
  // Apps Script ne distingue pas les extensions : « Assistant.gs » + « Assistant.html » =
  // deux fichiers « Assistant », et clasp push est refusé en entier (17/10/2026)
  const envoyes = fs.readdirSync(repo).filter((f) => /\.(gs|html)$/.test(f));
  const parNom = {};
  for (const f of envoyes) {
    const nom = f.replace(/\.(gs|html)$/, "");
    assert.ok(!parNom[nom], "même nom pour Apps Script : " + parNom[nom] + " et " + f);
    parNom[nom] = f;
  }
  function sansDoublon(declarations, extra) {
    const vus = Object.assign({}, extra);
    for (const [f, noms] of Object.entries(declarations)) {
      for (const n of noms) {
        assert.ok(!vus[n], n + " déclaré dans " + vus[n] + " ET " + f);
        vus[n] = f;
      }
    }
    return vus;
  }
  const vus = sansDoublon(declarationsServeur(repo));
  for (const f of fichiers) {
    fs.readFileSync(repo + "/" + f, "utf8")
      .split("\n")
      .forEach((l, i) => {
        if (/^[^\s/}\])]/.test(l))
          assert.match(
            l,
            /^(function|var|let|const) /,
            f + ":" + (i + 1) + " instruction au premier niveau : " + l
          );
      });
  }
  function valeurs(ordre) {
    const ctx = vm.createContext({});
    for (const f of ordre) vm.runInContext(fs.readFileSync(repo + "/" + f, "utf8"), ctx, { filename: f });
    const r = {};
    for (const n of Object.keys(vus)) {
      const v = vm.runInContext(n, ctx); // const / let : pas des propriétés de l'objet global
      if (typeof v !== "function") r[n] = String(v instanceof RegExp ? v : JSON.stringify(v));
    }
    return r;
  }
  assert.deepStrictEqual(
    valeurs(fichiers.slice().reverse()),
    valeurs(fichiers),
    "mêmes constantes quel que soit l'ordre"
  );
  assert.strictEqual(vus.include_, "Application.gs", "include_ côté serveur");

  // --- Page ---
  const index = fs.readFileSync(repo + "/Index.html", "utf8");
  const inclus = [...index.matchAll(/<\?!= include_\('(\w+)'\) \?>/g)].map((m) => m[1] + ".html");
  const morceaux = morceauxPage(repo);
  assert.deepStrictEqual(
    inclus.slice().sort(),
    morceaux,
    "chaque morceau inclus une fois, et rien d'inexistant"
  );
  assert.strictEqual(new Set(inclus).size, inclus.length);
  for (const m of morceaux)
    assert.ok(!/<\?/.test(fs.readFileSync(repo + "/" + m, "utf8")), m + " : pas de balise de modèle");
  // Mise en forme dans Style.html : seul « display: none » (état géré par les scripts) reste dans le HTML
  for (const [nom, html] of [
    ["Index.html", index],
    ["Panneau.html", fs.readFileSync(repo + "/Panneau.html", "utf8")],
  ]) {
    const styles = [...html.matchAll(/ style="([^"]*)"/g)]
      .map((m) => m[1])
      .filter((v) => v !== "display: none");
    assert.deepStrictEqual(styles, [], nom + ' : style="…" à mettre dans une classe');
  }
  const scriptIndex = index.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/<\?!?=[\s\S]*?\?>/g, "null");
  const page = sansDoublon(
    declarationsPage(repo),
    Object.fromEntries(nomsDeclares(scriptIndex).map((n) => [n, "Index.html"]))
  );
  console.log(
    fichiers.length +
      " fichiers serveur (" +
      Object.keys(vus).length +
      " noms), " +
      morceaux.length +
      " morceaux de page (" +
      Object.keys(page).length +
      " noms)"
  );
  console.log("test_fichiers : OK");
} catch (e) {
  console.log("test_fichiers : ÉCHEC " + e.message);
  process.exit(1);
}
