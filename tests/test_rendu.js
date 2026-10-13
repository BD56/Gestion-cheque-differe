const { rendrePage, loadCode, makeProps } = require("./harness");
const fs = require("fs");
const repo = process.argv[2];
const orig = process.argv[3];
const props = makeProps();
const ctx = loadCode(repo, { PropertiesService: { getDocumentProperties: () => props } });
const cfg = ctx.getConfig();
const rendu = rendrePage(repo, { cfg, dates: ctx.lireDates_() });
fs.writeFileSync(__dirname + "/rendu_defaut.html", rendu);
// Syntaxe JS des <script> rendus
const vm = require("vm");
let n = 0;
for (const m of rendu.matchAll(/<script(?:\s+type="module")?>([\s\S]*?)<\/script>/g)) {
  n++;
  try {
    new vm.Script(m[1].replace(/^\s*(import|export)\b.*$/gm, ""));
  } catch (e) {
    console.log("ERREUR SYNTAXE script", n, e.message);
    process.exitCode = 1;
  }
}
console.log("scripts vérifiés:", n, "| titre:", cfg.TITRE_APP);
// Config personnalisée + caractères piégeux
props.setProperty("CFG_NOM_OFFRE", 'la société <Test> & "Cie"');
props.setProperty("CFG_MONTANT_OBLIGATOIRE", "NON");
props.setProperty("CFG_PRECISION_NOTES", "");
props.setProperty("CFG_LIBELLE_NOTES", "</script><b>x");
const r2 = rendrePage(repo, { cfg: ctx.getConfig(), dates: { debut: "</script>", fin: "" } });
console.log("échappement HTML ok:", r2.includes("la société &lt;Test&gt; &amp; &quot;Cie&quot;"));
console.log(
  "pas de </script> injecté:",
  (r2.match(/<\/script>/g) || []).length === (rendu.match(/<\/script>/g) || []).length
);
console.log(
  "montant facultatif sans *:",
  /\(€\)<\/label>/.test(r2),
  "| précision vide:",
  r2.includes("&lt;/script&gt;&lt;b&gt;x</label>")
);
console.log(
  "DATES client relues:",
  new Function("return " + r2.match(/(?:var|let|const) DATES_INITIALES = (.*);/)[1])().debut === "</script>"
);
const cfgClient = new Function(r2.match(/(?:var|let|const) CONFIG = (.*);/)[1].replace(/^/, "return "))();
console.log("CONFIG client relu:", cfgClient.LIBELLE_NOTES === "</script><b>x");
