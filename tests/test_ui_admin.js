const assert = require("assert");
const { ouvrir } = require("./navigateur");
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const vis = async (sel) => page.isVisible(sel);
  const txt = async (sel) => (await page.textContent(sel)).trim();
  try {
    assert.strictEqual(await txt("#txtNomOffre"), "Gestion Chèques Reportés");
    assert.ok(await vis("#formulaireSaisie"), "formulaire visible (dates OK)");
    // ⚙️ sans code (obligatoire) : le choisir d'abord — sans choix par défaut — puis
    // l'espace s'ouvre aussitôt
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(200);
    assert.ok(!(await vis("#zoneAdmin")), "pas d'espace sans code");
    assert.ok(await vis("#blocCodeAPart"));
    assert.strictEqual(await txt("#titreConnexion"), "Code responsable");
    assert.match(await txt("#txtCodeAPart"), /obligatoire/);
    assert.ok(
      (await vis("#btnCodeAPartOui")) && (await vis("#btnCodeAPartPerso")) && !(await vis("#champsCodeAPart"))
    );
    await page.click("#btnCodeAPartOui");
    await page.fill("#pinAPart", "258025");
    await page.fill("#pinAPart2", "258025");
    await page.click("#btnCodeAPartOui");
    await page.waitForTimeout(200);
    assert.ok(!(await vis("#ecranConnexion")) && (await vis("#zoneAdmin")), "code choisi : espace ouvert");
    assert.ok(env.props._store.ADMIN_PIN_HASH);
    assert.match(await txt("#adminSous"), /Déverrouillé/);
    assert.ok(await vis("#btnVerrouiller"));
    // Fermer : le code est désormais demandé ; impression de la journée seulement hors espace
    await page.click("#modalParametres .btn-close-modal");
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(150);
    assert.ok((await vis("#zoneVerrou")) && !(await vis("#zoneAdmin")));
    assert.ok(
      !(await vis(".btn-print-jour")),
      "code demandé : aucune impression sous le code (journal seulement)"
    );
    // … et le serveur refuse l'offre entière / un jour passé sans l'espace responsable
    assert.throws(() => env.ctx.genererDonneesImpression("offre", "", env.session, null), /ADMIN_REQUIS/);
    assert.throws(
      () => env.ctx.genererDonneesImpression("jour", "2000-01-01", env.session, null),
      /ADMIN_REQUIS/
    );
    assert.ok(Array.isArray(env.ctx.genererDonneesImpression("jour", "aujourdhui", env.session, null)));
    assert.match(await txt("#txtVerrou"), /Saisissez le code responsable/);
    assert.match(await txt("#compteVerrou"), /Connecté : Caisse test/);
    await page.fill("#pinSaisi", "2580");
    await page.click("#btnDeverrouiller");
    assert.match(await txt("#msgVerrou"), /6 chiffres/);
    await page.fill("#pinSaisi", "258025");
    await page.click("#btnDeverrouiller");
    await page.waitForTimeout(150);
    assert.ok((await vis("#zoneAdmin")) && !(await vis("#zoneVerrou")), "zone admin ouverte");
    // Déverrouillé : menu de gauche + vue d'ensemble chiffrée (calculée par le serveur)
    assert.ok(await vis("#railAdmin"), "menu visible");
    assert.strictEqual(await page.getAttribute('[data-ecran-lien="ensemble"]', "aria-current"), "true");
    assert.ok(!(await vis(".btn-print-jour")), "impression : dans son propre écran");
    assert.strictEqual(await txt("#kpiSaisies"), "0");
    assert.strictEqual(await txt("#kpiResponsables"), "commun"); // code commun
    assert.match(await txt("#resumeOperation"), /^Du \d\d\/\d\d au \d\d\/\d\d$/);
    assert.match(await txt("#noteOffre"), /^Jour \d sur 3 · clôture automatique dans la nuit du/);
    assert.ok(!(await page.isVisible("text=OUVRIR GOOGLE SHEETS")));
    assert.strictEqual(await txt("#txtModeAdmin"), "Mode Signaler", "vue d'ensemble : mode affiché");
    assert.ok(
      !(await vis("#segmentMode")) && !(await vis("#modalDateFin")),
      "vue d'ensemble : rien à modifier"
    );
    // Sécurité (« Modifier → » du mode) : appui sur le mode déjà actif = rien ; sur l'autre = bascule
    await page.click('[data-ecran="ensemble"] .boite:has-text("Mode de sécurité") .lien-modifier');
    assert.strictEqual(await page.getAttribute('[data-ecran-lien="securite"]', "aria-current"), "true");
    assert.strictEqual(await page.getAttribute("#modeSignaler", "aria-pressed"), "true");
    await page.click("#modeSignaler");
    await page.waitForTimeout(100);
    assert.strictEqual(env.sheets.Saisies.getRange("Z1").getValue(), "SIGNALER");
    await page.click("#modeBloquant");
    await page.waitForTimeout(100);
    assert.strictEqual(env.sheets.Saisies.getRange("Z1").getValue(), "BLOQUANT");
    assert.strictEqual(await page.getAttribute("#modeBloquant", "aria-pressed"), "true");
    assert.strictEqual(await txt("#txtMode"), "Mode Bloquant", "puce de l'en-tête à jour");
    assert.strictEqual(await txt("#txtModeAdmin"), "Mode Bloquant", "vue d'ensemble à jour");
    // Opération (menu) : dates -> résumé de l'offre
    await page.click('[data-ecran-lien="operation"]');
    assert.strictEqual(await page.inputValue("#modalDateFin"), env.props._store.DATE_FIN);
    await page.fill("#modalDateFin", "2099-12-31");
    await page.click("#modalParametres >> text=Mettre à jour les dates");
    await page.waitForTimeout(150);
    assert.strictEqual(env.props._store.DATE_FIN, "2099-12-31");
    assert.match(await txt("#resumeOperation"), /31\/12$/);
    // Clôture : confirmation dans la page, « Annuler » ne fait rien
    await page.click("#modalParametres >> text=Clôturer maintenant");
    assert.ok(await vis("#confirmerCloture"));
    await page.click("#confirmerCloture >> text=Annuler");
    assert.ok(!(await vis("#confirmerCloture")));
    // Impression (menu de l'espace) : jour, offre entière, jour précédent
    await page.click('[data-ecran-lien="impression"]');
    assert.ok((await vis(".btn-print-jour")) && !(await vis('[data-ecran="ensemble"]')));
    await page.click('[data-ecran="impression"] [data-args*="offre"]');
    await page.waitForTimeout(150);
    assert.match(
      await page.textContent("#toast"),
      /Rien à imprimer/,
      "offre entière : acceptée par le serveur"
    );
    // Réglages -> appliqués à l'écran
    await page.click('[data-ecran-lien="reglages"]');
    assert.strictEqual(await page.inputValue("#cfg_NOM_STRUCTURE"), "l'Hypermarché Carrefour Vannes");
    await page.fill("#cfg_NOM_OFFRE", "Bons cadeaux");
    await page.fill("#cfg_LIBELLE_MONTANT", "Valeur");
    await page.uncheck("#cfg_MONTANT_OBLIGATOIRE");
    await page.click("#modalParametres >> text=Enregistrer les réglages");
    await page.waitForTimeout(100);
    assert.strictEqual(await txt("#txtNomOffre"), "Bons cadeaux");
    assert.strictEqual(await txt("#lblMontant"), "Valeur (€)");
    assert.strictEqual(env.props._store.CFG_MONTANT_OBLIGATOIRE, "NON");
    // Fermer (depuis une vue) -> reverrouille ; rouvre sur le code + impression ; mauvais code ; bon code
    await page.click("#modalParametres .btn-close-modal");
    await page.waitForTimeout(100);
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(100);
    assert.ok(!(await page.isVisible(".btn-print-jour")), "réouverture : pas d'impression sous le code");
    assert.ok(!(await vis("#railAdmin")), "verrouillé : pas de menu");
    assert.ok(await vis("#zoneVerrou"));
    assert.strictEqual(await txt("#btnDeverrouiller"), "Déverrouiller");
    await page.fill("#pinSaisi", "111111");
    await page.press("#pinSaisi", "Enter");
    await page.waitForTimeout(100);
    assert.match(await txt("#msgVerrou"), /Code faux/);
    for (const k in env.props._store) if (k.indexOf("PIN_ESSAIS_") === 0) delete env.props._store[k]; // on saute la pause de 10 s
    await page.evaluate(() => pauseBouton(document.getElementById("btnDeverrouiller"), 1)); // et la roue de la page
    await page.waitForSelector("#btnDeverrouiller:not([disabled])");
    await page.fill("#pinSaisi", "258025");
    await page.press("#pinSaisi", "Enter");
    await page.waitForTimeout(150);
    assert.ok(await vis("#zoneAdmin"));
    // Session expirée côté serveur -> retour au code avec message
    for (const k in env.cacheStore) delete env.cacheStore[k];
    await page.click('[data-ecran-lien="securite"]');
    await page.click("#modeSignaler");
    await page.waitForTimeout(200);
    assert.ok(!(await page.isVisible("#zoneAdmin")), "session expirée : retour au code");
    assert.ok(await vis("#zoneVerrou"));
    assert.match(await txt("#msgVerrou"), /expirée/);
    // Saisie toujours libre, montant désormais facultatif
    await page.click("#modalParametres .btn-close-modal");
    await page.fill("#piece", "AB 12-34");
    await page.fill("#nom", "test");
    await page.fill("#prenom", "un");
    await page.click("#btnValider");
    await page.waitForTimeout(200);
    const lignes = env.sheets.Saisies.getDataRange().getValues();
    assert.strictEqual(lignes.length, 2);
    assert.strictEqual(lignes[1][1], "TEST");
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_admin : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
