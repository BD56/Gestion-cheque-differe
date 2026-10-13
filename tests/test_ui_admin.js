const assert = require('assert');
const { ouvrir } = require('./navigateur');
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const vis = async sel => page.isVisible(sel);
  const txt = async sel => (await page.textContent(sel)).trim();
  try {
    assert.strictEqual(await txt('#txtNomOffre'), 'Gestion Chèques Reportés');
    assert.ok(await vis('#formulaireSaisie'), 'formulaire visible (dates OK)');
    // ⚙️ : impression libre, espace responsable verrouillé, création du code
    await page.click('button[title="Panneau de contrôle"]');
    await page.waitForTimeout(100);
    assert.ok(await vis('.btn-print-jour') && await vis('#zoneVerrou') && !(await vis('#zoneAdmin')));
    assert.match(await txt('#txtVerrou'), /Aucun code/);
    assert.ok(await vis('#pinConfirme') && await vis('#activationVerrou'), 'code d\'activation demandé');
    await page.fill('#pinSaisi', '258025'); await page.fill('#pinConfirme', '258026'); await page.click('#btnDeverrouiller');
    assert.match(await txt('#msgVerrou'), /correspondent pas/);
    await page.fill('#pinSaisi', '258025'); await page.fill('#pinConfirme', '258025'); await page.click('#btnDeverrouiller');
    assert.match(await txt('#msgVerrou'), /code d'activation/, 'sans code d\'activation : refusé');
    await page.fill('#activationVerrou', '0000-0000'); await page.click('#btnDeverrouiller'); await page.waitForTimeout(150);
    assert.match(await txt('#msgVerrou'), /activation requis/, 'aucun code d\'activation généré dans le Sheet');
    const act = env.activation(); // le responsable l'obtient dans le Google Sheets
    await page.fill('#pinSaisi', '258025'); await page.fill('#pinConfirme', '258025');
    await page.fill('#activationVerrou', '0000-0000'); await page.click('#btnDeverrouiller'); await page.waitForTimeout(150);
    assert.match(await txt('#msgVerrou'), /incorrect/);
    assert.strictEqual(env.ctx.etatAdmin().pinDefini, false);
    await page.fill('#activationVerrou', act);
    await page.fill('#pinSaisi', '258025'); await page.fill('#pinConfirme', '258025'); await page.click('#btnDeverrouiller');
    await page.waitForTimeout(150);
    assert.ok(await vis('#zoneAdmin') && !(await vis('#zoneVerrou')), 'zone admin ouverte');
    // Accueil déverrouillé : 6 tuiles + résumés, pas de bouton Google Sheets
    assert.strictEqual(await page.$$eval('#zoneAdmin .tuile', x => x.length), 6);
    assert.strictEqual(await txt('#resumeSecurite'), 'SIGNALER');
    assert.match(await txt('#resumeOperation'), /→/);
    assert.ok(!(await page.isVisible('text=OUVRIR GOOGLE SHEETS')));
    await page.click('#modalParametres .tuile:has-text("Sécurité")');
    assert.ok(!(await page.isVisible('.btn-print-jour')), 'sous-écran : accueil masqué');
    assert.match(await txt('#btnMode'), /SIGNALER/);
    assert.strictEqual(await page.inputValue('#modalDateFin'), env.props._store.DATE_FIN);
    // Mode
    await page.click('#btnMode'); await page.waitForTimeout(100);
    assert.match(await txt('#btnMode'), /BLOQUANT/);
    assert.strictEqual(env.sheets.Saisies.getRange('Z1').getValue(), 'BLOQUANT');
    assert.strictEqual(await txt('#resumeSecurite'), 'BLOQUANT');
    await page.click('[data-ecran="securite"] .retour');
    assert.ok(await page.isVisible('.btn-print-jour') && await page.isVisible('#zoneAdmin .tuiles'));
    // Opération : dates -> résumé de la tuile
    await page.click('#modalParametres .tuile:has-text("Opération")');
    await page.fill('#modalDateFin', '2099-12-31'); await page.click('text=METTRE À JOUR LES DATES'); await page.waitForTimeout(150);
    assert.strictEqual(env.props._store.DATE_FIN, '2099-12-31');
    await page.click('[data-ecran="operation"] .retour');
    assert.match(await txt('#resumeOperation'), /31\/12$/);
    // Réglages -> appliqués à l'écran
    await page.click('#modalParametres .tuile:has-text("Réglages")');
    assert.strictEqual(await page.inputValue('#cfg_NOM_STRUCTURE'), "l'Hypermarché Carrefour Vannes");
    await page.fill('#cfg_NOM_OFFRE', 'Bons cadeaux'); await page.fill('#cfg_LIBELLE_MONTANT', 'Valeur');
    await page.uncheck('#cfg_MONTANT_OBLIGATOIRE');
    await page.click('text=ENREGISTRER LES RÉGLAGES'); await page.waitForTimeout(100);
    assert.strictEqual(await txt('#txtNomOffre'), 'Bons cadeaux');
    assert.strictEqual(await txt('#lblMontant'), 'Valeur (€)');
    assert.strictEqual(env.props._store.CFG_MONTANT_OBLIGATOIRE, 'NON');
    // Fermer (depuis un sous-écran) -> reverrouille et rouvre sur l'accueil ; mauvais code ; bon code
    await page.click('#modalParametres .btn-close-modal'); await page.waitForTimeout(100);
    await page.click('button[title="Panneau de contrôle"]'); await page.waitForTimeout(100);
    assert.ok(await page.isVisible('.btn-print-jour'), 'réouverture sur l\'accueil');
    assert.ok(await vis('#zoneVerrou') && !(await vis('#pinConfirme')));
    assert.strictEqual(await txt('#btnDeverrouiller'), 'DÉVERROUILLER');
    await page.fill('#pinSaisi', '111111'); await page.press('#pinSaisi', 'Enter'); await page.waitForTimeout(100);
    assert.match(await txt('#msgVerrou'), /Code faux/);
    for (const k in env.props._store) if (k.indexOf('PIN_ESSAIS_') === 0) delete env.props._store[k]; // on saute la pause de 10 s
    await page.fill('#pinSaisi', '258025'); await page.press('#pinSaisi', 'Enter'); await page.waitForTimeout(150);
    assert.ok(await vis('#zoneAdmin'));
    // Session expirée côté serveur -> retour au verrou avec message
    for (const k in env.cacheStore) delete env.cacheStore[k];
    await page.click('#modalParametres .tuile:has-text("Sécurité")');
    await page.click('#btnMode'); await page.waitForTimeout(200);
    assert.ok(await page.isVisible('.btn-print-jour'), 'session expirée : retour à l\'accueil');
    assert.ok(await vis('#zoneVerrou'));
    assert.match(await txt('#msgVerrou'), /expirée/);
    // Saisie toujours libre, montant désormais facultatif
    await page.click('#modalParametres .btn-close-modal');
    await page.fill('#piece', 'AB 12-34'); await page.fill('#nom', 'test'); await page.fill('#prenom', 'un');
    await page.click('#btnValider'); await page.waitForTimeout(200);
    const lignes = env.sheets.Saisies.getDataRange().getValues();
    assert.strictEqual(lignes.length, 2); assert.strictEqual(lignes[1][1], 'TEST');
    assert.deepStrictEqual(erreursPage, []);
    console.log('test_ui_admin : OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
