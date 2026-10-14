const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], {
    sansCle: true,
    tabletteReelle: true,
  });
  const vis = (s) => page.isVisible(s),
    txt = async (s) => (await page.textContent(s)).trim();
  try {
    await page.waitForTimeout(200);
    // Tablette neuve, 1re installation : écran d'autorisation, rien d'autre n'a été chargé
    assert.ok(await vis("#ecranAppairage"));
    assert.match(await txt("#txtAppairage"), /code d'activation/);
    assert.match(
      await txt("#diagAppairage"),
      /^Clé absente de ce navigateur · Adresse technique : \S+$/,
      "diagnostic : raison + adresse"
    );
    assert.ok((await vis("#blocPinApp2")) && (await vis("#blocActivationApp")));
    assert.strictEqual(
      await page.evaluate(() => cacheVerif),
      null,
      "aucune donnée chargée avant autorisation"
    );
    await page.fill("#pinApp", "1234");
    await page.click("#btnAppairer");
    assert.match(await txt("#msgAppairage"), /6 chiffres/);
    await page.fill("#pinApp", "258025");
    await page.fill("#pinApp2", "258025");
    assert.strictEqual(
      await page.inputValue("#nomTablette"),
      "",
      "nom à choisir (plus de « Tablette caisse »)"
    );
    await page.click("#btnAppairer");
    assert.match(await txt("#msgAppairage"), /Donnez un nom/, "nom obligatoire");
    await page.fill("#nomTablette", "Caisse centrale 1");
    await page.click("#btnAppairer");
    await page.waitForTimeout(100);
    assert.match(
      await txt("#msgAppairage"),
      /code d'activation/,
      "sans code d'activation : rien n'est envoyé"
    );
    await page.fill("#activationApp", env.activation());
    await page.click("#btnAppairer");
    await page.waitForTimeout(300);
    assert.ok(!(await vis("#ecranAppairage")), "écran fermé après autorisation");
    assert.ok(await page.evaluate(() => !!window.__store.cdTabletteCle), "clé mémorisée");
    assert.ok(await vis("#formulaireSaisie"));
    assert.ok(await page.evaluate(() => cacheVerif !== null), "application démarrée");
    // Saisie normale
    await page.focus("#piece");
    for (const v of ["AB1", "DUPONT", "JEAN", "10"]) {
      await page.keyboard.type(v);
      await page.keyboard.press("Enter");
    }
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2);
    // Espace responsable -> Code & tablettes : cette tablette listée, puis « tout retirer »
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(150);
    await page.fill("#pinSaisi", "258025");
    await page.press("#pinSaisi", "Enter");
    await page.waitForTimeout(200);
    await page.click('[data-ecran-lien="code"]');
    await page.waitForTimeout(200);
    assert.match(await txt("#listeTablettes"), /Caisse centrale 1\s+\(cet appareil\)/);
    assert.match(await txt("#diagTablettes"), /^Cet appareil · Adresse technique : \S+$/);
    await page.click("#btnRetirerTout");
    assert.match(await txt("#btnRetirerTout"), /Confirmer/, "second appui demandé");
    assert.ok(await vis("#modalParametres"), "rien de retiré au premier appui");
    await page.click("#btnRetirerTout");
    await page.waitForTimeout(250);
    assert.ok((await vis("#ecranAppairage")) && !(await vis("#modalParametres")));
    assert.doesNotMatch(
      await page.evaluate(() => getComputedStyle(document.getElementById("ecranAppairage")).backgroundColor),
      /rgba/,
      "écran d'autorisation opaque : rien de l'application derrière"
    );
    assert.match(await txt("#txtAppairage"), /un responsable doit l'autoriser/);
    assert.ok(!(await vis("#blocPinApp2")), "code existant : pas de confirmation");
    assert.strictEqual(await page.evaluate(() => window.__store.cdTabletteCle), undefined, "clé oubliée");
    assert.match(await txt("#diagAppairage"), /^Appareil retiré de la liste · /);
    // Ré-autorisation ; puis retrait côté serveur pendant l'usage -> l'écran revient
    await page.fill("#pinApp", "258025");
    await page.click("#btnAppairer");
    await page.waitForTimeout(300);
    assert.ok(!(await vis("#ecranAppairage")));
    env.props.setProperty("TABLETTES", "[]");
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(250);
    assert.ok(await vis("#ecranAppairage"));
    assert.match(await txt("#msgAppairage"), /plus autorisé/);
    assert.match(await txt("#diagAppairage"), /^Clé refusée par le serveur · /);
    assert.ok(
      await page.evaluate(() => !!window.__store.cdTabletteCle),
      "clé gardée (refus peut-être passager)"
    );
    // Nouvelle autorisation : la clé est remplacée
    const ancienne = await page.evaluate(() => window.__store.cdTabletteCle);
    await page.fill("#pinApp", "258025");
    await page.click("#btnAppairer");
    await page.waitForTimeout(300);
    assert.ok(!(await vis("#ecranAppairage")));
    assert.notStrictEqual(await page.evaluate(() => window.__store.cdTabletteCle), ancienne, "clé remplacée");
    // Incident passager de Google en lisant la liste : pas d'écran d'autorisation, clé gardée
    const lireVraie = env.props.getProperty;
    env.props.getProperty = (k) => {
      if (k === "TABLETTES") throw new Error("Service error: Properties");
      return lireVraie(k);
    };
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForTimeout(250);
    env.props.getProperty = lireVraie;
    assert.ok(!(await vis("#ecranAppairage")), "pas d'écran d'autorisation sur un incident passager");
    assert.ok(await page.evaluate(() => !!window.__store.cdTabletteCle), "clé gardée");
    // Clé perdue par le navigateur : le nom est déjà pris -> remplacement proposé, confirmé d'un appui
    await page.evaluate(() => {
      delete window.__store.cdTabletteCle;
      afficherEcranAppairage();
    });
    await page.waitForTimeout(150);
    await page.fill("#pinApp", "258025");
    await page.fill("#nomTablette", "caisse centrale 1");
    await page.click("#btnAppairer");
    await page.waitForTimeout(250);
    assert.match(
      await txt("#msgAppairage"),
      /« Caisse centrale 1 » est déjà le nom d'un appareil autorisé le/
    );
    assert.ok(await vis("#btnRemplacerAppareil"), "remplacement proposé");
    assert.strictEqual(await txt("#btnRemplacerAppareil"), "Remplacer « caisse centrale 1 »");
    assert.strictEqual(await page.inputValue("#pinApp"), "258025", "code gardé pour confirmer");
    assert.strictEqual(
      JSON.parse(env.props._store.TABLETTES).length,
      1,
      "rien de remplacé sans confirmation"
    );
    await page.fill("#nomTablette", "Caisse centrale 2");
    assert.ok(!(await vis("#btnRemplacerAppareil")), "nom changé : proposition retirée");
    await page.fill("#nomTablette", "caisse centrale 1");
    await page.click("#btnAppairer");
    await page.waitForTimeout(250);
    const idAvant = JSON.parse(env.props._store.TABLETTES)[0].id;
    await page.click("#btnRemplacerAppareil");
    await page.waitForTimeout(300);
    assert.ok(!(await vis("#ecranAppairage")), "appareil remplacé et démarré");
    const apres = JSON.parse(env.props._store.TABLETTES);
    assert.strictEqual(apres.length, 1, "remplacé, pas ajouté");
    assert.notStrictEqual(apres[0].id, idAvant);
    assert.ok(await page.evaluate(() => !!window.__store.cdTabletteCle), "nouvelle clé mémorisée");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_tablettes : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
