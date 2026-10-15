// Espace responsable : aperçu préparé à l'appui sur ⚙️ (avant le code), rien d'affiché
// avant que le serveur accepte le code, puis tout visible aussitôt et rechargé ;
// réglages modifiés gardés ; aperçu oublié à la fermeture.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
const { FakeSheet } = require("./fakesheet");
(async () => {
  const sheets = {
    Saisies: new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
      [new Date(), "MARTIN", "SOPHIE", "'123456", 150, ""],
    ]),
  };
  sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  try {
    env.creerCode("258025");
    const appels = () => page.evaluate(() => window.__appels.slice());
    // Appui sur ⚙️ : aperçu demandé, rien d'affiché
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(300);
    assert.strictEqual((await appels()).filter((n) => n === "apercuResponsable").length, 1);
    assert.ok(await page.evaluate(() => apercuAdmin && apercuAdmin.saisies.length === 1), "aperçu reçu");
    assert.strictEqual(await page.isVisible("#zoneAdmin"), false);
    assert.strictEqual((await page.textContent("#listeSaisies")).trim(), "", "rien d'affiché avant le code");
    // Une saisie arrive pendant que le code est tapé (autre appareil)
    sheets.Saisies.appendRow([new Date(), "DURAND", "PAUL", "'880412", 20, ""]);
    // Au moment où le code est accepté, AVANT toute autre réponse du serveur : écrans remplis
    await page.evaluate(() => {
      const avant = afficherZoneAdmin;
      window.afficherZoneAdmin = function () {
        avant();
        const t = (id) => document.getElementById(id).textContent.trim();
        window.__instant = { kpi: t("kpiSaisies"), comptes: t("kpiComptes") };
        document.querySelector('[data-ecran-lien="saisies"]').click();
        window.__instant.lignes = document.querySelectorAll("#listeSaisies .ligne-saisie").length;
        window.__instant.msg = t("msgSaisies");
        document.querySelector('[data-ecran-lien="reglages"]').click();
        const champ = document.getElementById("cfg_NOM_OFFRE");
        window.__instant.reglages = !!champ && champ.value !== "";
        champ.value = "Offre modifiée";
        champ.dispatchEvent(new Event("input", { bubbles: true }));
      };
    });
    await page.fill("#pinSaisi", "258025");
    await page.click("#btnDeverrouiller");
    await page.waitForTimeout(400);
    const i = await page.evaluate(() => window.__instant);
    assert.strictEqual(i.kpi, "1", "chiffres de l'aperçu tout de suite");
    assert.strictEqual(i.lignes, 1, "liste de l'aperçu tout de suite");
    assert.strictEqual(i.msg, "1 saisie(s) · mise à jour…");
    assert.ok(i.reglages, "réglages remplis tout de suite");
    // Puis les réponses à jour
    assert.strictEqual((await page.textContent("#kpiSaisies")).trim(), "2", "chiffres rechargés");
    assert.strictEqual(
      await page.inputValue("#cfg_NOM_OFFRE"),
      "Offre modifiée",
      "réglage en cours de modification gardé"
    );
    await page.click('[data-ecran-lien="saisies"]');
    await page.waitForTimeout(200);
    assert.strictEqual(await page.$$eval("#listeSaisies .ligne-saisie", (x) => x.length), 2, "liste à jour");
    assert.strictEqual(await page.evaluate(() => apercuAdmin), null, "aperçu consommé");
    // Fermeture : plus rien en mémoire, et une réponse tardive n'est pas gardée
    await page.evaluate(() => fermerPanneau());
    assert.strictEqual(await page.evaluate(() => apercuAdmin), null);
    assert.strictEqual(await page.evaluate(() => Object.keys(listesAdmin).length), 0);
    await page.evaluate(() => {
      preparerApercuAdmin();
      oublierApercuAdmin();
    });
    await page.waitForTimeout(200);
    assert.strictEqual(
      await page.evaluate(() => apercuAdmin),
      null,
      "réponse arrivée après la fermeture ignorée"
    );
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_apercu: OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.log("test_ui_apercu: ÉCHEC " + e.message);
  process.exit(1);
});
