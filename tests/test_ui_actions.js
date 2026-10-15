// Boutons sans onclick (refonte, étape 5c) : data-action + un seul écouteur.
// - chaque data-action de la page (et du panneau du Sheet) est dans la liste ACTIONS,
//   et chaque entrée de la liste sert ; aucun bouton cliquable dans un autre ;
// - un clic appelle bien la fonction, avec ses arguments.
const assert = require("assert");
const fs = require("fs");
const { ouvrir } = require("./navigateur");
const repo = process.argv[2];
(async () => {
  // Panneau du Sheet (page à part) : vérification sur le texte
  const panneau = fs.readFileSync(repo + "/Panneau.html", "utf8");
  const actionsPanneau = [...panneau.matchAll(/<button[^>]*data-action="(\w+)"/g)].map((m) => m[1]).sort();
  const listePanneau = panneau
    .match(/const ACTIONS = \{([\s\S]*?)\}/)[1]
    .match(/\w+/g)
    .sort();
  assert.deepStrictEqual(actionsPanneau, listePanneau, "panneau : boutons = liste ACTIONS");
  assert.ok(!/onclick/i.test(panneau));
  // ... et dans un navigateur : un bouton du panneau appelle la bonne fonction du serveur
  const { chromium } = require("playwright");
  const nav = await chromium.launch();
  try {
    const p = await nav.newPage();
    const stub =
      "<script>window.__appels=[];const r=new Proxy({},{get:(_,n)=>(n==='withSuccessHandler'||n==='withFailureHandler')" +
      "?()=>r:(...a)=>{window.__appels.push([n].concat(a));}});window.google={script:{run:r}};</script>";
    await p.setContent(panneau.replace("<head>", "<head>" + stub), { waitUntil: "load" });
    await p.click('[data-action="imprimerAuj"]');
    const appels = await p.evaluate(() => window.__appels);
    assert.deepStrictEqual(appels[appels.length - 1], ["allerVersImpression", "aujourdhui"]);
    // Action lourde du panneau : rien au premier appui, appel au second (plus de confirm())
    await p.click('[data-action="reinitialiserComptes"]');
    assert.ok(!(await p.evaluate(() => window.__appels.some((x) => x[0] === "reinitialiserComptesPanneau"))));
    assert.match(await p.textContent("#btnReinitComptes"), /Confirmer/);
    await p.click('[data-action="reinitialiserComptes"]');
    assert.ok(await p.evaluate(() => window.__appels.some((x) => x[0] === "reinitialiserComptesPanneau")));
  } finally {
    await nav.close();
  }

  const { page, browser, erreursPage } = await ouvrir(repo);
  try {
    const r = await page.evaluate(() => {
      const utilisees = [...document.querySelectorAll("[data-action]")].map((e) => e.dataset.action);
      return {
        inconnues: utilisees.filter((a) => typeof ACTIONS[a] !== "function"),
        inutiles: Object.keys(ACTIONS).filter((a) => !utilisees.includes(a)),
        imbriques: document.querySelectorAll("[data-action] [data-action]").length,
        onclick: document.querySelectorAll("[onclick]").length,
      };
    });
    assert.deepStrictEqual(r, { inconnues: [], inutiles: [], imbriques: 0, onclick: 0 });
    // Un clic appelle la fonction avec ses arguments (aide -> rubrique « numero »)
    await page.click('button[title="Aide et consignes"]');
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible("#modalAide"));
    await page.click("#modalAide [data-args='[\"numero\"]']");
    await page.waitForTimeout(100);
    assert.match(await page.textContent("#modalAide .sous-ecran.actif"), /N°/);
    await page.click('#modalAide .sous-ecran.actif [data-action="allerAide"][data-args=\'["accueil"]\']');
    await page.click('#modalAide [data-action="fermerAide"]');
    assert.ok(!(await page.isVisible("#modalAide")));
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_actions : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_actions : ÉCHEC " + ((e && e.stack) || e));
  process.exit(1);
});
