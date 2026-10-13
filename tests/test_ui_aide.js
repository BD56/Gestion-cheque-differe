// Aide en tuiles (2 groupes) : une rubrique par écran, « ← Retour », scan masqué
const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  const { page, browser, erreursPage } = await ouvrir(process.argv[2]);
  try {
    await page.click('button[title="Aide et consignes"]');
    await page.waitForTimeout(100);
    const tuilesVisibles = async () =>
      page.$$eval("#modalAide .sous-ecran.actif .tuile", (ts) =>
        ts.filter((t) => t.offsetParent !== null).map((t) => t.textContent.trim())
      );
    let t = await tuilesVisibles();
    assert.strictEqual(t.length, 8, "4 tuiles saisie + 4 responsable (scan masqué) : " + t.join(" | "));
    assert.ok(!t.some((x) => /Scanner/.test(x)), "tuile scan masquée tant que le scan est désactivé");
    assert.match(
      await page.textContent("#modalAide .sous-ecran.actif"),
      /Pour la saisie[\s\S]*Pour le responsable/
    );
    await page.click('#modalAide .tuile:has-text("Les alertes")');
    await page.waitForTimeout(50);
    const actif = await page.textContent("#modalAide .sous-ecran.actif");
    assert.match(actif, /ALERTE FRAUDE[\s\S]*ANOMALIE GRAVE[\s\S]*HOMONYME DÉTECTÉ/);
    assert.strictEqual((await tuilesVisibles()).length, 0, "une seule rubrique à l'écran");
    await page.click("#modalAide .sous-ecran.actif .retour");
    await page.waitForTimeout(50);
    assert.strictEqual((await tuilesVisibles()).length, 8, "retour aux tuiles");
    // Fermer sur une rubrique puis rouvrir : on repart des tuiles
    await page.click('#modalAide .tuile:has-text("Imprimer")');
    await page.click("#modalAide .btn-close-modal");
    assert.ok(!(await page.isVisible("#modalAide")));
    await page.click('button[title="Aide et consignes"]');
    await page.waitForTimeout(50);
    assert.strictEqual((await tuilesVisibles()).length, 8, "réouverture sur les tuiles");
    // Le panneau ⚙️ garde ses propres écrans (pas de mélange avec l'aide)
    await page.click("#modalAide .btn-close-modal");
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible('#modalParametres [data-ecran="accueil"]'));
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_aide: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_aide: ÉCHEC " + e.message);
  process.exit(1);
});
