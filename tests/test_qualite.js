const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
const { ouvrir } = require('./navigateur');
const J = x => JSON.parse(JSON.stringify(x));
const repo = process.argv[2];
function env0(lignes) {
  const env = makeEnv({ repo, props: { DATE_DEBUT: '2000-01-01', DATE_FIN: '2099-12-31' } });
  env.sheets.Saisies = new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos','']].concat(lignes));
  env.sheets.Saisies.getRange('Z1').setValue('SIGNALER');
  return env;
}
const t = new Date();
(async () => {
  // #7 Accents / apostrophes / ligatures (serveur)
  const cas = (l, n, p, pi) => { const e = env0([l]); const r = J(e.ctx.traiterSaisie(n, p, pi, '1', '')); return r.status === 'SUCCES' ? null : r.details[0].type; };
  assert.strictEqual(cas([t,'DUPONT','HÉLÈNE','AB1','',''], 'Dupont', 'Helene', 'ZZ9'), 'C');
  assert.strictEqual(cas([t,"D'ARC",'JEANNE','AB1','',''], 'DARC', 'Jeanne', 'AB1'), 'A');
  assert.strictEqual(cas([t,'CŒUR','LÉA','AB1','',''], 'coeur', 'lea', 'XX'), 'C');
  assert.strictEqual(cas([t,'DUPONT','JEAN','AB1','',''], 'DUPOND', 'JEAN', 'XX'), null, 'noms différents : rien');
  // #8 annuaire non écrasé par une usurpation forcée
  let e = env0([[t,'DUPONT','JEAN','AB1','','']]);
  e.ctx.traiterSaisie('DUPONT', 'JEAN', 'ZZ1', '1', ''); // crée l'annuaire (homonyme C -> pas écrit) : on passe par forcer
  e.ctx.forcerSaisie('VOLEUR', 'X', 'AB1', '1', '', '', false, false);
  const ann = e.sheets._Annuaire ? e.sheets._Annuaire.getDataRange().getValues().filter(x => x[0] === 'AB1') : [];
  assert.ok(!ann.some(x => x[1] === 'VOLEUR'), 'le nom de l\'usurpateur ne doit pas entrer dans l\'annuaire');

  // Navigateur : #17 montant, #16 injection
  const sheets = { Saisies: new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos',''], [t, '<img src=x onerror="window.__xss=1">', '<b>X</b>', 'AB1', '1 €', '<script>window.__xss=2</script>']]) };
  sheets.Saisies.getRange('Z1').setValue('SIGNALER');
  const { page, browser, erreursPage } = await ouvrir(repo, { sheets });
  try {
    await page.waitForTimeout(150);
    const lus = await page.evaluate(() => ['150', '150,5', '150.50', '1 234,50 €', '1.234,50', '1.234', '12 €', 'abc', '12,3,4', '-5', ''].map(lireMontant));
    assert.deepStrictEqual(lus, [150, 150.5, 150.5, 1234.5, 1234.5, 1234, 12, null, null, null, null]);
    // saisie : montant illisible refusé, lisible reformaté
    await page.fill('#piece', 'NEW1'); await page.fill('#nom', 'A'); await page.fill('#prenom', 'B'); await page.fill('#montant', 'abc');
    await page.click('#btnValider'); await page.waitForTimeout(100);
    assert.match(await page.textContent('#statusMessage'), /Montant illisible/);
    await page.fill('#montant', '1234.5'); await page.press('#montant', 'Tab');
    assert.strictEqual(await page.inputValue('#montant'), '1234,50 €');
    // #16 : N2 + écran doublon + impression sans exécution
    await page.fill('#piece', 'AB1'); await page.press('#piece', 'Tab'); await page.waitForTimeout(100);
    assert.ok(await page.isVisible('#modalDoublonPiece'));
    assert.match(await page.textContent('#listeDoublonPiece'), /<img src=x/);
    await page.click('#modalDoublonPiece >> text=OK');
    await page.fill('#nom', 'Y'); await page.fill('#prenom', 'Z'); await page.click('#btnValider'); await page.waitForTimeout(100);
    assert.match(await page.textContent('#listeDoublons'), /<script>window.__xss=2<\/script>/);
    await page.evaluate(() => imprimerTableau([['Date','Nom'], ['x', '<img src=y onerror="window.__xss=3">']], '<i>T</i>'));
    await page.waitForTimeout(100);
    assert.strictEqual(await page.evaluate(() => window.__xss), undefined, 'aucun code exécuté');
    assert.deepStrictEqual(erreursPage, []);
    console.log('test_qualite : OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
