const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const t = new Date("2026-09-26T08:00:00Z");
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [t, "DUPONT", "JEAN", "AB123", "10 €", "caisse 3"],
      [t, "MARTIN", "PAUL", "CD456", "20 €", ""],
      [t, "<img src=x onerror=alert(1)>", "X", "ZZ9", "1 €", ""],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  const S = env.sheets.Saisies;
  try {
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(100);
    await page.fill("#activationVerrou", env.activation());
    await page.fill("#pinSaisi", "258025");
    await page.fill("#pinConfirme", "258025");
    await page.click("#btnDeverrouiller");
    await page.waitForTimeout(150);
    await page.click('#modalParametres .tuile:has-text("Saisies")');
    await page.waitForTimeout(150);
    assert.strictEqual(await page.$$eval("#listeSaisies .doublon-carte", (x) => x.length), 3);
    assert.strictEqual(await page.$$eval("#listeSaisies img", (x) => x.length), 0, "pas d'injection HTML");
    // Recherche
    await page.fill("#rechercheSaisie", "jean dupont");
    await page.waitForTimeout(50);
    assert.strictEqual(await page.$$eval("#listeSaisies .doublon-carte", (x) => x.length), 1);
    await page.fill("#rechercheSaisie", "cd 456");
    assert.strictEqual(await page.$$eval("#listeSaisies .doublon-carte", (x) => x.length), 1);
    await page.fill("#rechercheSaisie", "");
    // Correction de DUPONT avec la pièce de MARTIN -> alerte B, puis forcer
    const carteDupont = page.locator("#listeSaisies .doublon-carte", { hasText: "DUPONT" });
    await carteDupont.locator("text=CORRIGER").click();
    assert.strictEqual(await page.inputValue("#corPiece"), "AB123");
    await page.fill("#corPiece", "CD456");
    await page.click("#vueCorrection >> text=ENREGISTRER");
    await page.waitForTimeout(150);
    assert.ok(await page.isVisible("#corAlerte"));
    assert.match(await page.textContent("#corAlerteTitre"), /ANOMALIE/);
    assert.strictEqual(S.getRange(2, 4).getValue(), "AB123", "rien écrit avant de forcer");
    await page.click("#btnForcerCorrection");
    await page.waitForTimeout(200);
    assert.strictEqual(S.getRange(2, 4).getValue(), "CD456");
    assert.match(await page.textContent("#msgSaisies"), /forcée/);
    assert.ok(await page.isVisible("#vueListeSaisies"));
    // Suppression de MARTIN (confirmée)
    await page
      .locator("#listeSaisies .doublon-carte", { hasText: "MARTIN" })
      .locator("text=SUPPRIMER")
      .click();
    await page.waitForTimeout(200);
    assert.deepStrictEqual(
      S.getDataRange()
        .getValues()
        .slice(1)
        .map((x) => x[3]),
      ["CD456", "ZZ9"]
    );
    assert.strictEqual(await page.$$eval("#listeSaisies .doublon-carte", (x) => x.length), 2);
    // Le cache local de vérif est rechargé (CD456 n'appartient plus qu'à DUPONT)
    await page.waitForTimeout(100);
    const offre = await page.evaluate(() => cacheVerif.offre.map((o) => o.pieceNorm + ":" + o.nom));
    assert.deepStrictEqual(offre.slice(0, 1), ["CD456:DUPONT"]);
    // Session expirée pendant la correction -> modale fermée, verrou affiché
    for (const k in env.cacheStore) delete env.cacheStore[k];
    await page
      .locator("#listeSaisies .doublon-carte", { hasText: "DUPONT" })
      .locator("text=CORRIGER")
      .click();
    await page.click("#vueCorrection >> text=ENREGISTRER");
    await page.waitForTimeout(200);
    assert.ok(!(await page.isVisible("#listeSaisies")) && (await page.isVisible("#zoneVerrou")));
    // Retour depuis la liste des saisies -> accueil
    await page.fill("#pinSaisi", "258025");
    await page.press("#pinSaisi", "Enter");
    await page.waitForTimeout(150);
    await page.click('#modalParametres .tuile:has-text("Saisies")');
    await page.waitForTimeout(100);
    await page.click('[data-ecran="saisies"] .retour');
    assert.ok(await page.isVisible("#zoneAdmin .tuiles"));
    assert.deepStrictEqual(erreursPage, []);
    assert.deepStrictEqual(await page.evaluate(() => window.__alertes), []);
    console.log("test_ui_corrections : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
