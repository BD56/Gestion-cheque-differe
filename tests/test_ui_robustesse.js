// Correctifs #2 (doublon immédiat), #3 (bandeau), #4 (période)
const assert = require("assert");
const { ouvrir } = require("./navigateur");
async function saisirClavier(page, piece, nom, prenom) {
  for (const v of [piece, nom, prenom, "10"]) {
    await page.keyboard.type(v);
    await page.keyboard.press("Enter");
  }
  await page.keyboard.press("Enter");
}
(async () => {
  // #2 : même client juste après -> la tablette le voit elle-même (N2 + écran doublon)
  const o = await ouvrir(process.argv[2]);
  const { env, page, browser, erreursPage } = o;
  try {
    await page.focus("#piece");
    await page.waitForTimeout(150);
    await saisirClavier(page, "AB123", "DUPONT", "JEAN");
    await page.waitForTimeout(300);
    assert.ok(
      await page.evaluate(() => cacheVerif.offre.some((x) => x.pieceNorm === "AB123")),
      "la copie locale garde la saisie validée"
    );
    await page.keyboard.type("AB123");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(100);
    assert.match(
      await page.textContent("#verdictPiece"),
      /déjà enregistré/,
      "avertissement N° dès la 2e saisie"
    );
    assert.strictEqual(
      await page.inputValue("#nom"),
      "",
      "#23 : pas de pré-remplissage depuis un doublon de l'offre"
    );
    await page.fill("#nom", "DUPONT");
    await page.fill("#prenom", "JEAN");
    await page.fill("#montant", "5");
    await page.click("#btnValider");
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible("#boxConfirmation"), "écran ALERTE FRAUDE local");
    assert.match(await page.textContent("#titreDoublon"), /ALERTE FRAUDE/);
    await page.click("text=ABANDONNER");
    // Plusieurs rechargements ensuite : pas de doublon fantôme une fois écrite et rechargée
    await page.evaluate(() => {
      rechargerCacheVerif();
      rechargerCacheVerif();
    });
    await page.waitForTimeout(200);
    assert.strictEqual(
      await page.evaluate(() => cacheVerif.offre.filter((x) => x.pieceNorm === "AB123").length),
      1
    );
    assert.strictEqual(
      await page.evaluate(() => saisiesEnAttente.length),
      0,
      "suivi vidé une fois la saisie dans le Sheet"
    );

    // #2 bis : doublon vu SEULEMENT par le serveur -> fenêtre d'alerte (pas un bandeau), formulaire intact
    env.sheets.Saisies.appendRow([new Date(), "MARTIN", "PAUL", "CD456", "1", ""]); // ajouté « ailleurs », la tablette ne le sait pas
    await page.focus("#nom");
    await page.fill("#nom", "MARTIN");
    await page.fill("#prenom", "PAUL");
    await page.fill("#montant", "3");
    await page.evaluate(() => {
      document.getElementById("piece").value = "CD456";
      envoyerSaisie();
    });
    await page.waitForTimeout(200);
    assert.ok(await page.isVisible("#modalAlerteServeur"));
    assert.match(await page.textContent("#alerteServeurTitre"), /ALERTE FRAUDE/);
    assert.match(await page.textContent("#alerteServeurSaisie"), /MARTIN PAUL/);
    assert.ok(await page.isVisible("#alerteServeurChoix"), "SIGNALER : choix NE PAS ENREGISTRER / FORCER");
    await page.waitForTimeout(900); // fenêtre lue (appuis ignorés 0,8 s)
    await page.click("#alerteServeurChoix >> text=FORCER L'AJOUT");
    await page.waitForTimeout(200);
    assert.ok(!(await page.isVisible("#modalAlerteServeur")));
    const derniere = env.sheets.Saisies.getRange(env.sheets.Saisies.getLastRow(), 1, 1, 6).getValues()[0];
    assert.deepStrictEqual(
      [derniere[1], derniere[3], derniere[5]],
      ["MARTIN", "CD456", "⚠️ Ajout forcé (Cas A)"]
    );

    // #3 : un message affiché après un autre reste 5 s
    await page.evaluate(() => {
      afficherMessage("A", "success");
      setTimeout(() => afficherMessage("B", "error"), 2000);
    });
    await page.waitForTimeout(5300);
    assert.ok(await page.isVisible("#statusMessage"), "le 2e message ne doit pas être coupé à 5 s");
    await page.waitForTimeout(2000);
    assert.ok(!(await page.isVisible("#statusMessage")));

    // #4 : offre clôturée pendant que la tablette est ouverte
    env.props.setProperty("DATE_DEBUT", "");
    env.props.setProperty("DATE_FIN", "");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(150);
    assert.ok(!(await page.isVisible("#formulaireSaisie")), "formulaire reverrouillé au retour sur la page");
    const avant = env.sheets.Saisies.getLastRow();
    // même si le formulaire était resté affiché : la tablette bloque, et le serveur aussi
    await page.evaluate(() => {
      document.getElementById("formulaireSaisie").style.display = "block";
      periodeOperation = { debut: "2000-01-01", fin: "2099-01-01" };
      ["piece", "nom", "prenom", "montant"].forEach(
        (id, i) => (document.getElementById(id).value = ["ZZ9", "A", "B", "1"][i])
      );
      envoyerSaisie();
    });
    await page.waitForTimeout(200);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), avant, "rien d'écrit hors période");
    assert.match(await page.textContent("#alerteServeurTitre"), /HORS PÉRIODE/);
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_robustesse : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
