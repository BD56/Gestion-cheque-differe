// Archives : clôture d'une offre, liste et consultation, purge après 3 ans.

// =================================================================
// --- ARCHIVES (espace responsable) : offres clôturées « Archives_* » ---
// =================================================================
// "Archives_26-09-2026_23-05" -> clé de tri "202609262305" + libellé lisible
function infosNomArchive_(nom) {
  var m = /^Archives_(\d{2})-(\d{2})-(\d{4})_(\d{2})-(\d{2})/.exec(nom);
  if (!m) return { tri: "", libelle: nom };
  return { tri: m[3] + m[2] + m[1] + m[4] + m[5], libelle: "Clôturée le " + m[1] + "/" + m[2] + "/" + m[3] + " à " + m[4] + "h" + m[5] };
}

// Archives supprimées automatiquement ARCHIVES_RETENTION_ANS ans après leur clôture
// (RGPD : durée de conservation définie). Date lue dans le nom de l'onglet ; un
// onglet au nom non reconnu n'est jamais supprimé. Appelée chaque nuit par
// verificationClotureNocturne. Renvoie les noms supprimés.
function purgerArchives_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var limite = new Date();
    limite.setFullYear(limite.getFullYear() - ARCHIVES_RETENTION_ANS);
    var cleLimite = Utilities.formatDate(limite, fuseau_(), "yyyyMMddHHmm");
    var supprimees = [];
    ss.getSheets().forEach(function (f) {
      var nom = f.getName();
      if (nom.indexOf(PREFIXE_ARCHIVES) !== 0) return;
      var tri = infosNomArchive_(nom).tri;
      if (tri && tri < cleLimite) { ss.deleteSheet(f); supprimees.push(nom); }
    });
    return supprimees;
  } finally {
    lock.releaseLock();
  }
}

// Liste des archives, la plus récente d'abord.
function listerArchives(jeton) {
  exigerAdmin_(jeton);
  var liste = [];
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (f) {
    var nom = f.getName();
    if (nom.indexOf(PREFIXE_ARCHIVES) !== 0) return;
    var infos = infosNomArchive_(nom);
    liste.push({ nom: nom, libelle: infos.libelle, tri: infos.tri, lignes: Math.max(0, f.getLastRow() - 1) });
  });
  liste.sort(function (a, b) { return a.tri < b.tri ? 1 : (a.tri > b.tri ? -1 : 0); });
  return liste.map(function (a) { return { nom: a.nom, libelle: a.libelle, lignes: a.lignes }; });
}

// Données d'impression d'une archive (même format que l'offre complète).
function donneesArchive(nom, jeton) {
  exigerAdmin_(jeton);
  nom = (nom || "").toString();
  if (nom.indexOf(PREFIXE_ARCHIVES) !== 0) throw new Error("Archive inconnue.");
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName(nom);
  if (!f) throw new Error("Archive introuvable : " + nom);
  return tableauImpression_(f, null, ss.getSpreadsheetTimeZone());
}

function archiverOffreWebApp(jeton) {
  exigerAdmin_(jeton);
  return archiverOffre_();
}

// Clôture réelle (sans contrôle d'accès : appelée aussi par le robot de nuit).
// Sous verrou : aucune saisie ne peut s'intercaler entre la copie et le vidage.
function archiverOffre_() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return archiverOffreSousVerrou_();
  } finally {
    libererVerrou_(lock);
  }
}

function archiverOffreSousVerrou_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuilleSaisies = ss.getSheetByName(FEUILLE_SAISIES);
  if (!feuilleSaisies) { enregistrerDates_("", ""); return "✅ L'offre a été clôturée (feuille « " + FEUILLE_SAISIES + " » absente : rien à archiver)."; }
  var derniereLigne = feuilleSaisies.getLastRow();
  var message;

  if (derniereLigne > 1) {
    // Nom unique : deux clôtures dans la même minute ne doivent pas échouer
    var base = PREFIXE_ARCHIVES + Utilities.formatDate(new Date(), fuseau_(), "dd-MM-yyyy_HH-mm");
    var nom = base, n = 2;
    while (ss.getSheetByName(nom)) nom = base + "_" + (n++);
    var archive = ss.insertSheet(nom, ss.getNumSheets());
    feuilleSaisies.getDataRange().copyTo(archive.getRange(1, 1));
    archive.setFrozenRows(1);
    feuilleSaisies.getRange(2, 1, derniereLigne - 1, NB_COLONNES_LIGNE).clearContent().setBackground(null);
    message = "✅ L'offre a été clôturée et archivée avec succès !";
  } else {
    // Aucune saisie : on clôture sans créer d'archive vide
    message = "✅ L'offre a été clôturée (aucune saisie : pas d'archive créée).";
  }
  
  // Le mode (SIGNALER / BLOQUANT) est conservé pour l'offre suivante.

  // 🧹 NOUVEAU : On efface les dates en mémoire pour verrouiller les tablettes
  enregistrerDates_("", "");

  return message;
}
