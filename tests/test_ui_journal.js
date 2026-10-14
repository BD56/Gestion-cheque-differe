// Journal du jour (refonte graphique, étape 4) : replié par défaut, état mémorisé par la
// tablette, saisies d'aujourd'hui seulement (noms abrégés, N° masqués), totaux, ajout
// forcé signalé, nouvelle saisie visible tout de suite et sans doublon après rechargement.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const hier = new Date(Date.now() - 86400000);
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [hier, "LEROY", "MARC", "111122223333", 99, ""],
      [new Date(), "MARTIN", "SOPHIE", "123456789012", 150, ""],
      [new Date(), "DURAND", "PAUL", "880412345678", 20.5, "⚠️ Ajout forcé (Cas C)"],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  const { page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  const vis = (sel) => page.isVisible(sel);
  const txt = async (sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
  const lignes = () => page.$$eval("#listeJour .ligne-jour", (ls) => ls.map((l) => l.textContent));
  try {
    // Replié par défaut : languette avec le nombre de saisies du jour
    assert.ok(!(await vis("#journal")) && (await vis("#languette")));
    assert.strictEqual(await txt("#compteurJour"), "2");
    // Ouvert : mémorisé dans la tablette
    await page.click("#languette");
    await page.waitForTimeout(150);
    assert.ok((await vis("#journal")) && !(await vis("#languette")));
    assert.strictEqual(await page.evaluate(() => window.__store.cdJournal), "ouvert");
    assert.strictEqual(await txt("#totalNb"), "2");
    assert.strictEqual(await txt("#totalMontant"), "170,50 €");
    assert.strictEqual(await txt("#totalForces"), "1");
    const l = await lignes();
    assert.strictEqual(l.length, 2, "la saisie d'hier n'est pas dans le journal");
    assert.match(l[0], /^\d\d:\d\dDURAND P\.Forcé · C••••567820,50 €$/, "la plus récente en haut : " + l[0]);
    assert.match(l[1], /MARTIN S\.••••9012150,00 €$/);
    assert.ok(!/SOPHIE|123456789012/.test(await txt("#journal")), "noms abrégés, N° masqués");
    // Nouvelle saisie : en haut tout de suite, puis une seule fois après confirmation
    await page.fill("#piece", "555566667777");
    await page.fill("#nom", "NOUVEAU");
    await page.fill("#prenom", "anne");
    await page.fill("#montant", "30");
    await page.click("#btnValider");
    await page.waitForTimeout(50);
    assert.match((await lignes())[0], /NOUVEAU A\.••••7777/);
    await page.waitForTimeout(400);
    await page.evaluate(() => rechargerCacheVerif());
    await page.waitForTimeout(200);
    const apres = await lignes();
    assert.strictEqual(apres.length, 3, apres.join(" | "));
    assert.doesNotMatch(apres[0], /envoi/, "confirmée par le serveur");
    assert.strictEqual(await txt("#totalNb"), "3");
    assert.strictEqual(await txt("#totalMontant"), "200,50 €");
    // Replié : mémorisé ; compteur à jour
    await page.click('[data-action="fermerJournal"]');
    assert.ok(!(await vis("#journal")) && (await vis("#languette")));
    assert.strictEqual(await page.evaluate(() => window.__store.cdJournal), "ferme");
    assert.strictEqual(await txt("#compteurJour"), "3");
    // Hors période : ni journal ni languette
    await page.evaluate(() => appliquerDates({ debut: "", fin: "" }, true));
    assert.ok(!(await vis("#journal")) && !(await vis("#languette")));
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_journal: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_journal: ÉCHEC " + e.message);
  process.exit(1);
});
