// Journal des actions sensibles : onglet masqué « _Journal » du Google Sheets, pour la
// direction (contrôle : qui a supprimé, corrigé, forcé, changé un réglage…). Une ligne
// par action : date et heure (à la seconde), qui (compte, panneau du Sheet ou robot),
// action, détail. Jamais de mot de passe, de code ni de session. L'application l'écrit
// seulement : rien pour le modifier ou l'effacer. Lignes de plus de
// JOURNAL_RETENTION_MOIS mois effacées chaque nuit (robot de nuit).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Journal_() {
  return "2026.10.16-1031";
}

function feuilleJournal_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let f = ss.getSheetByName(JOURNAL_FEUILLE);
  if (!f) {
    f = ss.insertSheet(JOURNAL_FEUILLE);
    f.appendRow(["Date et heure", "Qui", "Action", "Détail"]);
    f.getRange(1, 1, 1, 4).setFontWeight("bold");
    f.getRange("A2:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
    f.setFrozenRows(1);
    f.hideSheet();
  }
  return f;
}

// N'empêche JAMAIS l'action journalisée : une panne du journal est seulement notée.
function journaliser_(qui, action, detail) {
  try {
    feuilleJournal_().appendRow([new Date(), texte_(qui || "?"), texte_(action), texte_(detail || "")]);
  } catch (e) {
    Logger.log("Journal : " + e);
  }
}

// --- Qui ? ---
function quiPanneau_() {
  let email = "";
  try {
    email = Session.getActiveUser().getEmail();
  } catch (e) {
    email = "";
  }
  return "Panneau du Sheet" + (email ? " (" + email + ")" : "");
}
// Appel de la page avec sa session (saisie, ajout forcé)
function quiSession_(cle) {
  const c = compteDeSession_(cle);
  return c ? c.identifiant : quiPanneau_();
}
// Appel de l'espace responsable (jeton { j, c }) ou du panneau du Sheet (sans jeton).
// Codes personnels : « compte · personne » (la personne qui a tapé SON code).
function quiJeton_(jeton) {
  const a = appelantDeCle_(cleAppelant_(undefined, jeton));
  const p = personneDuJeton_(jeton);
  return (a ? a.nom : quiPanneau_()) + (p ? " · " + p.nom : "");
}

// --- Mise en forme du détail ---
function jourLisible_(iso) {
  return iso ? iso.split("-").reverse().join("/") : "—";
}
// Ligne de « Saisies » telle qu'affichée : NOM Prénom · pièce · montant · saisie le …
function ligneLisible_(v) {
  return [
    v[IDX.NOM] + " " + v[IDX.PRENOM],
    "pièce " + v[IDX.PIECE],
    v[IDX.MONTANT] || "sans montant",
    "saisie le " + v[IDX.DATE],
  ].join(" · ");
}

// Lignes de plus de JOURNAL_RETENTION_MOIS mois : effacées (robot de nuit). Les lignes
// sont ajoutées dans l'ordre : les plus anciennes sont en haut.
function purgerJournal_() {
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(JOURNAL_FEUILLE);
  if (!f || f.getLastRow() < 2) return 0;
  const limite = new Date();
  limite.setMonth(limite.getMonth() - JOURNAL_RETENTION_MOIS);
  const dates = f.getRange(2, 1, f.getLastRow() - 1, 1).getValues();
  let n = 0;
  while (n < dates.length && dates[n][0] instanceof Date && dates[n][0] < limite) n++;
  if (n > 0) f.deleteRows(2, n);
  return n;
}
