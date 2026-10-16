// Espace responsable : listes (saisies, archives, appareils) préchargées dès le
// déverrouillage ; à l'ouverture d'un écran, la liste reçue s'affiche tout de suite puis
// est rechargée ; au verrouillage, plus rien ne reste (noms, N° de pièce).
const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [new Date(), "MARTIN", "SOPHIE", "'123456", 150, ""],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  try {
    const appels = { listerSaisies: 0, listerArchives: 0, listerComptes: 0 };
    for (const f of Object.keys(appels)) {
      const vraie = env.ctx[f];
      env.ctx[f] = function () {
        appels[f]++;
        return vraie.apply(null, arguments);
      };
    }
    const jeton = env.creerCode("258025").jeton;
    await page.evaluate("jetonAdmin = " + JSON.stringify(jeton.j));
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(300);
    assert.deepStrictEqual(appels, { listerSaisies: 1, listerArchives: 1, listerComptes: 1 }, "préchargées");
    // Une saisie arrive entre-temps (autre tablette)
    sheets.Saisies.appendRow([new Date(), "DURAND", "PAUL", "'880412", 20, ""]);
    // Ouverture : la liste préchargée s'affiche immédiatement, puis la liste à jour
    const lignes = await page.evaluate(() => {
      document.querySelector('[data-ecran-lien="saisies"]').click();
      return document.querySelectorAll("#listeSaisies .ligne-saisie").length; // même instant
    });
    assert.strictEqual(lignes, 1, "affichage immédiat de la liste préchargée");
    await page.waitForTimeout(200);
    assert.strictEqual(await page.$$eval("#listeSaisies .ligne-saisie", (x) => x.length), 2, "puis à jour");
    assert.strictEqual((await page.textContent("#msgSaisies")).trim(), "2 saisie(s)");
    assert.strictEqual(appels.listerSaisies, 2, "un seul rechargement");
    // Comptes et archives : déjà là
    await page.click('[data-ecran-lien="code"]');
    await page.waitForTimeout(150);
    assert.match(await page.textContent("#msgComptes"), /^Le même compte sur tous les appareils/);
    // Verrouillage : listes effacées de la page
    await page.click("#railAdmin .bas");
    await page.waitForTimeout(150);
    assert.strictEqual(await page.evaluate(() => Object.keys(listesAdmin).length), 0);
    assert.strictEqual(await page.evaluate(() => listeSaisies.length), 0);
    assert.strictEqual((await page.textContent("#listeSaisies")).trim(), "", "plus de noms dans la page");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_prechargement: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_prechargement: ÉCHEC " + e.message);
  process.exit(1);
});
