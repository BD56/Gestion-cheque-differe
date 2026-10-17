// Pas d'écran provisoire faux : l'écran de connexion et le verrou de l'espace responsable
// s'affichent AUSSITÔT avec l'état connu (glissé dans la page / gardé depuis la connexion),
// puis le serveur confirme en UNE question ; sans état connu : « Chargement… », rien de faux.
const assert = require("assert");
const { ouvrir, J } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const c = env.ctx;
  const attendre = (ms) => page.waitForTimeout(ms || 300);
  try {
    // --- Écran de connexion : bon texte dès la première image (même instant JS) ---
    let e = await page.evaluate(() => {
      oublierSession();
      afficherEcranConnexion();
      return {
        titre: document.getElementById("titreConnexion").textContent,
        texte: document.getElementById("txtConnexion").textContent,
        form: document.getElementById("formConnexion").style.display,
      };
    });
    assert.deepStrictEqual(e, {
      titre: "Connexion",
      texte: "Connectez-vous avec le compte du magasin. Le navigateur peut retenir le mot de passe.",
      form: "",
    });
    // sans état connu : « Chargement… » et pas de formulaire, puis la réponse
    e = await page.evaluate(() => {
      etatAccueil = null;
      afficherEcranConnexion();
      return [
        document.getElementById("txtConnexion").textContent,
        document.getElementById("formConnexion").style.display,
      ];
    });
    assert.deepStrictEqual(e, ["Chargement…", "none"]);
    await attendre();
    assert.match(await page.textContent("#txtConnexion"), /^Connectez-vous avec le compte du magasin/);
    await page.fill("#identifiant", "Caisse test");
    await page.fill("#motDePasse", "motdepasse-test");
    await page.click("#btnConnexion");
    await attendre(500);
    assert.ok(!(await page.isVisible("#ecranConnexion")), "connecté");

    // --- Codes personnels : l'état du verrou arrive avec le démarrage (rien de plus) ---
    const s = await page.evaluate(() => SESSION);
    assert.ok(J(c.passerCodesPersonnels("Marie", "111111", null, s)).ok);
    await page.evaluate(() => demarrerApplication());
    await attendre();
    await page.evaluate(() => (window.__appels = []));
    // ⚙️ : nom + code tout de suite (même instant JS), jamais le code seul d'abord
    e = await page.evaluate(() => {
      document.querySelector('button[title="Panneau de contrôle"]').click();
      const choix = document.getElementById("personneVerrou");
      return {
        texte: document.getElementById("txtVerrou").textContent,
        noms: Array.from(choix.options).map((o) => o.textContent),
        choixVisible: choix.style.display !== "none",
        code: document.getElementById("pinSaisi").style.display,
      };
    });
    assert.deepStrictEqual(e, {
      texte: "Choisissez votre nom, puis tapez votre code.",
      noms: ["Qui êtes-vous ?", "Marie"],
      choixVisible: true,
      code: "",
    });
    await attendre();
    const appels = await page.evaluate(() => window.__appels);
    assert.strictEqual(appels.filter((x) => x === "etatVerrou").length, 1, "une seule question");
    assert.ok(!appels.includes("personnesResponsables") && !appels.includes("etatAdmin"));

    // Changé ailleurs (autre appareil) : affiché d'après l'état gardé, puis corrigé
    const idMarie = J(c.personnesResponsables(s))[0].id;
    const jm = { j: J(c.ouvrirSessionAdmin("111111", s, idMarie)).jeton, c: s };
    assert.ok(J(c.ajouterPersonne("Paul", "222222", jm)).ok);
    await page.click("#modalParametres .btn-close-modal");
    await page.selectOption("#personneVerrou", { label: "Marie" }).catch(() => {});
    e = await page.evaluate(() => {
      document.querySelector('button[title="Panneau de contrôle"]').click();
      return Array.from(document.getElementById("personneVerrou").options).map((o) => o.textContent);
    });
    assert.deepStrictEqual(e, ["Qui êtes-vous ?", "Marie"], "état gardé d'abord");
    await attendre();
    assert.deepStrictEqual(
      await page.$$eval("#personneVerrou option", (os) => os.map((o) => o.textContent)),
      ["Qui êtes-vous ?", "Marie", "Paul"],
      "puis corrigé par le serveur"
    );

    // Sans état connu (oublié) : « Chargement… », ni nom ni code, puis le bon écran
    await page.click("#modalParametres .btn-close-modal");
    e = await page.evaluate(() => {
      oublierEtatVerrou();
      document.querySelector('button[title="Panneau de contrôle"]').click();
      return [
        document.getElementById("txtVerrou").textContent,
        document.getElementById("pinSaisi").style.display,
        document.getElementById("personneVerrou").style.display,
      ];
    });
    assert.deepStrictEqual(e, ["Chargement…", "none", "none"]);
    await attendre();
    assert.ok(await page.isVisible("#pinSaisi"));
    assert.ok(await page.isVisible("#personneVerrou"));
    // Déconnexion : les noms ne restent pas en mémoire
    await page.evaluate(() => oublierSession());
    assert.strictEqual(await page.evaluate(() => etatVerrouConnu), null);
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_affichage_immediat : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
