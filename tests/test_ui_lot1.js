// Lot 1 (audit) côté tablette : échec réseau, encadré protégé, pré-remplissage,
// réglages synchronisés, âge maximum de la copie, indicateur d'envoi, mode à la clôture.
const assert = require('assert');
const { ouvrir } = require('./navigateur');
const { FakeSheet } = require('./fakesheet');
const REPO = process.argv[2];
async function remplir(page, piece, nom, prenom, montant) {
  await page.fill('#piece', piece); await page.focus('#nom'); await page.waitForTimeout(50);
  if (await page.isVisible('#modalDoublonPiece')) await page.click('#modalDoublonPiece >> text=OK'); // « N° déjà enregistré »
  await page.fill('#nom', nom); await page.fill('#prenom', prenom); await page.fill('#montant', montant || '10');
}
(async () => {
  // 1) Échec réseau : la saisie n'est PAS gardée dans la copie locale ; RÉESSAYER l'enregistre
  let o = await ouvrir(REPO);
  try {
    const { env, page } = o;
    const vrai = env.ctx.traiterSaisie, vraiCache = env.ctx.chargerCacheVerif;
    const ko = () => { throw new Error('NetworkError: Connection failure due to HTTP 0'); };
    env.ctx.traiterSaisie = ko; env.ctx.chargerCacheVerif = ko;
    await remplir(page, 'XY999', 'DURAND', 'LUC'); await page.click('#btnValider'); await page.waitForTimeout(300);
    assert.match(await page.textContent('#alerteServeurTitre'), /NON ENREGISTRÉE/);
    assert.ok(await page.isVisible('#alerteServeurReessai') && !(await page.isVisible('#btnAlerteOk')));
    assert.deepStrictEqual(await page.evaluate(() => cacheVerif.offre.filter(x => x.pieceNorm === 'XY999').length), 0, 'retirée de la copie locale');
    assert.strictEqual(await page.isVisible('#envoiEnCours'), false, 'plus « en cours d\'envoi »');
    // Réseau revenu : RÉESSAYER -> enregistrée
    env.ctx.traiterSaisie = vrai; env.ctx.chargerCacheVerif = vraiCache;
    await page.click('#alerteServeurReessai >> text=RÉESSAYER'); await page.waitForTimeout(300);
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 2, 'saisie enregistrée au 2e envoi');
    assert.ok(!(await page.isVisible('#modalAlerteServeur')));
    // Ressaisie sans réseau, puis ABANDONNER : ressaisir n'est plus pris pour un doublon d'elle-même
    env.ctx.traiterSaisie = ko; env.ctx.chargerCacheVerif = ko;
    await remplir(page, 'QQ1', 'MARTIN', 'ANNE'); await page.click('#btnValider'); await page.waitForTimeout(300);
    await page.click('#alerteServeurReessai >> text=ABANDONNER');
    env.ctx.traiterSaisie = vrai; env.ctx.chargerCacheVerif = vraiCache;
    await page.evaluate(() => rechargerCacheVerif()); await page.waitForTimeout(150);
    await remplir(page, 'QQ1', 'MARTIN', 'ANNE'); await page.click('#btnValider'); await page.waitForTimeout(300);
    assert.ok(!(await page.isVisible('#boxConfirmation')), 'pas de faux doublon');
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 3);
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }

  // 2) Encadré de doublon : le rafraîchissement des dates ne remet pas le formulaire par-dessus,
  //    et FORCER enregistre le client de l'encadré (pas ce qui a été retapé depuis)
  o = await ouvrir(REPO);
  try {
    const { env, page } = o;
    await remplir(page, 'AB123', 'DUPONT', 'JEAN'); await page.click('#btnValider'); await page.waitForTimeout(250);
    await remplir(page, 'AB123', 'DUPONT', 'JEAN'); await page.click('#btnValider'); await page.waitForTimeout(150);
    assert.ok(await page.isVisible('#boxConfirmation'));
    await page.evaluate(() => chargerDatesAffichage()); await page.waitForTimeout(150);
    assert.ok(!(await page.isVisible('#formulaireSaisie')), 'formulaire pas réaffiché sur l\'encadré');
    // même si le formulaire est modifié en douce, le forçage porte sur DUPONT
    await page.evaluate(() => { memNom = 'MARTIN'; memPiece = 'ZZ777'; });
    await page.click('#boxConfirmation >> text=FORCER L\'AJOUT'); await page.waitForTimeout(300);
    const lignes = env.sheets.Saisies.getDataRange().getValues().slice(1).map(r => r[1] + '/' + r[3]);
    assert.deepStrictEqual(lignes, ['DUPONT/AB123', 'DUPONT/AB123']);
    assert.ok(await page.isVisible('#formulaireSaisie'));
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }

  // 3) Pré-remplissage depuis l'annuaire : taper le nom REMPLACE la proposition
  o = await ouvrir(REPO);
  try {
    const { env, page } = o;
    env.sheets._Annuaire = new FakeSheet('_Annuaire', [['Piece', 'Nom', 'Prenom', 'DerniereVue'], ["'AN555", 'DUPONT', 'JEAN', new Date()]]);
    await page.evaluate(() => rechargerCacheVerif()); await page.waitForTimeout(150);
    await page.focus('#piece');
    for (const v of ['AN555', 'DUPONT', 'JEAN']) { await page.keyboard.type(v); await page.keyboard.press('Enter'); }
    assert.strictEqual(await page.inputValue('#nom'), 'DUPONT');
    assert.strictEqual(await page.inputValue('#prenom'), 'JEAN');
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }

  // 4) Réglages changés ailleurs : appliqués au rechargement suivant (passages autorisés)
  o = await ouvrir(REPO);
  try {
    const { env, page } = o;
    env.sheets.Saisies.getRange('Z1').setValue('BLOQUANT');
    await remplir(page, 'AB1', 'DUPONT', 'JEAN'); await page.click('#btnValider'); await page.waitForTimeout(250);
    env.props.setProperty('CFG_PASSAGES_MAX', '2'); // une autre tablette autorise 2 passages
    await page.evaluate(() => rechargerCacheVerif()); await page.waitForTimeout(150);
    assert.strictEqual(await page.evaluate(() => passagesMaxJS()), 2);
    await remplir(page, 'AB1', 'DUPONT', 'JEAN'); await page.click('#btnValider'); await page.waitForTimeout(250);
    assert.ok(!(await page.isVisible('#boxConfirmation')), '2e passage accepté (pas de refus à tort)');
    assert.strictEqual(env.sheets.Saisies.getLastRow(), 3);
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }

  // 5) Copie de plus de 2 min : pas de ✅ immédiat, on attend le serveur
  o = await ouvrir(REPO);
  try {
    const { env, page } = o;
    let reponse; const vrai = env.ctx.traiterSaisie;
    env.ctx.traiterSaisie = function () { reponse = vrai.apply(null, arguments); return reponse; };
    await remplir(page, 'CD5', 'LEROY', 'PAUL');
    await page.evaluate(() => { cacheRecuA = Date.now() - 3 * 60 * 1000; }); // (remplir a pu recharger)
    const avant = await page.evaluate(() => { document.getElementById('btnValider').click();
      return [document.getElementById('statusMessage').style.display, document.getElementById('btnValider').textContent]; });
    assert.strictEqual(avant[0], 'none', 'pas de ✅ avant la réponse du serveur');
    assert.match(avant[1], /Recherche/);
    await page.waitForTimeout(300);
    assert.ok(reponse && reponse.status === 'SUCCES', 'décision prise par le serveur');
    assert.match(await page.textContent('#statusMessage'), /enregistrée/);
    // Copie fraîche : ✅ immédiat + indicateur « en cours d'envoi » qui disparaît
    await page.evaluate(() => rechargerCacheVerif()); await page.waitForTimeout(150);
    await remplir(page, 'CD6', 'LEROY', 'ANNE');
    // lu dans le même instant que le clic (le faux serveur répond en quelques ms)
    const juste = await page.evaluate(() => { document.getElementById('btnValider').click();
      return [document.getElementById('statusMessage').textContent, document.getElementById('envoiEnCours').textContent]; });
    assert.match(juste[0], /enregistrée/, '✅ immédiat avec une copie fraîche');
    assert.match(juste[1], /1 saisie en cours d'envoi/);
    await page.waitForTimeout(300);
    assert.ok(!(await page.isVisible('#envoiEnCours')), 'indicateur effacé après confirmation');
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }

  // 6) Clôture : le mode est conservé (BLOQUANT reste BLOQUANT)
  o = await ouvrir(REPO);
  try {
    const { env, page } = o;
    env.sheets.Saisies.getRange('Z1').setValue('BLOQUANT');
    await remplir(page, 'EF1', 'ROUX', 'LEA'); await page.click('#btnValider'); await page.waitForTimeout(250);
    const jeton = env.creerCode('258025').jeton;
    assert.match(env.ctx.archiverOffreWebApp(jeton), /archivée/);
    assert.strictEqual(env.sheets.Saisies.getRange('Z1').getValue(), 'BLOQUANT');
    assert.deepStrictEqual(o.erreursPage, []);
  } finally { await o.browser.close(); }
  console.log('test_ui_lot1: OK');
})().catch(e => { console.log('test_ui_lot1: ÉCHEC ' + (e && e.stack || e)); process.exit(1); });
