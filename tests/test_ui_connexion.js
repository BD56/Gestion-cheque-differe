// Écran de connexion : 1re installation, code à part, session gardée, déconnexion,
// fin de session pendant la saisie (rien de perdu), envoi réel du formulaire.
const assert = require("assert");
const { ouvrir, J } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], {
    sansSession: true,
    sessionReelle: true,
    urlAppli: "https://appli.test/exec",
  });
  const P = env.props._store;
  const vis = (s) => page.isVisible(s),
    txt = async (s) => (await page.textContent(s)).trim(),
    attendre = (ms) => page.waitForTimeout(ms || 250),
    stock = (k) => page.evaluate((k) => window.__store[k], k);
  // Envoi réel du formulaire (cadre caché) : ce que le gestionnaire de mots de passe voit
  const envois = [];
  await page.route("https://appli.test/**", (r) => {
    envois.push(r.request().postData() || "");
    r.fulfill({ contentType: "text/html", body: "" });
  });
  const connecter = async (id, mdp) => {
    await page.fill("#identifiant", id);
    await page.fill("#motDePasse", mdp);
    await page.click("#btnConnexion");
    await attendre();
  };
  try {
    // --- 1re installation : aucun compte ---
    assert.ok(await vis("#ecranConnexion"));
    assert.strictEqual(await txt("#titreConnexion"), "Première installation");
    assert.ok((await vis("#activationConnexion")) && (await vis("#motDePasse2")));
    assert.strictEqual(await page.getAttribute("#motDePasse", "autocomplete"), "new-password");
    assert.strictEqual(await page.evaluate(() => cacheVerif), null, "rien de chargé avant la connexion");
    await page.click("#btnConnexion");
    assert.match(await txt("#msgConnexion"), /code d'activation/);
    await page.fill("#activationConnexion", "1234-5678");
    await page.click("#btnConnexion");
    assert.match(await txt("#msgConnexion"), /identifiant/);
    await page.fill("#identifiant", "Caisse centrale 1");
    await page.fill("#motDePasse", "court");
    await page.click("#btnConnexion");
    assert.match(await txt("#msgConnexion"), /au moins 8 caractères/);
    await page.fill("#motDePasse", "motdepasse1");
    await page.fill("#motDePasse2", "autre-chose");
    await page.click("#btnConnexion");
    assert.match(await txt("#msgConnexion"), /ne correspondent pas/);
    assert.strictEqual(envois.length, 0, "formulaire incomplet : rien d'envoyé");
    await page.fill("#motDePasse2", "motdepasse1");
    const act = env.activation(); // affiché dans le Google Sheets
    await page.click("#btnConnexion");
    await attendre();
    assert.match(await txt("#msgConnexion"), /Code d'activation incorrect/, "vérifié par le serveur");
    await page.fill("#activationConnexion", act);
    await page.click("#btnConnexion");
    await attendre();
    // envoi réel vers le cadre caché, la page ne change pas
    assert.ok(envois.some((d) => /username=Caisse\+centrale\+1/.test(d) && /password=motdepasse1/.test(d)));
    assert.ok(await page.$("#formulaireSaisie"), "la page n'a pas quitté l'application");
    // Code à part ? (question après le 1er compte)
    assert.ok(await vis("#blocCodeAPart"));
    assert.ok(!(await vis("#formConnexion")));
    assert.match(await txt("#txtConnexion"), /« Caisse centrale 1 » est connecté/);
    assert.match(await stock("cdSession"), /^S1\./, "session gardée");
    assert.strictEqual(await stock("cdCompte"), "Caisse centrale 1");
    await page.click("#btnCodeAPartNon");
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")));
    assert.ok(await page.evaluate(() => cacheVerif !== null), "application démarrée");
    // Saisie normale
    const saisir = async (piece, nom) => {
      await page.focus("#piece");
      for (const v of [piece, nom, "JEAN", "10"]) {
        await page.keyboard.type(v);
        await page.keyboard.press("Enter");
      }
      await page.keyboard.press("Enter");
      await attendre(300);
    };
    await saisir("AB1", "DUPONT");
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2);

    // --- Sans code à part : ⚙️ ouvre directement l'espace responsable ---
    await page.click('button[title="Panneau de contrôle"]');
    await attendre(300);
    assert.ok(await vis("#zoneAdmin"), "ouvert sans code");
    assert.ok(!(await vis("#btnVerrouiller")), "pas de « Verrouiller » sans code");
    assert.ok(await vis("#btnDeconnexionRail"));
    assert.match(await txt("#adminSous"), /Connecté : Caisse centrale 1/);
    // --- Se déconnecter ---
    await page.click("#btnDeconnexionRail");
    await attendre();
    assert.ok((await vis("#ecranConnexion")) && !(await vis("#modalParametres")));
    assert.strictEqual(await txt("#titreConnexion"), "Connexion");
    assert.ok(!(await vis("#activationConnexion")) && !(await vis("#motDePasse2")));
    assert.strictEqual(await page.getAttribute("#motDePasse", "autocomplete"), "current-password");
    assert.strictEqual(await stock("cdSession"), undefined, "session oubliée");
    await connecter("Caisse centrale 1", "mauvais-mdp");
    assert.match(await txt("#msgConnexion"), /Mot de passe incorrect/);
    for (const k in P) if (k.indexOf("CPT_ESSAIS_") === 0) delete P[k]; // sans la pause de 10 s
    await connecter("caisse centrale 1", "motdepasse1");
    assert.ok(!(await vis("#ecranConnexion")), "connecté");
    assert.match(await stock("cdSession"), /^S1\./);

    // --- Fin de session (3 h du matin, mot de passe changé…) pendant la frappe ---
    await page.focus("#piece");
    await page.keyboard.type("CD2");
    await page.fill("#nom", "DURAND");
    P.SESSION_SECRET = "secret-change"; // toutes les sessions ouvertes tombent
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await attendre(300);
    assert.ok(await vis("#ecranConnexion"));
    assert.match(await txt("#msgConnexion"), /Session terminée/);
    assert.strictEqual(await stock("cdSession"), undefined);
    await connecter("Caisse centrale 1", "motdepasse1");
    assert.strictEqual(await page.inputValue("#nom"), "DURAND", "saisie en cours gardée");
    assert.strictEqual(await page.inputValue("#piece"), "CD2");
    // … et une saisie validée juste avant la fin de session part après la reconnexion
    await page.fill("#piece", "");
    await page.fill("#nom", "");
    await page.evaluate(() => rechargerCacheVerif());
    await attendre();
    P.SESSION_SECRET = "encore-change";
    await saisir("EF3", "MARTIN");
    assert.ok(await vis("#ecranConnexion"));
    assert.match(await txt("#msgConnexion"), /La saisie sera envoyée ensuite/);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2, "pas encore écrite");
    await connecter("Caisse centrale 1", "motdepasse1");
    await attendre(300);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 3, "écrite après la reconnexion");
    assert.strictEqual(env.sheets.Saisies.getRange(3, 2).getValue(), "MARTIN");

    // --- Code à part choisi à l'installation ---
    env.activeEmail = "editeur@example.com";
    env.ctx.reinitialiserComptesPanneau();
    env.activeEmail = "";
    await page.evaluate(() => {
      oublierSession();
      afficherEcranConnexion();
    });
    await attendre();
    assert.strictEqual(await txt("#titreConnexion"), "Première installation");
    await page.fill("#activationConnexion", env.activation());
    await page.fill("#identifiant", "Caisse centrale 1");
    await page.fill("#motDePasse", "motdepasse1");
    await page.fill("#motDePasse2", "motdepasse1");
    await page.click("#btnConnexion");
    await attendre();
    await page.click("#btnCodeAPartOui");
    assert.ok(await vis("#pinAPart"));
    await page.fill("#pinAPart", "135790");
    await page.fill("#pinAPart2", "135791");
    await page.click("#btnCodeAPartOui");
    assert.match(await txt("#msgCodeAPart"), /ne correspondent pas/);
    await page.fill("#pinAPart2", "135790");
    await page.click("#btnCodeAPartOui");
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")));
    assert.ok(P.ADMIN_PIN_HASH, "code créé (sans code d'activation : compte connecté)");
    await page.click('button[title="Panneau de contrôle"]');
    await attendre(300);
    assert.ok((await vis("#zoneVerrou")) && !(await vis("#zoneAdmin")), "le code est demandé");
    assert.match(await txt("#txtVerrou"), /Saisissez le code responsable/);
    assert.match(await txt("#compteVerrou"), /Connecté : Caisse centrale 1/);
    await page.fill("#pinSaisi", "135790");
    await page.press("#pinSaisi", "Enter");
    await attendre(300);
    assert.ok(await vis("#zoneAdmin"));
    assert.ok(await vis("#btnVerrouiller"), "« Verrouiller » avec un code à part");

    // --- Code & comptes ---
    await page.click('[data-ecran-lien="code"]');
    await attendre();
    const lignes = () => page.$$eval("#listeComptes .ligne-compte b", (x) => x.map((b) => b.textContent));
    assert.deepStrictEqual(await lignes(), ["Caisse centrale 1 (vous)"]);
    assert.strictEqual(
      await page.$$eval("#listeComptes .danger", (x) => x.length),
      0,
      "dernier compte : pas de retrait"
    );
    assert.match(await txt("#etatCodeAPart"), /protégé par un code/);
    assert.ok(await vis("#btnRetirerCode"));
    // créer un compte
    await page.fill("#nouveauCompteId", "Caisse centrale 2");
    await page.fill("#nouveauCompteMdp", "motdepasse2");
    await page.fill("#nouveauCompteMdp2", "autre-chose");
    await page.click("#formNouveauCompte button");
    assert.match(await txt("#msgNouveauCompte"), /ne correspondent pas/);
    await page.fill("#nouveauCompteMdp2", "motdepasse2");
    const envoisAvant = envois.length;
    await page.click("#formNouveauCompte button");
    await attendre(300);
    assert.match(await txt("#msgNouveauCompte"), /« Caisse centrale 2 » créé/);
    assert.strictEqual(envois.length, envoisAvant, "pas retenu par le navigateur de CET appareil");
    assert.deepStrictEqual(await lignes(), ["Caisse centrale 1 (vous)", "Caisse centrale 2"]);
    assert.ok(J(env.ctx.connexion("Caisse centrale 2", "motdepasse2")).ok);
    // mot de passe d'un autre compte
    const blocs = await page.$$("#listeComptes > div");
    await (await blocs[1].$("button:text('Mot de passe')")).click();
    const f2 = await blocs[1].$("form.mdp-compte");
    const [n1, n2] = await f2.$$("input[type=password]");
    await n1.fill("nouveau-mdp2");
    await n2.fill("nouveau-mdp2");
    await (await f2.$("button[type=submit]")).click();
    await attendre(300);
    assert.match(
      await f2.textContent(),
      /Mot de passe de « Caisse centrale 2 » changé\. Ses connexions ouvertes sont terminées/
    );
    assert.strictEqual(envois.length, envoisAvant, "autre compte : pas d'envoi au navigateur");
    assert.ok(J(env.ctx.connexion("Caisse centrale 2", "nouveau-mdp2")).ok);
    // son propre mot de passe : envoi réel (le navigateur met à jour) et nouvelle session
    const sessionAvant = await stock("cdSession");
    await (await blocs[0].$("button:text('Mot de passe')")).click();
    const f1 = await blocs[0].$("form.mdp-compte");
    const [m1, m2] = await f1.$$("input[type=password]");
    await m1.fill("nouveau-mdp1");
    await m2.fill("nouveau-mdp1");
    await (await f1.$("button[type=submit]")).click();
    await attendre(300);
    assert.ok(envois.length > envoisAvant && /username=Caisse\+centrale\+1/.test(envois[envois.length - 1]));
    assert.notStrictEqual(await stock("cdSession"), sessionAvant, "nouvelle session gardée");
    await page.evaluate(() => rechargerCacheVerif());
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")), "toujours connecté");
    // ne plus demander de code, puis en remettre un
    await page.click("#btnRetirerCode");
    assert.ok(P.ADMIN_PIN_HASH, "rien au premier appui");
    await page.click("#btnRetirerCode");
    await attendre();
    assert.ok(!P.ADMIN_PIN_HASH);
    assert.ok(!(await vis("#btnVerrouiller")) && !(await vis("#btnRetirerCode")));
    assert.match(await txt("#etatCodeAPart"), /Pas de code à part/);
    assert.strictEqual(await txt("#btnEnregistrerPin"), "Protéger par ce code");
    await page.fill("#pinNouveau", "246802");
    await page.fill("#pinNouveau2", "246802");
    await page.click("#btnEnregistrerPin");
    await attendre();
    assert.ok(P.ADMIN_PIN_HASH, "code recréé par le compte connecté");
    assert.match(await txt("#msgPin"), /Code enregistré/);
    assert.ok(await vis("#btnVerrouiller"));
    // retirer l'autre compte (second appui)
    const bRetirer = await (await page.$$("#listeComptes > div"))[1].$(".danger");
    await bRetirer.click();
    await bRetirer.click();
    await attendre(300);
    assert.deepStrictEqual(await lignes(), ["Caisse centrale 1 (vous)"]);
    assert.match(J(env.ctx.connexion("Caisse centrale 2", "nouveau-mdp2")).message, /Identifiant inconnu/);

    // --- 1re installation sur un Sheet qui a DÉJÀ un code responsable (ex. Vannes) ---
    const installerAvecAncienCode = async () => {
      env.activeEmail = "editeur@example.com";
      env.ctx.reinitialiserComptesPanneau();
      assert.ok(J(env.ctx.definirPin("111111", null, null)).ok, "code d'avant (panneau du Sheet)");
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
      assert.match(await txt("#txtCodeAPart"), /Un code responsable existe déjà/);
      assert.ok(await vis("#btnCodeAPartGarder"));
      assert.strictEqual(await txt("#btnCodeAPartOui"), "Choisir un autre code");
      assert.strictEqual(await txt("#btnCodeAPartNon"), "Ne plus demander de code");
      return await stock("cdSession");
    };
    const ouvreAvec = (pin, s) => J(env.ctx.ouvrirSessionAdmin(pin, s)).ok;
    // garder
    let s = await installerAvecAncienCode();
    await page.click("#btnCodeAPartGarder");
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")));
    assert.ok(ouvreAvec("111111", s), "code d'avant gardé");
    // en choisir un autre, sans connaître l'ancien (le code d'activation en tient lieu)
    s = await installerAvecAncienCode();
    await page.click("#btnCodeAPartOui");
    await page.fill("#pinAPart", "222222");
    await page.fill("#pinAPart2", "222222");
    await page.click("#btnCodeAPartOui");
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")));
    for (const k in P) if (k.indexOf("PIN_ESSAIS_") === 0) delete P[k];
    assert.ok(!ouvreAvec("111111", s), "ancien code remplacé");
    for (const k in P) if (k.indexOf("PIN_ESSAIS_") === 0) delete P[k];
    assert.ok(ouvreAvec("222222", s), "nouveau code");
    // ne plus en demander
    s = await installerAvecAncienCode();
    await page.click("#btnCodeAPartNon");
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")));
    assert.ok(!P.ADMIN_PIN_HASH, "code d'avant retiré");
    assert.ok(ouvreAvec("", s), "l'espace s'ouvre sans code");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_connexion : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
