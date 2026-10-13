// Lot 2 (audit) côté tablette : champs « vides », double appui, dates en cours de
// modification, bouton de mode après une erreur, alerte de correction périmée.
const assert = require('assert');
const { ouvrir } = require('./navigateur');
(async () => {
  const o = await ouvrir(process.argv[2]);
  const { env, page } = o;
  try {
    // Champs remplis d'espaces / de tirets : refusés AVANT le ✅ (rien n'est envoyé)
    await page.fill('#piece', ' - - '); await page.fill('#nom', 'DUPONT'); await page.fill('#prenom', 'JEAN'); await page.fill('#montant', '10');
    await page.click('#btnValider'); await page.waitForTimeout(150);
    assert.match(await page.textContent('#statusMessage'), /Veuillez remplir/);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 1);
    // Double appui sur VALIDER : le 2e (formulaire vidé) ne remplace pas le bandeau vert
    await page.fill('#piece', 'AB1');
    await page.evaluate(() => { const b = document.getElementById('btnValider'); b.click(); b.click(); });
    assert.match(await page.textContent('#statusMessage'), /enregistrée/);
    await page.waitForTimeout(250);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2);

    // Espace responsable : dates en cours de modification protégées du rafraîchissement
    const jeton = env.creerCode('258025').jeton;
    await page.evaluate(j => { jetonAdmin = j; }, jeton);
    await page.click('button[title="Panneau de contrôle"]'); await page.waitForTimeout(200);
    await page.click('#modalParametres .tuile:has-text("Opération")'); await page.waitForTimeout(100);
    await page.fill('#modalDateFin', '2099-06-30');
    await page.evaluate(() => chargerDatesAffichage()); await page.waitForTimeout(150);
    assert.strictEqual(await page.inputValue('#modalDateFin'), '2099-06-30', 'saisie en cours non écrasée');

    // Bouton de mode : erreur serveur -> libellé rétabli (plus bloqué sur « ⏳ MAJ... »)
    await page.click('#modalParametres .retour >> nth=0').catch(() => {});
    await page.evaluate(() => allerEcran('securite')); await page.waitForTimeout(50);
    const avant = await page.textContent('#btnMode');
    const vrai = env.ctx.basculerModeWebApp;
    env.ctx.basculerModeWebApp = () => { throw new Error('panne'); };
    await page.evaluate(() => { window.alert = function () {}; changerMode(); changerMode(); });
    await page.waitForTimeout(200);
    assert.strictEqual(await page.textContent('#btnMode'), avant, 'libellé rétabli après l\'erreur');
    env.ctx.basculerModeWebApp = vrai;
    await page.evaluate(() => { changerMode(); changerMode(); }); await page.waitForTimeout(200);
    assert.strictEqual(env.sheets.Saisies.getRange('Z1').getValue(), 'BLOQUANT', 'un double appui ne rebascule pas');

    // Correction : modifier un champ après une alerte la masque (FORCER ne vaut plus)
    await page.evaluate(() => { document.getElementById('corAlerte').style.display = 'block'; });
    await page.evaluate(() => { const i = document.getElementById('corNom'); i.value = 'X'; i.dispatchEvent(new Event('input')); });
    assert.strictEqual(await page.evaluate(() => document.getElementById('corAlerte').style.display), 'none');
    assert.deepStrictEqual(o.erreursPage, []);
    console.log('test_ui_lot2 : OK');
  } finally { await o.browser.close(); }
})().catch(e => { console.log('test_ui_lot2 : ÉCHEC ' + (e && e.stack || e)); process.exit(1); });
