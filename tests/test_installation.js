const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
// 1) Classeur vierge (nouvelle structure)
let env = makeEnv({ repo: process.argv[2], sheets: { 'Feuille 1': new FakeSheet('Feuille 1') } });
assert.throws(() => env.ctx.installer(), /Google Sheets/, 'un visiteur de l\'application ne peut pas installer');
assert.strictEqual(env.triggers.length, 0);
env.activeEmail = env.owner;
let rap = env.ctx.installer();
assert.match(rap, /Saisies/); assert.match(rap, /_Annuaire/); assert.match(rap, /clôture/); assert.match(rap, /purge/);
assert.deepStrictEqual(env.sheets.Saisies.getRange(1, 1, 1, 6).getValues()[0], ['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos']);
assert.strictEqual(env.sheets.Saisies.getRange('Z1').getValue(), 'SIGNALER');
assert.ok(env.sheets._Annuaire.hidden);
assert.ok(env.sheets['Feuille 1'], 'rien supprimé');
assert.deepStrictEqual(env.triggers.sort(), ['purgerAnnuaire', 'verificationClotureNocturne']);
// 2) Relancer = rien à faire, pas de doublon de déclencheur
assert.match(env.ctx.installer(), /Rien à faire/);
assert.strictEqual(env.triggers.length, 2);
// 3) Existant (Vannes) : données intactes, seul le déclencheur manquant est ajouté
const t = new Date();
const saisies = new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','CODE ',''], [t,'TEST','A','P1','1 €','']]);
saisies.getRange('Z1').setValue('BLOQUANT');
env = makeEnv({ repo: process.argv[2], activeEmail: 'editeur@example.com', sheets: { Saisies: saisies, _Annuaire: new FakeSheet('_Annuaire', [['Piece','Nom','Prenom','DerniereVue']]) }, triggers: ['verificationClotureNocturne'] });
rap = env.ctx.installer();
assert.strictEqual(rap, "Déclencheur créé : purge de l'annuaire (chaque nuit vers 3h).");
assert.strictEqual(saisies.getRange(1, 6).getValue(), 'CODE '); assert.strictEqual(saisies.getRange('Z1').getValue(), 'BLOQUANT');
assert.strictEqual(saisies.getLastRow(), 2);
// 4) doGet sur classeur vierge : crée Saisies (pas les déclencheurs)
env = makeEnv({ repo: process.argv[2] });
env.ctx.HtmlService = { createTemplateFromFile: () => ({ evaluate: () => ({ setTitle() { return this; }, addMetaTag() { return this; } }) }) };
env.ctx.doGet({});
assert.ok(env.sheets.Saisies); assert.strictEqual(env.triggers.length, 0);
// 5) Robots absents (application ouverte avant « Installer ») : recréés à l'ouverture
//    de l'espace responsable, et signalés
env.props.setProperty('ID_CLASSEUR', 'ID-CLASSEUR');
const jet = env.creerCode('258025').jeton;
const infos = env.ctx.getInfosAdmin(jet);
assert.strictEqual(infos.robotsCrees, 2); assert.ok(infos.robots.cloture && infos.robots.purge);
assert.deepStrictEqual(env.triggers.sort(), ['purgerAnnuaire', 'verificationClotureNocturne']);
assert.strictEqual(env.ctx.getInfosAdmin(jet).robotsCrees, 0, 'pas de doublon');
console.log('test_installation : OK');
