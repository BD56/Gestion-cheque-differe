const assert = require('assert');
const { makeEnv } = require('./mocks');
const { FakeSheet } = require('./fakesheet');
const J = x => JSON.parse(JSON.stringify(x));
function nouvelEnv() {
  const env = makeEnv({ repo: process.argv[2] });
  const t = new Date('2026-09-26T08:00:00Z');
  env.sheets.Saisies = new FakeSheet('Saisies', [
    ['Date','Nom','Prénom','N° Pièce','Montant','Notes ou Infos',''],
    [t,'DUPONT','JEAN','AB123','10 €','caisse 3'],
    [t,'MARTIN','PAUL','CD456','20 €',''],
    [t,'DURAND','ANNE','EF789','30 €','note\n⚠️ Ajout forcé (Cas C)'],
  ]);
  env.sheets.Saisies.getRange('Z1').setValue('SIGNALER');
  env.jeton = env.ctx.definirPin('258025', null).jeton;
  return env;
}
const att = (n, p, pi) => ({ nom: n, prenom: p, piece: pi });

// Accès
let env = nouvelEnv(); let c = env.ctx; const S = () => env.sheets.Saisies;
assert.throws(() => c.listerSaisies(null), /ADMIN_REQUIS/);
assert.throws(() => c.modifierSaisie(2, att('DUPONT','JEAN','AB123'), {}, false, null), /ADMIN_REQUIS/);
assert.throws(() => c.supprimerSaisie(2, att('DUPONT','JEAN','AB123'), 'x'), /ADMIN_REQUIS/);
// Liste : plus récente d'abord, note d'alerte retirée + indicateur
let l = J(c.listerSaisies(env.jeton));
assert.deepStrictEqual(l.map(x => x.ligne), [4, 3, 2]);
assert.strictEqual(l[0].notes, 'note'); assert.strictEqual(l[0].alerte, true); assert.strictEqual(l[2].alerte, false);

// Correction simple (sans doublon) : normalisation + annuaire
let r = J(c.modifierSaisie(2, att('DUPONT','JEAN','AB123'), { nom: ' dupont ', prenom: 'jean-luc', piece: 'ab 124', montant: '12.5 €', notes: 'caisse 3' }, false, env.jeton));
assert.strictEqual(r.status, 'SUCCES');
assert.deepStrictEqual(S().getRange(2, 2, 1, 5).getValues()[0], ['DUPONT','JEAN-LUC','AB 124','12,5 €','caisse 3']);
assert.ok(env.sheets._Annuaire.getDataRange().getValues().some(x => x[0] === 'AB124' && x[2] === 'JEAN-LUC'));

// Cas B (pièce d'une autre personne) en SIGNALER : confirmation, rien d'écrit
r = J(c.modifierSaisie(2, att('DUPONT','JEAN-LUC','AB 124'), { nom: 'DUPONT', prenom: 'JEAN-LUC', piece: 'cd-456', montant: '12,5 €', notes: '' }, false, env.jeton));
assert.strictEqual(r.status, 'CONFIRMATION'); assert.match(r.titre, /ANOMALIE/); assert.strictEqual(r.details[0].ligne, 3);
assert.strictEqual(S().getRange(2, 4).getValue(), 'AB 124', 'non écrit avant confirmation');
// ... forcé : écrit ; le marquage va au passage le plus RÉCENT des deux (ligne 3, MARTIN)
r = J(c.modifierSaisie(2, att('DUPONT','JEAN-LUC','AB 124'), { nom: 'DUPONT', prenom: 'JEAN-LUC', piece: 'cd-456', montant: '12,5 €', notes: 'caisse 3' }, true, env.jeton));
assert.strictEqual(r.status, 'SUCCES');
assert.strictEqual(S().getRange(2, 6).getValue(), 'caisse 3');
assert.strictEqual(S().getRange(3, 6).getValue(), '⚠️ Ajout forcé (Cas B)');
assert.deepStrictEqual(S().getRange(3, 1, 1, 7).getBackgrounds()[0], [null,null,null,'#f4cccc',null,'#f4cccc',null]);
assert.deepStrictEqual(S().getRange(2, 1, 1, 7).getBackgrounds()[0], [null,null,null,null,null,null,null]);
// Re-correction qui supprime le doublon : alerte et rouge retirés partout ; note saisie conservée
r = J(c.modifierSaisie(2, att('DUPONT','JEAN-LUC','CD-456'), { nom: 'DUPONT', prenom: 'JEAN-LUC', piece: 'AB124', montant: '12,5 €', notes: 'caisse 3' }, false, env.jeton));
assert.strictEqual(r.status, 'SUCCES'); assert.strictEqual(S().getRange(2, 6).getValue(), 'caisse 3');
assert.strictEqual(S().getRange(3, 6).getValue(), '');
assert.deepStrictEqual(S().getRange(3, 1, 1, 7).getBackgrounds()[0], [null,null,null,null,null,null,null]);
// La ligne 4 (DURAND) gardait une vieille alerte « Cas C » sans doublon réel : nettoyée, note conservée
assert.strictEqual(S().getRange(4, 6).getValue(), 'note');

// Mode BLOQUANT : A et B refusés même avec forcer=true ; C confirmable
S().getRange('Z1').setValue('BLOQUANT');
r = J(c.modifierSaisie(2, att('DUPONT','JEAN-LUC','AB124'), { nom: 'martin', prenom: 'paul', piece: 'CD456', montant: '1 €' }, true, env.jeton));
assert.strictEqual(r.status, 'BLOQUE'); assert.strictEqual(S().getRange(2, 2).getValue(), 'DUPONT');
r = J(c.modifierSaisie(2, att('DUPONT','JEAN-LUC','AB124'), { nom: 'X', prenom: 'Y', piece: 'EF 789', montant: '1 €' }, true, env.jeton));
assert.strictEqual(r.status, 'BLOQUE');
r = J(c.modifierSaisie(2, att('DUPONT','JEAN-LUC','AB124'), { nom: 'Martin', prenom: 'Paul', piece: 'ZZ1', montant: '1 €' }, false, env.jeton));
assert.strictEqual(r.status, 'CONFIRMATION'); assert.strictEqual(r.couleur, 'ORANGE');
// Se comparer à soi-même n'est pas un doublon (ligne inchangée)
r = J(c.modifierSaisie(3, att('MARTIN','PAUL','CD456'), { nom: 'MARTIN', prenom: 'PAUL', piece: 'CD456', montant: '20 €' }, false, env.jeton));
assert.strictEqual(r.status, 'SUCCES');

// Garde-fous
assert.throws(() => c.modifierSaisie(2, att('AUTRE','JEAN','AB124'), { nom: 'A', prenom: 'B', piece: 'C', montant: '1' }, false, env.jeton), /changé/);
assert.throws(() => c.modifierSaisie(99, att('','',''), { nom: 'A', prenom: 'B', piece: 'C', montant: '1' }, false, env.jeton), /introuvable/);
assert.throws(() => c.modifierSaisie(1, att('Nom','Prénom','N° Pièce'), { nom: 'A', prenom: 'B', piece: 'C', montant: '1' }, false, env.jeton), /introuvable/); // en-tête intouchable
assert.throws(() => c.modifierSaisie(3, att('MARTIN','PAUL','CD456'), { nom: 'MARTIN', prenom: '', piece: 'CD456', montant: '1' }, false, env.jeton), /obligatoires/);
assert.throws(() => c.modifierSaisie(3, att('MARTIN','PAUL','CD456'), { nom: 'MARTIN', prenom: 'PAUL', piece: 'CD456', montant: '' }, false, env.jeton), /montant/);

// Suppression : garde-fou puis suppression effective (lignes décalées)
assert.throws(() => c.supprimerSaisie(3, att('DUPONT','JEAN-LUC','AB124'), env.jeton), /changé/);
assert.match(c.supprimerSaisie(3, att('MARTIN','PAUL','CD456'), env.jeton), /supprimée/);
assert.deepStrictEqual(S().getDataRange().getValues().slice(1).map(x => x[1]), ['DUPONT', 'DURAND']);
// Après suppression, l'ancienne pièce n'est plus un doublon pour une correction
r = J(c.modifierSaisie(3, att('DURAND','ANNE','EF789'), { nom: 'DURAND', prenom: 'ANNE', piece: 'CD456', montant: '30 €', notes: 'note' }, false, env.jeton));
assert.strictEqual(r.status, 'SUCCES');
console.log('test_corrections : OK');
