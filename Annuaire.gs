// Annuaire inter-offres (feuille masquée « _Annuaire »).

// =================================================================
// --- ANNUAIRE INTER-OFFRES (Niveau 3) — ACTIF (kill-switch: ANNUAIRE_ACTIF) ---
//     Index pièce -> Nom/Prénom des offres passées, pour pré-remplir la saisie.
//     Passer ANNUAIRE_ACTIF à false coupe tout (écriture, lecture, affichage).
//     Store NON autoritaire : la décision A/B/C reste sur « Saisies ».
// =================================================================
function _feuilleAnnuaire_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName(ANNUAIRE_FEUILLE);
  if (!f) {
    f = ss.insertSheet(ANNUAIRE_FEUILLE);
    f.appendRow(["Piece", "Nom", "Prenom", "DerniereVue"]);
    f.hideSheet();
  }
  return f;
}

// Upsert (appelé après une saisie réussie) : met à jour Nom/Prénom + date de vue.
function majAnnuaire_(nom, prenom, piece) {
  if (!ANNUAIRE_ACTIF) return;
  var pieceNorm = _normPiece_(piece);
  if (pieceNorm === "") return;
  var f = _feuilleAnnuaire_();
  var data = f.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (_normPiece_(data[i][0]) === pieceNorm) {
      f.getRange(i + 1, 1, 1, 4).setValues([[texte_(pieceNorm), texte_(nom), texte_(prenom), new Date()]]);
      return;
    }
  }
  f.appendRow([texte_(pieceNorm), texte_(nom), texte_(prenom), new Date()]);
}

// Recherche -> { nom, prenom } ou null
function chercherAnnuaire_(pieceNorm) {
  if (!ANNUAIRE_ACTIF || !pieceNorm) return null;
  var f = _feuilleAnnuaire_();
  var data = f.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (_normPiece_(data[i][0]) === pieceNorm) {
      return { nom: data[i][1] ? data[i][1].toString() : "", prenom: data[i][2] ? data[i][2].toString() : "" };
    }
  }
  return null;
}

// Réglage du comportement d'auto-complétion : 'C' (doux) ou 'B' (modale-question).
function getModeAnnuaire() {
  return PropertiesService.getDocumentProperties().getProperty('MODE_ANNUAIRE') || 'C';
}
function basculerModeAnnuaire(jeton) {
  exigerAdmin_(jeton);
  var m = (getModeAnnuaire() === 'C') ? 'B' : 'C';
  PropertiesService.getDocumentProperties().setProperty('MODE_ANNUAIRE', m);
  return m;
}

// Reconstruit l'annuaire depuis « Saisies » + toutes les feuilles Archives_*
// (manuel, à lancer une fois avant activation). Garde la dernière occurrence.
function reconstruireAnnuaire() {
  // Lancée depuis l'éditeur (ou le panneau) : jamais depuis la tablette
  if (!estEditeurDuClasseur_()) throw new Error("Réservé aux personnes ayant accès au classeur (éditeur Apps Script).");
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return reconstruireAnnuaireSousVerrou_();
  } finally {
    libererVerrou_(lock);
  }
}

// Nom gardé pour chaque pièce : celui de sa PLUS ANCIENNE ligne (le titulaire ; un
// usurpateur passé ensuite ne le remplace pas) ; lignes marquées « Cas B » ignorées ;
// date de dernière vue = la plus récente. Lignes sans vraie date ignorées.
function reconstruireAnnuaireSousVerrou_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = _feuilleAnnuaire_();
  f.clearContents();
  f.appendRow(["Piece", "Nom", "Prenom", "DerniereVue"]);
  var index = {};
  var feuilles = ss.getSheets();
  for (var s = 0; s < feuilles.length; s++) {
    var nomF = feuilles[s].getName();
    if (nomF !== FEUILLE_SAISIES && nomF.indexOf(PREFIXE_ARCHIVES) !== 0) continue;
    var data = feuilles[s].getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var pieceNorm = _normPiece_(data[i][IDX.PIECE]);
      if (pieceNorm === "" || !(data[i][IDX.DATE] instanceof Date)) continue;
      if (/Cas B\)/.test(data[i][IDX.NOTES] ? data[i][IDX.NOTES].toString() : "")) continue;
      var d = data[i][IDX.DATE], x = index[pieceNorm];
      if (!x) index[pieceNorm] = { nom: data[i][IDX.NOM], prenom: data[i][IDX.PRENOM], date: d, premiere: d };
      else {
        if (d < x.premiere) { x.nom = data[i][IDX.NOM]; x.prenom = data[i][IDX.PRENOM]; x.premiere = d; }
        if (d > x.date) x.date = d;
      }
    }
  }
  var rows = [];
  for (var p in index) rows.push([texte_(p), texte_(String(index[p].nom || "")), texte_(String(index[p].prenom || "")), index[p].date]);
  if (rows.length) f.getRange(2, 1, rows.length, 4).setValues(rows);
  return "Annuaire reconstruit : " + rows.length + " pièces.";
}

// Purge des entrées inactives depuis ANNUAIRE_RETENTION_ANS ans (à mettre sur trigger).
function purgerAnnuaire(e) {
  exigerDeclencheurOuEditeur_(e);
  if (!ANNUAIRE_ACTIF) return;
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // pas de saisie (qui met l'annuaire à jour) pendant la réécriture
  try {
    var f = _feuilleAnnuaire_();
    var data = f.getDataRange().getValues();
    var limite = new Date();
    limite.setFullYear(limite.getFullYear() - ANNUAIRE_RETENTION_ANS);
    var garder = [];
    for (var i = 1; i < data.length; i++) {
      var d = (data[i][3] instanceof Date) ? data[i][3] : null;
      if (d && d >= limite) garder.push([texte_(String(data[i][0])), texte_(String(data[i][1] || "")), texte_(String(data[i][2] || "")), d]);
    }
    if (garder.length === data.length - 1) return; // rien à purger
    if (data.length > 1) f.getRange(2, 1, data.length - 1, 4).clearContent();
    if (garder.length) f.getRange(2, 1, garder.length, 4).setValues(garder);
  } finally {
    lock.releaseLock();
  }
}
