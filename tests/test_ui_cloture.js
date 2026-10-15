// Écran Opération (refonte graphique, étape 7) : plus de fenêtres du navigateur.
// - date de fin déjà passée : confirmée d'un second appui sur le bouton ;
// - clôture : confirmée dans la page, résultat affiché dans l'écran (pas d'alert()).
const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const txt = async (sel) => (await page.textContent(sel)).trim();
  try {
    const jeton = env.creerCode("258025").jeton;
    await page.evaluate("jetonAdmin = " + JSON.stringify(jeton.j));
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(150);
    await page.click('[data-ecran-lien="operation"]');
    // Fin déjà passée : premier appui = avertissement, rien d'enregistré
    const finAvant = env.props._store.DATE_FIN;
    await page.fill("#modalDateDebut", "2020-01-01");
    await page.fill("#modalDateFin", "2020-01-31");
    await page.click("#btnMajDates");
    await page.waitForTimeout(100);
    assert.strictEqual(env.props._store.DATE_FIN, finAvant, "rien d'enregistré au premier appui");
    assert.match(await txt("#msgRetourModal"), /déjà passée/);
    assert.strictEqual(await txt("#btnMajDates"), "Confirmer ces dates");
    await page.click("#btnMajDates");
    await page.waitForTimeout(150);
    assert.strictEqual(env.props._store.DATE_FIN, "2020-01-31", "second appui : enregistré");
    assert.strictEqual(await txt("#btnMajDates"), "Mettre à jour les dates");
    // Clôture : confirmation dans la page, résultat dans l'écran, espace toujours ouvert
    env.sheets.Saisies.appendRow([new Date(), "DUPONT", "JEAN", "'AB1", 10, ""]);
    await page.click("#modalParametres >> text=Clôturer maintenant");
    assert.ok(await page.isVisible("#confirmerCloture"));
    await page.click("#confirmerCloture .forcer");
    await page.waitForTimeout(300);
    assert.ok(!(await page.isVisible("#confirmerCloture")));
    assert.ok(await page.isVisible("#modalParametres"), "l'espace responsable reste ouvert");
    assert.match(await txt("#msgRetourModal"), /clôturée/);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 1, "saisies archivées");
    assert.deepStrictEqual(await page.evaluate(() => window.__alertes), []);
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_cloture: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_cloture: ÉCHEC " + e.message);
  process.exit(1);
});
