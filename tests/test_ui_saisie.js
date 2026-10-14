// Écran de saisie « Comptoir » (refonte graphique, étape 2) : puces de l'en-tête, étapes
// 1-2-3 qui passent au vert, verdict sous le N° (vert / rouge), effacé quand le N° change.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [new Date(), "MARTIN", "SOPHIE", "123456789012", "150 €", ""],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("BLOQUANT");
  const { page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  const classe = (sel) => page.getAttribute(sel, "class");
  try {
    // En-tête : offre en cours (vert) et mode lu au démarrage
    assert.match(await classe("#puceOffre"), /en-cours/);
    assert.match(await page.textContent("#sousTitreOperation"), /^Offre en cours · .* · jour [1-3] sur 3$/);
    assert.strictEqual(await page.textContent("#txtMode"), "Mode Bloquant");
    assert.match(await classe("#puceMode"), /bloquant/);
    // Étapes : rien de rempli
    for (const n of ["#num1", "#num2", "#num3"]) assert.doesNotMatch(await classe(n), /fait/, n);
    // N° inconnu : verdict vert ; étape 1 faite
    await page.fill("#piece", "999");
    await page.press("#piece", "Tab");
    await page.waitForTimeout(50);
    assert.match(await classe("#verdictPiece"), /ok/);
    assert.match(await page.textContent("#verdictPiece"), /pas encore enregistré/);
    assert.match(await classe("#num1"), /fait/);
    // Le N° change : verdict effacé
    await page.fill("#piece", "123456789012");
    assert.ok(!(await page.isVisible("#verdictPiece")), "verdict effacé à la frappe");
    // N° déjà enregistré : verdict rouge avec le client, le formulaire reste utilisable
    await page.press("#piece", "Tab");
    await page.waitForTimeout(50);
    assert.match(await classe("#verdictPiece"), /ko/);
    assert.match(await page.textContent("#verdictPiece"), /MARTIN SOPHIE.*150,00 €/);
    assert.match(await page.textContent("#verdictPiece"), /sera refusé/);
    await page.fill("#nom", "DURAND");
    await page.fill("#prenom", "PAUL");
    assert.match(await classe("#num2"), /fait/);
    assert.doesNotMatch(await classe("#num3"), /fait/, "montant obligatoire, pas encore saisi");
    await page.fill("#montant", "20");
    assert.match(await classe("#num3"), /fait/);
    // Bouton : texte normal
    assert.strictEqual((await page.textContent("#btnValider")).trim(), "Enregistrer");
    // Usurpation refusée (BLOQUANT) -> retour au formulaire vidé : étapes et verdict remis à zéro
    await page.click("#btnValider");
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible("#actionBloquant"));
    await page.click("text=RETOUR À LA SAISIE");
    assert.ok(await page.isVisible("#formulaireSaisie"));
    assert.ok(!(await page.isVisible("#verdictPiece")));
    for (const n of ["#num1", "#num2", "#num3"]) assert.doesNotMatch(await classe(n), /fait/, n);
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_saisie: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_saisie: ÉCHEC " + e.message);
  process.exit(1);
});
