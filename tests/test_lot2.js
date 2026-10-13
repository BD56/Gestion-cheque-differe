// Lot 2 (audit) côté serveur : normalisation, champs vides, annuaire et usurpation,
// onEdit en BLOQUANT, notes-dates, mode tolérant, robot de nuit (fuseau), dates.
const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
const J = x => JSON.parse(JSON.stringify(x));
const repo = process.argv[2];
const ENTETE = ['Date', 'Nom', 'Prénom', 'N° Pièce', 'Montant', 'Notes ou Infos', ''];
function env0(mode, lignes, props) {
  const env = makeEnv({ repo, props: props || { DATE_DEBUT: '2000-01-01', DATE_FIN: '2099-12-31' } });
  env.ctx.Utilities.sleep = () => {};
  env.alertes = [];
  env.ctx.SpreadsheetApp.getUi = () => ({ alert: (t, m) => env.alertes.push(m), ButtonSet: { OK: 1 } });
  const S = env.sheets.Saisies = new FakeSheet('Saisies', [ENTETE].concat(lignes || []));
  S.getRange('Z1').setValue(mode || 'SIGNALER');
  env.sheets._Annuaire = new FakeSheet('_Annuaire', [['Piece', 'Nom', 'Prenom', 'DerniereVue']]);
  return env;
}
const ev = (S, r, c, nr, nc, value, oldValue) => ({ range: Object.assign(S.getRange(r, c, nr, nc), { getSheet: () => S }), value, oldValue });
const t = new Date();

// 1) Normalisation : séparateurs ignorés (N° et noms), mêmes règles côté tablette
let e = env0();
const c = e.ctx;
['123.456.789.012', '123/456/789/012', '123_456_789_012', '123​456789012', '0123456789012'].forEach(p =>
  assert.strictEqual(c._normPiece_(p), '123456789012', 'N° ' + JSON.stringify(p)));
assert.strictEqual(c._normPiece_('ab-12 3'), 'AB123');
["D'ARC", 'D’ARC', 'D‘ARC', 'DʼARC', 'D`ARC', 'd arc', 'D​ARC'].forEach(n => assert.strictEqual(c._normId_(n), 'DARC', 'nom ' + JSON.stringify(n)));
assert.strictEqual(c._normId_('Søren'), 'SOREN'); assert.strictEqual(c._normId_('Łukasz'), 'LUKASZ'); assert.strictEqual(c._normId_('Hélène-Œuvre'), 'HELENEOEUVRE');
// même normalisation sur la tablette (copie des fonctions de la page)
const html = require('fs').readFileSync(repo + '/ScriptFormulaire.html', 'utf8');
const src = html.match(/var SEPARATEURS_NOM_JS[\s\S]*?function normPieceJS\(p\) \{[\s\S]*?\n  \}/)[0];
const page = new Function(src + '; return { normIdJS: normIdJS, normPieceJS: normPieceJS };')();
['123.456.789.012', 'ab-12 3', '0042', "D'ARC", 'D’ARC', 'Søren', 'Łukasz', 'Hélène-Œuvre', 'D​ARC', ' -- ', '.'].forEach(v => {
  assert.strictEqual(page.normPieceJS(v), c._normPiece_(v), 'normPieceJS = _normPiece_ pour ' + JSON.stringify(v));
  assert.strictEqual(page.normIdJS(v), c._normId_(v), 'normIdJS = _normId_ pour ' + JSON.stringify(v));
});

// 2) Saisie « vide » refusée (N° fait de tirets, nom « . ») : jamais comparable
e = env0('BLOQUANT', [[t, 'DUPONT', 'JEAN', 'AB1', '10', '']]);
let r = J(e.ctx.traiterSaisie('DUPONT', 'JEAN', ' - - ', '10', ''));
assert.strictEqual(r.status, 'BLOQUE'); assert.match(r.message, /N° de pièce/);
r = J(e.ctx.traiterSaisie('.', 'JEAN', 'ZZ9', '10', ''));
assert.match(r.message, /Nom/);
// N° avec points = même pièce : usurpation détectée
r = J(e.ctx.traiterSaisie('MARTIN', 'PAUL', 'A.B.1', '10', ''));
assert.strictEqual(r.status, 'BLOQUE'); assert.match(r.message, /autre client/);

// 3) Annuaire : l'usurpateur qui revient ne remplace pas le titulaire
e = env0('SIGNALER');
assert.strictEqual(J(e.ctx.traiterSaisie('DUPONT', 'JEAN', 'AB1', '10', '')).status, 'SUCCES');
assert.strictEqual(J(e.ctx.forcerSaisie('MARTIN', 'PAUL', 'AB1', '10', '', '', false, false)).cas, 'B');
assert.strictEqual(J(e.ctx.forcerSaisie('MARTIN', 'PAUL', 'AB1', '10', '', '', false, false)).cas, 'A');
assert.deepStrictEqual(J(e.ctx.chercherAnnuaire_('AB1')), { nom: 'DUPONT', prenom: 'JEAN' }, 'titulaire conservé');
e.activeEmail = e.owner; e.ctx.reconstruireAnnuaire();
assert.deepStrictEqual(J(e.ctx.chercherAnnuaire_('AB1')), { nom: 'DUPONT', prenom: 'JEAN' }, 'reconstruction : 1er titulaire');

// 4) onEdit en BLOQUANT
// 4a) corriger le montant d'une ligne déjà en doublon : accepté (plus d'effacement)
e = env0('BLOQUANT', [[t, 'DUPONT', 'JEAN', 'AB1', '10', ''], [t, 'DUPONT', 'JEAN', 'AB1', '10', '⚠️ Ajout forcé (Cas A)']]);
let S = e.sheets.Saisies;
S._set(2, 5, '25');
e.ctx.onEdit(ev(S, 2, 5, 1, 1, '25', '10'));
assert.strictEqual(String(S.getRange(2, 5).getValue()), '25', 'montant corrigé conservé'); assert.strictEqual(e.alertes.length, 0);
// 4b) changer un nom pour créer un doublon : ANCIENNE valeur remise (pas une cellule vide)
e = env0('BLOQUANT', [[t, 'DUPONT', 'JEAN', 'AB1', '10', ''], [t, 'MARTIN', 'PAUL', 'CD2', '10', '']]);
S = e.sheets.Saisies;
S._set(3, 4, 'AB1');
e.ctx.onEdit(ev(S, 3, 4, 1, 1, 'AB1', 'CD2'));
assert.strictEqual(S.getRange(3, 4).getValue(), 'CD2', 'ancienne valeur remise'); assert.match(e.alertes[0], /Cas B/);
// 4c) nouvelle ligne refusée : pas de date orpheline
e = env0('BLOQUANT', [[t, 'DUPONT', 'JEAN', 'AB1', '10', '']]);
S = e.sheets.Saisies;
S._set(3, 4, 'AB1');
e.ctx.onEdit(ev(S, 3, 4, 1, 1, 'AB1'));
assert.strictEqual(S.getLastRow(), 2, 'ligne refusée entièrement vide (date comprise)');
// 4d) SIGNALER : marquage de toute l'offre, 1re occurrence propre, notes système unifiées
e = env0('SIGNALER', [[t, 'DUPONT', 'JEAN', 'AB1', '10', 'ℹ️ Passage 2/2']]);
S = e.sheets.Saisies;
S._set(3, 2, 'DUPONT'); S._set(3, 3, 'JEAN'); S._set(3, 4, 'AB1');
e.ctx.onEdit(ev(S, 3, 4, 1, 1, 'AB1'));
assert.strictEqual(S.getRange(2, 6).getValue(), '', '1re occurrence propre (ancienne note système retirée)');
assert.strictEqual(S.getRange(3, 6).getValue(), '⚠️ Ajout forcé (Cas A)');

// 5) Notes que Sheets a prises pour des dates : pas réécrites en texte JavaScript
e = env0('SIGNALER', [[t, 'DUPONT', 'JEAN', 'AB1', '10', new Date(2026, 3, 3)], [t, 'MARTIN', 'PAUL', 'CD2', '10', '']]);
e.ctx.recalculerMarquages_(e.sheets.Saisies);
assert.ok(e.sheets.Saisies.getRange(2, 6).getValue() instanceof Date, 'note-date intacte (rien à changer)');
e.sheets.Saisies._set(3, 4, 'AB1'); // la ligne 3 devient une usurpation -> notes réécrites
e.ctx.recalculerMarquages_(e.sheets.Saisies);
assert.doesNotMatch(String(e.sheets.Saisies.getRange(2, 6).getValue()), /GMT/, 'pas de « Fri Apr 03 … GMT »');

// 6) Mode tapé à la main « Bloquant » : reconnu
e = env0('Bloquant ', [[t, 'DUPONT', 'JEAN', 'AB1', '10', '']]);
assert.strictEqual(J(e.ctx.traiterSaisie('DUPONT', 'JEAN', 'AB1', '10', '')).status, 'BLOQUE');

// 7) Robot de nuit : comparaison du jour dans le fuseau du projet
const ajd = c.Utilities.formatDate(new Date(), 'Europe/Paris', 'yyyy-MM-dd');
const hier = c.Utilities.formatDate(new Date(Date.now() - 86400000), 'Europe/Paris', 'yyyy-MM-dd');
e = env0('SIGNALER', [[t, 'A', 'B', 'P1', '1', '']], { DATE_DEBUT: '2000-01-01', DATE_FIN: ajd });
e.activeEmail = e.owner; e.ctx.verificationClotureNocturne();
assert.strictEqual(e.props._store.DATE_FIN, ajd, 'dernier jour : pas encore clôturée');
e = env0('SIGNALER', [[t, 'A', 'B', 'P1', '1', '']], { DATE_DEBUT: '2000-01-01', DATE_FIN: hier });
e.activeEmail = e.owner; e.ctx.verificationClotureNocturne();
assert.strictEqual(e.props._store.DATE_FIN, '', 'lendemain : clôturée');

// 8) Dates d'une nouvelle offre alors que l'ancienne n'est pas clôturée : avertissement
e = env0('SIGNALER', [[t, 'A', 'B', 'P1', '1', '']]);
const j = e.creerCode('258025').jeton;
assert.match(e.ctx.setDatesOperation('2099-01-01', '2099-01-31', j), /clôturez l'offre précédente/);
e = env0('SIGNALER', []);
const j2 = e.creerCode('258025').jeton;
assert.doesNotMatch(e.ctx.setDatesOperation('2099-01-01', '2099-01-31', j2), /⚠️/);

// 9) Cache de la tablette : une ligne sans N° reste visible (homonyme détectable)
e = env0('SIGNALER', [[t, 'DUPONT', 'JEAN', '', '10', '']]);
assert.strictEqual(J(e.ctx.cacheVerif_()).offre.length, 1);

// 10) Panneau : retirer toutes les tablettes (éditeur seulement)
e = env0();
assert.throws(() => e.ctx.retirerToutesTablettesPanneau(), /Google Sheets/);
e.props.setProperty('TABLETTES', JSON.stringify([{ id: 'x', nom: 'T', hash: 'h' }]));
e.activeEmail = e.owner; assert.match(e.ctx.retirerToutesTablettesPanneau(), /retirées/);
assert.strictEqual(e.props._store.TABLETTES, '[]');
console.log('test_lot2 : OK');
