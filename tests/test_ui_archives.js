const assert = require('assert');
const { ouvrir } = require('./navigateur');
const { FakeSheet } = require('./fakesheet');
(async () => {
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  try {
    const t = new Date('2026-03-02T10:00:00Z');
    env.sheets['Archives_01-03-2026_23-05'] = new FakeSheet('Archives_01-03-2026_23-05', [['Date','Nom','Prénom','N° Pièce','Montant','CODE '], [t,'TEST','A','P1','10,00 €',''], [t,'TEST','B','P2','5,50 €','x']]);
    env.sheets['Archives_15-09-2026_23-05'] = new FakeSheet('Archives_15-09-2026_23-05', [['Date','Nom','Prénom','N° Pièce','Montant','CODE '], [t,'TEST','C','P3','1,00 €','']]);
    env.sheets['Autre'] = new FakeSheet('Autre', [['x']]);
    // Accès direct sans jeton refusé
    assert.throws(() => env.ctx.listerArchives(null), /ADMIN_REQUIS/);
    assert.throws(() => env.ctx.donneesArchive('Archives_01-03-2026_23-05', null), /ADMIN_REQUIS/);
    const j = env.ctx.definirPin('258025', null).jeton;
    assert.throws(() => env.ctx.donneesArchive('Saisies', j), /inconnue/); // pas d'accès à d'autres onglets
    await page.click('button[title="Panneau de contrôle"]'); await page.waitForTimeout(100);
    await page.fill('#pinSaisi', '258025'); await page.press('#pinSaisi', 'Enter'); await page.waitForTimeout(150);
    await page.click('#modalParametres .tuile:has-text("Archives")'); await page.waitForTimeout(150);
    const options = await page.$$eval('#selArchive option', os => os.map(o => o.textContent));
    assert.deepStrictEqual(options, ['Clôturée le 15/09/2026 à 23h05 — 1 ligne(s)', 'Clôturée le 01/03/2026 à 23h05 — 2 ligne(s)']);
    await page.selectOption('#selArchive', 'Archives_01-03-2026_23-05');
    await page.click('text=IMPRIMER CETTE ARCHIVE'); await page.waitForTimeout(150);
    const imp = await page.evaluate(() => window.__imprime);
    assert.ok(imp.includes('Archive — Clôturée le 01/03/2026 à 23h05'));
    assert.ok(imp.includes('<th>Notes ou Infos</th>') && imp.includes('15,50 €'), 'en-tête + TOTAL');
    assert.ok(!(await page.isVisible('#modalParametres')), 'panneau fermé (et reverrouillé) après impression');
    // Impression libre du jour (sans code) : aucune saisie aujourd'hui -> alerte
    await page.click('button[title="Panneau de contrôle"]'); await page.waitForTimeout(100);
    await page.click('.btn-print-jour'); await page.waitForTimeout(150);
    assert.deepStrictEqual(await page.evaluate(() => window.__alertes), ['Aucune donnée trouvée.']);
    assert.deepStrictEqual(erreursPage, []);
    console.log('test_ui_archives : OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
