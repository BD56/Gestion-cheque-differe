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
    env.creerCode("258025"); // code à part : la fin de session ramène au verrou (plus bas)
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(100);
    await page.fill("#pinSaisi", "258025");
    await page.click("#btnDeverrouiller");
    await page.waitForTimeout(150);
    await page.click('[data-ecran-lien="saisies"]');
    await page.waitForTimeout(150);
    assert.strictEqual(await page.$$eval("#listeSaisies .ligne-saisie", (x) => x.length), 3);
    assert.strictEqual(await page.$$eval("#listeSaisies img", (x) => x.length), 0, "pas d'injection HTML");
    // Recherche
    await page.fill("#rechercheSaisie", "jean dupont");
    await page.waitForTimeout(50);
    assert.strictEqual(await page.$$eval("#listeSaisies .ligne-saisie", (x) => x.length), 1);
    await page.fill("#rechercheSaisie", "cd 456");
    assert.strictEqual(await page.$$eval("#listeSaisies .ligne-saisie", (x) => x.length), 1);
    await page.fill("#rechercheSaisie", "");
    // Correction de DUPONT avec la pièce de MARTIN -> alerte B, puis forcer
    const carteDupont = page.locator("#listeSaisies .ligne-saisie", { hasText: "DUPONT" });
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
    const supprimer = page
      .locator("#listeSaisies .ligne-saisie", { hasText: "MARTIN" })
      .locator("text=Supprimer");
    await supprimer.click();
    await page.waitForTimeout(100);
    assert.strictEqual(S.getLastRow(), 4, "premier appui : rien de supprimé");
    await page
      .locator("#listeSaisies .ligne-saisie", { hasText: "MARTIN" })
      .locator("text=Confirmer la suppression")
      .click();
    await page.waitForTimeout(200);
    assert.deepStrictEqual(
      S.getDataRange()
        .getValues()
        .slice(1)
        .map((x) => x[3]),
      ["CD456", "ZZ9"]
    );
    assert.strictEqual(await page.$$eval("#listeSaisies .ligne-saisie", (x) => x.length), 2);
    // Le cache local de vérif est rechargé (CD456 n'appartient plus qu'à DUPONT)
    await page.waitForTimeout(100);
    const offre = await page.evaluate(() => cacheVerif.offre.map((o) => o.pieceNorm + ":" + o.nom));
    assert.deepStrictEqual(offre.slice(0, 1), ["CD456:DUPONT"]);
    // Session expirée pendant la correction -> modale fermée, verrou affiché
    for (const k in env.cacheStore) delete env.cacheStore[k];
    await page.locator("#listeSaisies .ligne-saisie", { hasText: "DUPONT" }).locator("text=CORRIGER").click();
    await page.click("#vueCorrection >> text=ENREGISTRER");
    await page.waitForTimeout(200);
    assert.ok(!(await page.isVisible("#listeSaisies")) && (await page.isVisible("#zoneVerrou")));
    // Menu : de la liste des saisies à la vue d'ensemble
    await page.fill("#pinSaisi", "258025");
    await page.press("#pinSaisi", "Enter");
    await page.waitForTimeout(150);
    await page.click('[data-ecran-lien="saisies"]');
    await page.waitForTimeout(100);
    await page.click('[data-ecran-lien="ensemble"]');
    assert.ok((await page.isVisible('[data-ecran="ensemble"]')) && !(await page.isVisible("#listeSaisies")));
    await page.waitForTimeout(150);
    // chiffres relus dans « Saisies » : 2 lignes ; plus de doublon depuis la suppression de MARTIN
    assert.strictEqual(await page.textContent("#kpiSaisies"), "2");
    assert.strictEqual(await page.textContent("#kpiForcees"), "0");
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
