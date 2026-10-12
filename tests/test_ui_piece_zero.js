const assert = require('assert');
const { ouvrir } = require('./navigateur');
const { FakeSheet } = require('./fakesheet');
(async () => {
  const sheets = { Saisies: new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos',''], [new Date(),'DUPONT','JEAN',12345678901,'10 €','']]) };
  sheets.Saisies.getRange('Z1').setValue('BLOQUANT');
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2], { sheets });
  try {
    await page.waitForTimeout(150);
    await page.focus('#piece'); await page.keyboard.type('0123 4567 8901'); await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    assert.ok(await page.isVisible('#modalDoublonPiece'), 'avertissement N° attendu (ancienne ligne sans 0)');
    await page.click('#modalDoublonPiece >> text=OK');
    await page.fill('#nom', 'Dupont'); await page.fill('#prenom', 'Jean');
    await page.fill('#montant', '5'); await page.click('#btnValider'); await page.waitForTimeout(100);
    assert.match(await page.textContent('#titreDoublon'), /REFUSÉE/);
    assert.ok(await page.isVisible('#actionBloquant'));
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2, 'rien d\'écrit');
    // recherche dans la liste des saisies avec le 0
    await page.evaluate(() => { listeSaisies = [{ ligne: 2, date: '', nom: 'DUPONT', prenom: 'JEAN', piece: '12345678901', montant: '', notes: '', alerte: false }]; document.getElementById('rechercheSaisie').value = '012345678901'; dessinerListeSaisies(); });
    assert.strictEqual(await page.$$eval('#listeSaisies .doublon-carte', x => x.length), 1);
    assert.deepStrictEqual(erreursPage, []);
    console.log('test_ui_piece_zero : OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
