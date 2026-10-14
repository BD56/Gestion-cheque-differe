// Alerte comparative (refonte graphique, étape 3) : titre du cas, champs IDENTIQUE /
// DIFFÉRENT, forçage seulement après confirmation dans la fenêtre.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [new Date(), "MARTIN", "SOPHIE", "123456", "150 €", ""],
      [new Date(), "DURAND", "PAUL", "880412", "20 €", ""],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  const S = env.sheets.Saisies;
  const txt = async (sel) => (await page.textContent(sel)).replace(/\s+/g, " ").trim();
  const saisir = async (piece, nom, prenom) => {
    await page.fill("#piece", piece);
    await page.fill("#nom", nom);
    await page.fill("#prenom", prenom);
    await page.fill("#montant", "30");
    await page.click("#btnValider");
    await page.waitForTimeout(100);
  };
  try {
    // B : pièce d'un autre client
    await saisir("123456", "LEROY", "ANNE");
    assert.ok(await page.isVisible("#boxConfirmation"));
    assert.strictEqual(await txt("#titreCas"), "Cette pièce appartient à un autre client");
    assert.match(await txt("#titreDoublon"), /^ANOMALIE GRAVE · même pièce, autre nom$/);
    assert.doesNotMatch(await page.getAttribute("#teteDoublon", "class"), /\bc\b/, "B : rouge");
    const rangs = await page.$$eval("#listeDoublons .rang", (rs) => rs.map((r) => r.textContent));
    assert.deepStrictEqual(rangs.slice(1, 4), [
      "NomLEROYMARTINDIFFÉRENT",
      "PrénomANNESOPHIEDIFFÉRENT",
      "N° de pièce123456123456IDENTIQUE",
    ]);
    assert.match(rangs[4], /Montant30,00 €150,00 €/);
    // « Enregistrer quand même… » n'envoie rien : il ouvre la confirmation
    assert.ok(!(await page.isVisible("#confirmerForcage")));
    await page.click("#boxConfirmation >> text=Enregistrer quand même…");
    await page.waitForTimeout(150);
    assert.ok(await page.isVisible("#confirmerForcage"));
    assert.match(await txt("#txtConfirmerForcage"), /Ajout forcé \(Cas B\)/);
    assert.strictEqual(S.getLastRow(), 3, "rien écrit avant la confirmation");
    await page.click("#confirmerForcage >> text=Annuler");
    assert.ok(!(await page.isVisible("#confirmerForcage")));
    await page.click("#actionSignaler >> text=Ne pas enregistrer");
    assert.ok(!(await page.isVisible("#boxConfirmation")));
    assert.strictEqual(await page.inputValue("#nom"), "", "formulaire vidé");
    assert.strictEqual(S.getLastRow(), 3);

    // C : homonyme -> orange, seconde pièce demandée, forçage confirmé -> écrit
    await saisir("999999", "DURAND", "PAUL");
    assert.strictEqual(await txt("#titreCas"), "Un client porte déjà ce nom");
    assert.match(await page.getAttribute("#teteDoublon", "class"), /\bc\b/, "C : orange");
    await page.click("#boxConfirmation >> text=Enregistrer quand même…");
    assert.match(await txt("#txtConfirmerForcage"), /^Seconde pièce vérifiée \?.*Cas C/);
    await page.click("#boxConfirmation >> text=Confirmer l'enregistrement forcé");
    await page.waitForTimeout(300);
    assert.ok(!(await page.isVisible("#boxConfirmation")));
    assert.strictEqual(S.getLastRow(), 4);
    assert.match(S.getRange(4, 6).getValue(), /Ajout forcé \(Cas C\)/);
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_alerte: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_alerte: ÉCHEC " + e.message);
  process.exit(1);
});
