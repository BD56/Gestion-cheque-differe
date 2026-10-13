// Démarrage de la tablette : bon écran d'emblée (dates injectées), un seul appel serveur,
// pas de cache chargé hors période.
const assert = require("assert");
const fs = require("fs");
const { chromium } = require("playwright");
const { rendrePage } = require("./harness");
const { ouvrir } = require("./navigateur");
(async () => {
  // 1. Serveur muet : l'écran affiché ne dépend que des dates glissées dans la page
  const browser0 = await chromium.launch();
  try {
    const page = await browser0.newPage();
    const stub =
      '<script>window.localStorage.setItem("cdTabletteCle","CLE-TEST-0123456789abcdef0123456789abcdef");' +
      'window.google={script:{run:new Proxy({},{get:function(_,n){return (n==="withSuccessHandler"||n==="withFailureHandler")?function(){return google.script.run;}:function(){};}})}};</script>';
    const rendre = (dates) =>
      rendrePage(process.argv[2], {
        cfg: {
          TITRE_APP: "t",
          NOM_OFFRE: "o",
          NOM_STRUCTURE: "s",
          LIBELLE_MONTANT: "Montant",
          MONTANT_OBLIGATOIRE: "OUI",
          LIBELLE_NOTES: "n",
          PRECISION_NOTES: "",
          PASSAGES_MAX: "1",
        },
        dates,
      }).replace("<head>", "<head>" + stub);
    await page.setContent(rendre({ debut: "", fin: "" }), { waitUntil: "load" });
    assert.ok(!(await page.isVisible("#formulaireSaisie")), "pas de formulaire affiché puis retiré");
    assert.match(await page.textContent("#sousTitreOperation"), /Aucune opération en cours/);
    await page.setContent(rendre({ debut: "2000-01-01", fin: "2099-12-31" }), { waitUntil: "load" });
    assert.ok(await page.isVisible("#formulaireSaisie"), "offre en cours : saisie tout de suite");
    assert.match(await page.textContent("#sousTitreOperation"), /Opération du 01\/01 au 31\/12/);
  } finally {
    await browser0.close();
  }

  // 2. Offre en cours : un seul appel au démarrage, cache chargé
  let o = await ouvrir(process.argv[2]);
  try {
    assert.deepStrictEqual(await o.page.evaluate(() => window.__appels), ["demarrage"]);
    assert.ok(await o.page.evaluate(() => cacheVerif !== null), "cache reçu avec le démarrage");
    assert.ok(await o.page.isVisible("#formulaireSaisie"));
    assert.deepStrictEqual(o.erreursPage, []);
  } finally {
    await o.browser.close();
  }

  // 3. Aucune offre : rien de lourd chargé ; l'offre démarre ensuite -> cache chargé
  o = await ouvrir(process.argv[2], { props: {} });
  try {
    assert.deepStrictEqual(await o.page.evaluate(() => window.__appels), ["demarrage"]);
    assert.strictEqual(await o.page.evaluate(() => cacheVerif), null, "pas de cache hors période");
    assert.ok(!(await o.page.isVisible("#formulaireSaisie")));
    o.env.props.setProperty("DATE_DEBUT", "2000-01-01");
    o.env.props.setProperty("DATE_FIN", "2099-12-31");
    await o.page.evaluate(() => chargerDatesAffichage());
    await o.page.waitForTimeout(200);
    assert.ok(await o.page.isVisible("#formulaireSaisie"), "formulaire affiché quand l'offre démarre");
    assert.ok(await o.page.evaluate(() => cacheVerif !== null), "cache chargé quand l'offre démarre");
    assert.deepStrictEqual(o.erreursPage, []);
  } finally {
    await o.browser.close();
  }
  console.log("test_ui_demarrage: OK");
})().catch((e) => {
  console.log("test_ui_demarrage: ÉCHEC " + e.message);
  process.exit(1);
});
