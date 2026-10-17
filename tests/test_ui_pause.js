// Après un code ou un mot de passe faux : bouton grisé avec une roue (pas de décompte en
// secondes), réactivé seul à la fin de la pause ; rien ne part pendant la pause.
// Code d'activation collé avec des espaces / du texte autour : remis en forme 1234-5678.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const P = env.props._store;
  const attendre = (ms) => page.waitForTimeout(ms || 300);
  const etatBouton = (sel) =>
    page.$eval(sel, (b) => ({ grise: b.disabled, roue: b.classList.contains("en-pause") }));
  try {
    // --- Verrou de l'espace responsable ---
    env.creerCode("258025");
    await page.click('button[title="Panneau de contrôle"]');
    await attendre();
    await page.fill("#pinSaisi", "111111");
    await page.click("#btnDeverrouiller");
    await attendre();
    assert.strictEqual((await page.textContent("#msgVerrou")).trim(), "Code faux (4 essai(s) restant(s)).");
    assert.deepStrictEqual(await etatBouton("#btnDeverrouiller"), { grise: true, roue: true });
    // pendant la pause : Entrée ne part pas (aucun appel au serveur)
    await page.evaluate(() => (window.__appels = []));
    await page.fill("#pinSaisi", "258025");
    await page.press("#pinSaisi", "Enter");
    await attendre();
    assert.ok(!(await page.evaluate(() => window.__appels)).includes("ouvrirSessionAdmin"));
    // fin de la pause (raccourcie pour le test) : bouton actif, la roue disparaît
    await page.evaluate(() => {
      const b = document.getElementById("btnDeverrouiller");
      clearTimeout(Number(b.dataset.pause));
      pauseBouton(b, 50);
    });
    for (const k in P) if (k.indexOf("PIN_ESSAIS_") === 0) delete P[k]; // pause côté serveur sautée
    await attendre(200);
    assert.deepStrictEqual(await etatBouton("#btnDeverrouiller"), { grise: false, roue: false });
    await page.click("#btnDeverrouiller");
    await attendre();
    assert.ok(await page.isVisible("#zoneAdmin"), "bon code après la pause");

    // --- Écran de connexion ---
    await page.evaluate(() => {
      fermerPanneau();
      oublierSession();
      afficherEcranConnexion();
    });
    await attendre();
    await page.fill("#identifiant", "Caisse test");
    await page.fill("#motDePasse", "mauvais-mdp");
    await page.click("#btnConnexion");
    await attendre();
    assert.strictEqual(
      (await page.textContent("#msgConnexion")).trim(),
      "Mot de passe incorrect (9 essai(s) avant un blocage)."
    );
    assert.deepStrictEqual(await etatBouton("#btnConnexion"), { grise: true, roue: true });
    assert.ok(!/\d+ s/.test(await page.textContent("#msgConnexion")), "pas de décompte");

    // --- Code d'activation collé ---
    env.activeEmail = "editeur@example.com";
    env.ctx.reinitialiserComptesPanneau();
    env.activeEmail = "";
    await page.evaluate(() => {
      etatAccueil = null;
      afficherEcranConnexion();
    });
    await attendre();
    const coller = async (texte) => {
      await page.fill("#activationConnexion", "");
      await page.focus("#activationConnexion");
      await page.keyboard.insertText(texte); // comme un collage
      return page.inputValue("#activationConnexion");
    };
    assert.strictEqual(await coller(" 1234-5678 "), "1234-5678", "espaces autour");
    assert.strictEqual(await coller("Code d'activation : 1234-5678\n"), "1234-5678", "texte autour");
    assert.strictEqual(await coller("12345678"), "1234-5678", "sans tiret");
    assert.strictEqual(await coller("1234 – 5678"), "1234-5678", "autre tiret");
    // le vrai code, collé avec un espace : accepté par le serveur
    const act = env.activation();
    await coller(" " + act + " ");
    await page.fill("#identifiant", "Caisse test");
    await page.fill("#motDePasse", "motdepasse-test");
    await page.fill("#motDePasse2", "motdepasse-test");
    await page.click("#btnConnexion");
    await attendre(500);
    assert.ok(await page.isVisible("#blocCodeAPart"), "compte créé : choix du code");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_pause : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
