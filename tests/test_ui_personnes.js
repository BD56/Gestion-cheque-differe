// Écrans des codes personnels : les choisir (code obligatoire), ajouter une personne,
// « Qui êtes-vous ? » + code, journal « compte · personne », retour au code commun,
// choix à la 1re installation.
const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const P = env.props._store;
  const vis = (s) => page.isVisible(s),
    txt = async (s) => (await page.textContent(s)).trim(),
    attendre = (ms) => page.waitForTimeout(ms || 250);
  const journal = () => {
    const l = env.sheets._Journal.getDataRange().getValues();
    return l[l.length - 1];
  };
  try {
    // Sans code (obligatoire) : ⚙️ fait choisir — « Des codes personnels » : nom + code
    await page.click('button[title="Panneau de contrôle"]');
    await attendre(300);
    assert.ok((await vis("#blocCodeAPart")) && !(await vis("#zoneAdmin")));
    await page.click("#btnCodeAPartPerso");
    assert.ok((await vis("#nomAPart")) && !(await vis("#btnCodeAPartOui")));
    await page.fill("#nomAPart", "Marie");
    await page.fill("#pinAPart", "111111");
    await page.fill("#pinAPart2", "111112");
    await page.click("#btnCodeAPartPerso");
    assert.match(await txt("#msgCodeAPart"), /ne correspondent pas/);
    await page.fill("#pinAPart2", "111111");
    await page.click("#btnCodeAPartPerso");
    await attendre(300);
    assert.ok(!(await vis("#ecranConnexion")) && (await vis("#zoneAdmin")), "espace ouvert aussitôt");
    assert.match(await txt("#adminSous"), /Déverrouillé par Marie · se reverrouille après 3 min/);
    await page.click('[data-ecran-lien="code"]');
    await attendre();
    assert.match(await txt("#etatCodeAPart"), /^Codes personnels/);
    assert.ok((await vis("#blocPersonnes")) && !(await vis("#formPasserPersonnels")));
    assert.match(await txt("#listePersonnes"), /Marie \(vous\)/);
    assert.ok(await vis("#formMonCode"));
    assert.ok(!P.ADMIN_PIN_HASH && P.RESPONSABLES);
    assert.strictEqual(await txt("#kpiResponsables"), "1");

    // Ajouter Paul (son code tapé par lui)
    await page.fill("#nomPersonne", "Paul");
    await page.fill("#codePersonne", "222222");
    await page.fill("#codePersonne2", "222222");
    await page.click("#formAjoutPersonne button");
    await attendre(300);
    assert.match(await txt("#msgPersonne"), /« Paul » peut ouvrir l'espace responsable/);
    assert.match(await txt("#listePersonnes"), /Marie \(vous\)[\s\S]*Paul/);
    assert.deepStrictEqual(journal().slice(1, 4), [
      "Caisse test · Marie",
      "Personne ajoutée (code personnel)",
      "Paul",
    ]);

    // Verrouiller → « Qui êtes-vous ? » + code
    await page.click("#btnVerrouiller");
    await attendre(300);
    assert.ok(await vis("#personneVerrou"));
    assert.match(await txt("#txtVerrou"), /Choisissez votre nom/);
    assert.deepStrictEqual(
      await page.$$eval("#personneVerrou option", (os) => os.map((o) => o.textContent)),
      ["Qui êtes-vous ?", "Marie", "Paul"]
    );
    await page.fill("#pinSaisi", "222222");
    await page.click("#btnDeverrouiller");
    assert.match(await txt("#msgVerrou"), /Choisissez votre nom/);
    await page.selectOption("#personneVerrou", { label: "Paul" });
    await page.fill("#pinSaisi", "111111");
    await page.click("#btnDeverrouiller");
    await attendre(300);
    assert.match(await txt("#msgVerrou"), /Code faux/, "le code de Marie ne vaut pas pour Paul");
    for (const k in P) if (k.indexOf("PIN_ESSAIS_") === 0) delete P[k];
    await page.fill("#pinSaisi", "222222");
    await page.click("#btnDeverrouiller");
    await attendre(300);
    assert.ok(await vis("#zoneAdmin"));
    assert.match(await txt("#adminSous"), /Déverrouillé par Paul/);
    // Une action : le journal nomme Paul
    await page.click('[data-ecran-lien="securite"]');
    await page.click("#modeBloquant");
    await attendre(300);
    assert.deepStrictEqual(journal().slice(1, 3), ["Caisse test · Paul", "Mode de sécurité"]);
    // Le dernier nom choisi est repris sur cet appareil
    await page.click("#btnVerrouiller");
    await attendre(300);
    assert.strictEqual(
      await page.$eval("#personneVerrou", (s) => s.options[s.selectedIndex].textContent),
      "Paul"
    );
    await page.fill("#pinSaisi", "222222");
    await page.click("#btnDeverrouiller");
    await attendre(300);

    // Revenir au code commun : second appui (les codes personnels sont retirés)
    await page.click('[data-ecran-lien="code"]');
    await attendre();
    assert.strictEqual(await txt("#btnEnregistrerPin"), "Revenir au code commun");
    await page.fill("#pinNouveau", "333333");
    await page.fill("#pinNouveau2", "333333");
    await page.click("#btnEnregistrerPin");
    assert.ok(P.RESPONSABLES, "rien au premier appui");
    await page.click("#btnEnregistrerPin");
    await attendre(300);
    assert.ok(!P.RESPONSABLES && P.ADMIN_PIN_HASH);
    assert.match(await txt("#etatCodeAPart"), /^Code commun/);
    assert.ok(await vis("#formPasserPersonnels"));
    assert.deepStrictEqual(journal().slice(1, 3), [
      "Caisse test · Paul",
      "Retour au code commun (codes personnels retirés)",
    ]);

    // 1re installation : « Oui, des codes personnels » (votre nom + votre code)
    env.activeEmail = "editeur@example.com";
    env.ctx.reinitialiserComptesPanneau();
    env.activeEmail = "";
    await page.evaluate(() => {
      fermerPanneau();
      oublierSession();
      afficherEcranConnexion();
    });
    await attendre();
    await page.fill("#activationConnexion", env.activation());
    await page.fill("#identifiant", "Caisse centrale 1");
    await page.fill("#motDePasse", "motdepasse1");
    await page.fill("#motDePasse2", "motdepasse1");
    await page.click("#btnConnexion");
    await attendre();
    assert.match(await txt("#txtCodeAPart"), /codes personnels/);
    await page.click("#btnCodeAPartPerso");
    assert.ok((await vis("#nomAPart")) && !(await vis("#btnCodeAPartOui")));
    await page.fill("#pinAPart", "444444");
    await page.fill("#pinAPart2", "444444");
    await page.click("#btnCodeAPartPerso");
    assert.match(await txt("#msgCodeAPart"), /Saisissez votre nom/);
    await page.fill("#nomAPart", "Marie");
    await page.click("#btnCodeAPartPerso");
    await attendre(300);
    assert.ok(!(await vis("#ecranConnexion")));
    assert.deepStrictEqual(
      JSON.parse(P.RESPONSABLES).map((p) => p.nom),
      ["Marie"]
    );
    await page.click('button[title="Panneau de contrôle"]');
    await attendre(300);
    assert.ok((await vis("#personneVerrou")) && !(await vis("#zoneAdmin")), "nom + code demandés");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_personnes : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
