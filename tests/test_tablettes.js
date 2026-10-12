const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
const J = x => JSON.parse(JSON.stringify(x));
const env = makeEnv({ repo: process.argv[2], tabletteReelle: true, props: { DATE_DEBUT: '2000-01-01', DATE_FIN: '2099-12-31' } });
env.sheets.Saisies = new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos','']]);
env.sheets.Saisies.getRange('Z1').setValue('SIGNALER');
const c = env.ctx, P = env.props._store;
const refuse = (f) => assert.throws(f, /TABLETTE_NON_AUTORISEE/);
const sansPause = () => { P.ADMIN_DERNIER_ECHEC = '0'; };

// Sans clé : tout ce que la tablette utilise est refusé (un lien qui fuite ne donne rien)
refuse(() => c.traiterSaisie('A', 'B', 'P1', '1', ''));
refuse(() => c.forcerSaisie('A', 'B', 'P1', '1', '', '', false, false));
refuse(() => c.chargerCacheVerif());
refuse(() => c.verifierPiece('P1'));
refuse(() => c.genererDonneesImpression('offre', ''));
refuse(() => c.getDatesOperation());
refuse(() => c.getInfosPanneau());
refuse(() => c.ouvrirSessionAdmin('258025', 'cle-bidon-cle-bidon-cle-bidon-cle-bidon'));
// 1re installation : création du code libre (aucune tablette encore), puis autorisation
assert.ok(J(c.definirPin('258025', null, null)).ok);
let r = J(c.appairerTablette('000000', 'X')); assert.strictEqual(r.ok, false);
assert.match(J(c.appairerTablette('258025', 'X')).message, /Patientez/, 'pause de 10 s aussi pour l\'autorisation');
sansPause();
r = J(c.appairerTablette('258025', '  Caisse centrale 1  '));
assert.ok(r.ok); assert.strictEqual(r.cle.length, 64); assert.strictEqual(r.nom, 'Caisse centrale 1');
const cle = r.cle;
assert.ok(!JSON.stringify(P).includes(cle), 'clé jamais stockée en clair');
// Avec la clé : tout fonctionne
assert.strictEqual(J(c.traiterSaisie('DUPONT', 'JEAN', 'P1', '10', '', cle)).status, 'SUCCES');
assert.strictEqual(J(c.chargerCacheVerif(cle)).offre.length, 1);
assert.ok(J(c.genererDonneesImpression('offre', '', cle)).length === 2);
assert.ok(J(c.ouvrirSessionAdmin('258025', cle)).ok);
assert.ok(Object.keys(P).some(k => k.indexOf('TABLETTE_VUE_') === 0), 'date de dernière utilisation notée');
// Clé inventée / tronquée : refusée
refuse(() => c.chargerCacheVerif(cle.slice(0, 63) + 'x'));
refuse(() => c.chargerCacheVerif(cle.slice(0, 20)));
// Panneau du Sheet (éditeur) : sans clé
env.activeEmail = env.owner;
assert.ok(J(c.getDatesOperation()).fin === '2099-12-31');
// Code réinitialisé depuis le Sheet : un inconnu ne peut PAS recréer le code…
c.reinitialiserPinPanneau();
env.activeEmail = '';
refuse(() => c.definirPin('111111', null, null));
// … une tablette déjà autorisée oui
const j = J(c.definirPin('333333', null, cle)); assert.ok(j.ok && j.jeton);
// Liste / retrait
sansPause(); const r2 = J(c.appairerTablette('333333', 'Caisse 2'));
let liste = J(c.listerTablettes(j.jeton));
assert.deepStrictEqual(liste.map(t => t.nom), ['Caisse centrale 1', 'Caisse 2']);
assert.throws(() => c.listerTablettes(null), /ADMIN_REQUIS/);
c.retirerTablette(liste[1].id, j.jeton);
refuse(() => c.chargerCacheVerif(r2.cle));
assert.strictEqual(J(c.chargerCacheVerif(cle)).offre.length, 1, 'l\'autre tablette garde son accès');
c.retirerToutesTablettes(j.jeton);
refuse(() => c.chargerCacheVerif(cle));
// Plafond
for (let i = 0; i < 20; i++) { sansPause(); assert.ok(J(c.appairerTablette('333333', 'T' + i)).ok); }
sansPause(); assert.match(J(c.appairerTablette('333333', 'T21')).message, /20 tablettes maximum/);
console.log('test_tablettes : OK');
