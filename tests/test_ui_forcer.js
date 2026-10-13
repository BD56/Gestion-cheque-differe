const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [new Date(), "DUPONT", "JEAN", "AB123", "10 €", ""],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  const S = env.sheets.Saisies;
  try {
    // La tablette a chargé SIGNALER ; quelqu'un passe en BLOQUANT ailleurs (panneau du Sheet)
    S.getRange("Z1").setValue("BLOQUANT");
    await page.evaluate(() => {
      window.__recharger = rechargerCacheVerif;
      window.rechargerCacheVerif = function () {};
    }); // tablette non resynchronisée
    await page.fill("#nom", "DUPONT");
    await page.fill("#prenom", "JEAN");
    await page.fill("#montant", "5");
    await page.fill("#piece", "AB123");
    await page.press("#piece", "Tab");
    await page.evaluate(() => {
      document.getElementById("modalDoublonPiece").style.display = "none";
    });
    await page.click("#btnValider");
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible("#actionSignaler"), "tablette périmée : propose de forcer");
    await page.evaluate(() => {
      window.rechargerCacheVerif = window.__recharger;
    });
    await page.click("text=FORCER L'AJOUT");
    await page.waitForTimeout(250);
    assert.strictEqual(S.getLastRow(), 2, "rien écrit");
    assert.ok(await page.isVisible("#modalAlerteServeur"), "fenêtre d'alerte attendue");
    assert.match(await page.textContent("#alerteServeurTitre"), /REFUSÉE/);
    assert.match(await page.textContent("#alerteServeurMsg"), /PAS été enregistrée.*déjà profité/);
    assert.ok(!(await page.isVisible("#alerteServeurChoix")), "BLOQUANT : pas de bouton forcer");
    await page.waitForTimeout(900); // fenêtre lue (appuis ignorés 0,8 s)
    await page.click("#btnAlerteOk");
    await page.waitForTimeout(100);
    assert.strictEqual(await page.evaluate(() => cacheVerif.mode), "BLOQUANT", "cache resynchronisé");
    // Même saisie maintenant : refus direct, sans bouton forcer
    await page.fill("#nom", "DUPONT");
    await page.fill("#prenom", "JEAN");
    await page.fill("#montant", "5");
    await page.fill("#piece", "AB123");
    await page.press("#piece", "Tab");
    await page.evaluate(() => {
      document.getElementById("modalDoublonPiece").style.display = "none";
    });
    await page.click("#btnValider");
    await page.waitForTimeout(100);
    assert.ok((await page.isVisible("#actionBloquant")) && !(await page.isVisible("#actionSignaler")));
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_forcer : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
