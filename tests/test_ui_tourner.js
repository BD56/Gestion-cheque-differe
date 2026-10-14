// Tablette tenue en hauteur (refonte graphique, étape 6) : invitation à la tourner sur
// écran tactile seulement, jamais bloquante (« Continuer en hauteur » mémorisé pour la
// session), saisie conservée dessous ; rien sur un ordinateur, même en fenêtre étroite.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  // Ordinateur (souris), fenêtre plus haute que large : pas d'invitation
  const pc = await ouvrir(process.argv[2]);
  try {
    await pc.page.setViewportSize({ width: 700, height: 1000 });
    await pc.page.waitForTimeout(100);
    assert.ok(!(await pc.page.isVisible("#ecranTourner")), "ordinateur : jamais affiché");
  } finally {
    await pc.browser.close();
  }
  // Tablette tactile tenue en hauteur
  const { page, browser, erreursPage } = await ouvrir(process.argv[2], {
    page: { isMobile: true, hasTouch: true, viewport: { width: 800, height: 1200 } },
  });
  try {
    assert.ok(await page.isVisible("#ecranTourner"), "en hauteur : invitation affichée");
    await page.evaluate(() => {
      document.getElementById("piece").value = "AB123";
    });
    // Tournée en largeur : l'invitation disparaît, la saisie est intacte
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(100);
    assert.ok(!(await page.isVisible("#ecranTourner")));
    assert.strictEqual(await page.inputValue("#piece"), "AB123", "saisie conservée");
    // De nouveau en hauteur : « Continuer en hauteur quand même » -> plus redemandé
    await page.setViewportSize({ width: 800, height: 1200 });
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible("#ecranTourner"));
    await page.tap("#ecranTourner .continuer");
    assert.ok(!(await page.isVisible("#ecranTourner")));
    // (ici sessionStorage est refusé à la page, comme dans certains navigateurs : le choix
    // est gardé en mémoire jusqu'au rechargement, sans erreur)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.setViewportSize({ width: 800, height: 1200 });
    await page.waitForTimeout(100);
    assert.ok(!(await page.isVisible("#ecranTourner")), "accepté pour la session");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_tourner: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_tourner: ÉCHEC " + e.message);
  process.exit(1);
});
