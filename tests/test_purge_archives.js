// Purge des archives 3 ans après la clôture (chaque nuit, avant la clôture auto)
const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
const repo = process.argv[2];
const nomArchive = d => 'Archives_' + [d.getDate(), d.getMonth() + 1].map(x => String(x).padStart(2, '0')).join('-') + '-' + d.getFullYear() + '_10-00';
const ilYa = (ans, jours) => { const d = new Date(); d.setFullYear(d.getFullYear() - ans); d.setDate(d.getDate() - (jours || 0)); return d; };

const env = makeEnv({ repo, props: { DATE_DEBUT: '2000-01-01', DATE_FIN: '2099-12-31' } });
env.sheets.Saisies = new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos','']]);
const vieille = nomArchive(ilYa(3, 2)), limite = nomArchive(ilYa(2, 360)), recente = nomArchive(ilYa(0, 10));
for (const n of [vieille, vieille + '_2', limite, recente, 'Archives_ancienne Vannes', 'A_IMPRIMER']) env.sheets[n] = new FakeSheet(n, [['Date']]);

env.activeEmail = env.owner; // lancement manuel par un éditeur
env.ctx.verificationClotureNocturne();
const restants = Object.keys(env.sheets);
assert.ok(!restants.includes(vieille) && !restants.includes(vieille + '_2'), 'archives de plus de 3 ans supprimées');
for (const n of ['Saisies', limite, recente, 'Archives_ancienne Vannes', 'A_IMPRIMER']) assert.ok(restants.includes(n), 'conservé : ' + n);
assert.strictEqual(env.props.getProperty('DATE_FIN'), '2099-12-31', 'offre en cours non clôturée');

// Une erreur de purge n'empêche pas la clôture automatique
const env2 = makeEnv({ repo, props: { DATE_DEBUT: '2000-01-01', DATE_FIN: '2000-01-02' } });
env2.sheets.Saisies = new FakeSheet('Saisies', [['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos','']]);
env2.ctx.purgerArchives_ = () => { throw new Error('panne'); };
env2.activeEmail = env2.owner;
env2.ctx.verificationClotureNocturne();
assert.strictEqual(env2.props.getProperty('DATE_FIN'), '', 'clôture faite malgré la panne de purge');
console.log('test_purge_archives: OK');
