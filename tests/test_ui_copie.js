// Copie locale : l'annuaire (clients des offres passées) n'est envoyé qu'au démarrage
// puis au plus une fois par heure ; entre-temps la tablette garde le sien et le
// pré-remplissage fonctionne toujours. Les saisies de l'offre, elles, sont à jour.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  try {
    const sansAnnuaire = [];
    const vraie = env.ctx.chargerCacheVerif;
    env.ctx.chargerCacheVerif = function (cle, sans) {
      sansAnnuaire.push(sans);
      return vraie(cle, sans);
    };
    // Annuaire reçu au démarrage (vide) ; un client d'une offre passée apparaît ensuite
    env.sheets._Annuaire = new FakeSheet("_Annuaire", [
      ["Piece", "Nom", "Prenom", "DerniereVue"],
      ["'AN555", "DUPONT", "JEAN", new Date()],
    ]);
    // Rechargement ordinaire : sans annuaire -> pas encore connu ici
    await page.evaluate(() => rechargerCacheVerif());
    await page.waitForTimeout(150);
    assert.deepStrictEqual(sansAnnuaire, [true]);
    assert.strictEqual(await page.evaluate(() => Object.keys(cacheVerif.annuaire).length), 0);
    // Une heure plus tard : l'annuaire est redemandé
    await page.evaluate(() => {
      annuaireRecuA -= 61 * 60 * 1000;
      rechargerCacheVerif();
    });
    await page.waitForTimeout(150);
    assert.deepStrictEqual(sansAnnuaire, [true, false]);
    // Les rechargements suivants le gardent : pré-remplissage toujours possible
    env.sheets.Saisies.appendRow([new Date(), "MARTIN", "LUC", "'ZZ1", "5 €", ""]);
    await page.evaluate(() => rechargerCacheVerif());
    await page.waitForTimeout(150);
    assert.deepStrictEqual(sansAnnuaire, [true, false, true]);
    assert.ok(
      await page.evaluate(() => cacheVerif.offre.some((o) => o.nom === "MARTIN")),
      "saisies de l'offre à jour"
    );
    await page.evaluate(() => {
      rechargerCacheVerif = function () {}; // pas de nouveau rechargement au clic
    });
    await page.fill("#piece", "an555");
    await page.press("#piece", "Tab");
    await page.waitForTimeout(100);
    assert.strictEqual(await page.inputValue("#nom"), "DUPONT", "annuaire gardé : pré-rempli");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_copie: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_copie: ÉCHEC " + e.message);
  process.exit(1);
});
