const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
const { ouvrir } = require('./navigateur');
const J = x => JSON.parse(JSON.stringify(x));
const repo = process.argv[2];
function env0(max, mode) {
  const env = makeEnv({ repo, props: { DATE_DEBUT: '2000-01-01', DATE_FIN: '2099-12-31', CFG_PASSAGES_MAX: String(max) } });
  env.sheets.Saisies = new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos','']]);
  env.sheets.Saisies.getRange('Z1').setValue(mode || 'SIGNALER');
  env.ctx.Utilities.sleep = () => {};
  return env;
}
const saisir = (e, n, p, pi, notes) => J(e.ctx.traiterSaisie(n, p, pi, '10', notes || ''));
(async () => {
  // N = 1 (défaut) : comportement d'avant
  let e = env0(1);
  assert.strictEqual(saisir(e, 'DUPONT', 'JEAN', 'AB1').status, 'SUCCES');
  let r = saisir(e, 'DUPONT', 'JEAN', 'AB1');
  assert.strictEqual(r.status, 'CONFIRMATION'); assert.strictEqual(r.message, "Ce client a déjà été enregistré avec ce numéro de pièce d'identité.");

  // N = 3 : 2e et 3e passages acceptés et notés, 4e = doublon A ; B et C toujours signalés
  e = env0(3, 'BLOQUANT'); const S = () => e.sheets.Saisies;
  assert.strictEqual(saisir(e, 'DUPONT', 'JEAN', 'AB1', 'caisse 2').status, 'SUCCES');
  r = saisir(e, 'Dupont', 'Jean', 'ab-1', 'caisse 4'); assert.strictEqual(r.status, 'SUCCES'); assert.strictEqual(r.passage, 2);
  assert.strictEqual(S().getRange(3, 6).getValue(), 'caisse 4\nℹ️ Passage 2/3');
  assert.deepStrictEqual(S().getRange(3, 1, 1, 7).getBackgrounds()[0], [null,null,null,null,null,null,null], 'pas de rouge');
  r = saisir(e, 'DUPONT', 'JEAN', 'AB1'); assert.strictEqual(r.status, 'SUCCES'); assert.match(r.message, /passage 3\/3/);
  r = saisir(e, 'DUPONT', 'JEAN', 'AB1');
  assert.strictEqual(r.status, 'BLOQUE'); assert.match(r.message, /déjà 3 passage\(s\) ; maximum 3/);
  assert.strictEqual(saisir(e, 'MARTIN', 'PAUL', 'AB1').status, 'BLOQUE', 'usurpation B toujours refusée en BLOQUANT');
  r = saisir(e, 'DUPONT', 'JEAN', 'ZZ9'); assert.strictEqual(r.status, 'CONFIRMATION'); assert.strictEqual(r.couleur, 'ORANGE', 'homonyme C toujours signalé');
  assert.strictEqual(S().getLastRow(), 4);
  // Forçage : passage dans la limite -> ligne normale notée ; au-delà en BLOQUANT -> refus
  e = env0(2, 'BLOQUANT');
  saisir(e, 'DUPONT', 'JEAN', 'AB1');
  r = J(e.ctx.forcerSaisie('DUPONT', 'JEAN', 'AB1', '1', '', '', false, false)); assert.strictEqual(r.status, 'SUCCES');
  assert.strictEqual(e.sheets.Saisies.getRange(3, 6).getValue(), 'ℹ️ Passage 2/2');
  assert.strictEqual(J(e.ctx.forcerSaisie('DUPONT', 'JEAN', 'AB1', '1', '', '', false, false)).status, 'BLOQUE');
  // Une note système tapée à la main est retirée
  e = env0(2); assert.strictEqual(saisir(e, 'X', 'Y', 'P1', 'ℹ️ Passage 9/9').status, 'SUCCES');
  assert.strictEqual(e.sheets.Saisies.getRange(2, 6).getValue(), '');

  // Changement du réglage en cours d'offre -> marquages recalculés
  e = env0(3);
  ['', '', ''].forEach(() => saisir(e, 'DUPONT', 'JEAN', 'AB1'));
  const j = e.creerCode('258025').jeton;
  e.ctx.setConfig({ PASSAGES_MAX: '2' }, j);
  assert.strictEqual(e.sheets.Saisies.getRange(3, 6).getValue(), 'ℹ️ Passage 2/2');
  assert.strictEqual(e.sheets.Saisies.getRange(4, 6).getValue(), '⚠️ Ajout forcé (Cas A)', '3e passage au-delà de la nouvelle limite');
  assert.strictEqual(e.sheets.Saisies.getRange(4, 4).getBackgrounds()[0][0], '#f4cccc');
  e.ctx.setConfig({ PASSAGES_MAX: '3' }, j);
  assert.strictEqual(e.sheets.Saisies.getRange(4, 6).getValue(), 'ℹ️ Passage 3/3');
  assert.throws(() => e.ctx.setConfig({ PASSAGES_MAX: '0' }, j), /1 à 10/);
  assert.throws(() => e.ctx.setConfig({ PASSAGES_MAX: '11' }, j), /1 à 10/);
  // Correction : la limite s'applique ; suppression -> notes de passage renumérotées
  e.ctx.setConfig({ PASSAGES_MAX: '2' }, j);
  let rc = J(e.ctx.modifierSaisie(4, { nom: 'DUPONT', prenom: 'JEAN', piece: 'AB1' }, { nom: 'DUPONT', prenom: 'JEAN', piece: 'AB1', montant: '1', notes: '' }, false, j));
  assert.strictEqual(rc.status, 'CONFIRMATION', 'au-delà de 2 -> doublon à confirmer');
  e.ctx.supprimerSaisie(2, { nom: 'DUPONT', prenom: 'JEAN', piece: 'AB1' }, j);
  assert.deepStrictEqual([e.sheets.Saisies.getRange(2, 6).getValue(), e.sheets.Saisies.getRange(3, 6).getValue()], ['', 'ℹ️ Passage 2/2']);

  // onEdit (Sheet) : la limite s'applique
  e = env0(2); saisir(e, 'DUPONT', 'JEAN', 'AB1');
  const Sh = e.sheets.Saisies; Sh._set(3, 2, 'DUPONT'); Sh._set(3, 3, 'JEAN'); Sh._set(3, 4, 'AB1');
  e.ctx.onEdit({ range: Object.assign(Sh.getRange(3, 4), { getSheet: () => Sh }), value: 'AB1' });
  assert.strictEqual(Sh.getRange(3, 6).getValue(), '', '2e passage autorisé : pas d\'alerte');
  Sh._set(4, 2, 'DUPONT'); Sh._set(4, 3, 'JEAN'); Sh._set(4, 4, 'AB1');
  e.ctx.onEdit({ range: Object.assign(Sh.getRange(4, 4), { getSheet: () => Sh }), value: 'AB1' });
  assert.match(Sh.getRange(4, 6).getValue(), /Cas A/);

  // Navigateur : tablette avec 2 passages autorisés
  const o = await ouvrir(repo, { props: { DATE_DEBUT: '2000-01-01', DATE_FIN: '2099-12-31', CFG_PASSAGES_MAX: '2' } });
  try {
    const { page, env } = o;
    const clavier = async () => { await page.focus('#piece'); for (const v of ['AB1', 'DUPONT', 'JEAN', '10']) { await page.keyboard.type(v); await page.keyboard.press('Enter'); } };
    await page.waitForTimeout(150);
    await clavier(); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
    // 2e passage : avertissement informatif, puis acceptation notée
    await page.focus('#piece'); await page.keyboard.type('AB1'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    assert.match(await page.textContent('#msgDoublonPiece'), /1 fois.*Jusqu'à 2 passages/);
    await page.click('#modalDoublonPiece >> text=OK');
    await page.fill('#nom', 'DUPONT'); await page.fill('#prenom', 'JEAN'); await page.fill('#montant', '10'); await page.click('#btnValider'); await page.waitForTimeout(250);
    assert.match(await page.textContent('#statusMessage'), /passage 2\/2/);
    assert.strictEqual(env.sheets.Saisies.getRange(3, 6).getValue(), 'ℹ️ Passage 2/2');
    // 3e : limite atteinte -> écran ALERTE FRAUDE local
    await page.focus('#piece'); await page.keyboard.type('AB1'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
    assert.match(await page.textContent('#msgDoublonPiece'), /limite de 2 passages atteinte/);
    await page.click('#modalDoublonPiece >> text=OK');
    await page.fill('#nom', 'DUPONT'); await page.fill('#prenom', 'JEAN'); await page.fill('#montant', '10'); await page.click('#btnValider'); await page.waitForTimeout(100);
    assert.match(await page.textContent('#titreDoublon'), /ALERTE FRAUDE/);
    assert.match(await page.textContent('#messageAlerte'), /maximum 2 par client/);
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }
  console.log('test_passages : OK');
})().catch(e => { console.error(e); process.exit(1); });
