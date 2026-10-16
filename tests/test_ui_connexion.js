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
    // code responsable OBLIGATOIRE : ni « pas de code », ni « plus tard » à l'installation
    assert.strictEqual(await page.$("#btnCodeAPartNon"), null);
    assert.ok(!(await vis("#btnCodeAPartPlusTard")));
    assert.ok(
      (await vis("#btnCodeAPartOui")) && (await vis("#btnCodeAPartPerso")),
      "deux choix, aucun par défaut"
    );
    await page.click("#btnCodeAPartOui");
    await page.fill("#pinAPart", "135790");
    await page.fill("#pinAPart2", "135790");
    await page.click("#btnCodeAPartOui");
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

    // --- ⚙️ : le code choisi à l'installation est demandé ---
    await page.click('button[title="Panneau de contrôle"]');
    await attendre(300);
    assert.ok((await vis("#zoneVerrou")) && !(await vis("#zoneAdmin")));
    await page.fill("#pinSaisi", "135790");
    await page.press("#pinSaisi", "Enter");
    await attendre(300);
    assert.ok(await vis("#zoneAdmin"));
    assert.ok((await vis("#btnVerrouiller")) && (await vis("#btnDeconnexionRail")));
    assert.match(await txt("#adminSous"), /Déverrouillé/);
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
    // … une saisie validée après la fin de session n'est JAMAIS envoyée sans accord :
    // elle est proposée à la personne qui se reconnecte
    const saisieApresFin = async (piece, nom) => {
      await page.fill("#piece", "");
      await page.fill("#nom", "");
      await page.evaluate(() => rechargerCacheVerif());
      await attendre();
      P.SESSION_SECRET = "change-" + piece;
      await saisir(piece, nom);
      assert.ok(await vis("#ecranConnexion"));
      assert.match(await txt("#msgConnexion"), /Une saisie en attente vous sera proposée ensuite/);
      await connecter("Caisse centrale 1", "motdepasse1");
      assert.ok(await vis("#blocARenvoyer"), "proposée, pas envoyée");
      assert.strictEqual(await txt("#titreConnexion"), "Saisies en attente");
      assert.match(await txt("#listeARenvoyer"), new RegExp(nom + " J\\. · " + piece));
    };
    await saisieApresFin("EF3", "MARTIN");
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2, "pas encore écrite");
    await page.click("#btnARenvoyerOui");
    await attendre(300);
    assert.ok(!(await vis("#ecranConnexion")));
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 3, "écrite avec l'accord de la personne connectée");
    assert.strictEqual(env.sheets.Saisies.getRange(3, 2).getValue(), "MARTIN");
    // refus (second appui) : abandonnée
    await saisieApresFin("GH4", "PETIT");
    await page.click("#btnARenvoyerNon");
    assert.ok(await vis("#blocARenvoyer"), "rien au premier appui");
    await page.click("#btnARenvoyerNon");
    await attendre(300);
    assert.ok(!(await vis("#ecranConnexion")));
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 3, "non enregistrée");
    assert.strictEqual(await page.evaluate(() => saisiesARenvoyer.length), 0);

    // --- Vérification toutes les 5 min : déconnexion visible sans action ---
    assert.strictEqual(await page.evaluate(() => VERIF_SESSION_MS), 300000);
    await page.evaluate(() => verifierSessionPeriodique());
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")), "session valable : rien ne change");
    P.SESSION_SECRET = "periodique";
    await page.evaluate(() => verifierSessionPeriodique());
    await attendre();
    assert.ok(await vis("#ecranConnexion"), "session tombée : écran de connexion");
    await connecter("Caisse centrale 1", "motdepasse1");

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

    // --- Code & compte : UN seul compte (plus de création, plus de « pas de code ») ---
    await page.click('[data-ecran-lien="code"]');
    await attendre();
    const lignes = () => page.$$eval("#listeComptes .ligne-compte b", (x) => x.map((b) => b.textContent));
    assert.deepStrictEqual(await lignes(), ["Caisse centrale 1 (vous)"]);
    assert.strictEqual(
      await page.$$eval("#listeComptes .danger", (x) => x.length),
      0,
      "le compte ne se retire pas"
    );
    assert.match(await txt("#msgComptes"), /^Le même compte sur tous les appareils/);
    assert.strictEqual(await page.$("#formNouveauCompte"), null, "pas de création de compte");
    assert.strictEqual(await page.$("#btnRetirerCode"), null, "pas de « Ne plus demander de code »");
    assert.match(await txt("#etatCodeAPart"), /protégé par un code/);
    // son mot de passe : envoi réel (le navigateur met à jour) et nouvelle session ; les
    // autres appareils sont déconnectés
    const envoisAvant = envois.length;
    const sessionAvant = await stock("cdSession");
    const blocs = await page.$$("#listeComptes > div");
    await (await blocs[0].$("button:text('Mot de passe')")).click();
    const f1 = await blocs[0].$("form.mdp-compte");
    const [m1, m2] = await f1.$$("input[type=password]");
    await m1.fill("nouveau-mdp1");
    await m2.fill("nouveau-mdp1");
    await (await f1.$("button[type=submit]")).click();
    await attendre(300);
    assert.match(await f1.textContent(), /Les autres appareils sont déconnectés/);
    assert.ok(envois.length > envoisAvant && /username=Caisse\+centrale\+1/.test(envois[envois.length - 1]));
    assert.notStrictEqual(await stock("cdSession"), sessionAvant, "nouvelle session gardée");
    assert.throws(
      () => env.ctx.chargerCacheVerif(sessionAvant),
      /CONNEXION_REQUISE/,
      "ancienne session tombée"
    );
    await page.evaluate(() => rechargerCacheVerif());
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")), "toujours connecté");
    // Sheet d'une version précédente : plusieurs comptes, à réduire (second appui)
    P.COMPTES = JSON.stringify(
      env.ctx.lireComptes_().concat([env.ctx.nouveauCompte_("Caisse centrale 2", "motdepasse2")])
    );
    await page.click('[data-ecran-lien="ensemble"]');
    await page.click('[data-ecran-lien="code"]');
    await attendre(300);
    assert.deepStrictEqual(await lignes(), ["Caisse centrale 1 (vous)", "Caisse centrale 2"]);
    assert.match(await txt("#msgComptes"), /^2 comptes \(version précédente\)/);
    const bRetirer = await (await page.$$("#listeComptes > div"))[1].$(".danger");
    await bRetirer.click();
    await bRetirer.click();
    await attendre(300);
    assert.deepStrictEqual(await lignes(), ["Caisse centrale 1 (vous)"]);
    assert.match(J(env.ctx.connexion("Caisse centrale 2", "motdepasse2")).message, /Identifiant inconnu/);

    // --- 1re installation sur un Sheet qui a DÉJÀ un code responsable ---
    // On le dit seulement : le code d'activation ne permet PAS de le remplacer.
    env.activeEmail = "editeur@example.com";
    env.ctx.reinitialiserComptesPanneau();
    assert.ok(J(env.ctx.definirPin("111111")).ok, "code d'avant (panneau du Sheet)");
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
    assert.match(
      await txt("#txtCodeAPart"),
      /Un code responsable existe déjà[\s\S]*panneau ⚙️ du Google Sheets/
    );
    assert.ok(
      !(await vis("#btnCodeAPartOui")) && !(await vis("#btnCodeAPartPerso")),
      "ni changer ni retirer ici"
    );
    await page.click("#btnCodeAPartGarder");
    await attendre();
    assert.ok(!(await vis("#ecranConnexion")));
    for (const k in P) if (k.indexOf("PIN_ESSAIS_") === 0) delete P[k];
    assert.ok(J(env.ctx.ouvrirSessionAdmin("111111", await stock("cdSession"))).ok, "code d'avant gardé");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_connexion : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
