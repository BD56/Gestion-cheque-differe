// Google Sheets : menu, panneau ⚙️, contrôle des modifications à la main (onEdit).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Sheet_() {
  return "2026.10.14-0200";
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 APPLICATION")
    .addItem("⚙️ Ouvrir le panneau de contrôle", "afficherPanneau")
    .addItem("🧰 Installer / vérifier l'installation", "installerDepuisMenu")
    .addItem("🔑 Code d'activation (créer le code responsable)", "afficherCodeActivation")
    .addToUi();
  if (estCopieNonInstallee_()) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        "Nouvelle copie : menu 🚀 APPLICATION → 🧰 Installer.",
        "Installation",
        20
      );
    } catch (e) {}
    return;
  }
  afficherPanneau();
}

function afficherPanneau() {
  const html = HtmlService.createHtmlOutputFromFile("Panneau").setTitle("⚙️ Contrôle").setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function allerVersImpression(dateChoisieStr) {
  exigerEditeur_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const f = ss.getSheetByName(FEUILLE_IMPRESSION);
  if (!f) return;
  if (dateChoisieStr === "aujourdhui") f.getRange(CELLULE_JOUR_IMPRESSION).clearContent();
  else f.getRange(CELLULE_JOUR_IMPRESSION).setValue("'" + dateChoisieStr);
  SpreadsheetApp.flush();
  ss.setActiveSheet(f);
}

function allerVersOffre() {
  exigerEditeur_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const f = ss.getSheetByName(FEUILLE_OFFRE_COMPLETE);
  if (f) ss.setActiveSheet(f);
}

// =================================================================
// --- CONTRÔLE DES MODIFICATIONS FAITES À LA MAIN DANS « Saisies » ---
// =================================================================
function onEdit(e) {
  if (!e || !e.range) return;
  const feuille = e.range.getSheet();

  // Seule la feuille « Saisies » est contrôlée
  if (feuille.getName() !== FEUILLE_SAISIES) return;

  const premiere = e.range.getRow();
  const colEdit = e.range.getColumn();
  const nbLignes = e.range.getNumRows();
  const nbCols = e.range.getNumColumns();
  const derniere = premiere + nbLignes - 1;

  // On ignore la ligne 1 (en-têtes) et on s'arrête à la colonne F
  if (derniere < 2 || colEdit > COL.NOTES) return;
  const uneCellule = nbLignes === 1 && nbCols === 1;
  const debut = Math.max(2, premiere);
  // Nom, prénom ou N° touchés ? (sinon : montant / notes seulement, jamais annulé)
  const toucheIdentite = colEdit <= COL.PIECE && colEdit + nbCols - 1 >= COL.NOM;

  // Même verrou que les tablettes : une saisie ne peut pas s'intercaler pendant le contrôle
  let lock = null,
    verrou = false;
  try {
    lock = LockService.getScriptLock();
    verrou = lock.tryLock(10000);
  } catch (err) {
    verrou = false;
  }
  const refus = []; // lignes refusées en mode BLOQUANT (alerte affichée après le verrou)
  try {
    // 1️⃣ + 2️⃣ Horodatage et formatage, ligne par ligne (un collage peut couvrir
    //    plusieurs lignes : chacune est traitée, pas seulement la première)
    for (let l = debut; l <= derniere; l++) {
      preparerLigneEditee_(feuille, l, colEdit, nbCols, uneCellule ? e.value : undefined, uneCellule);
    }
    SpreadsheetApp.flush();

    // 3️⃣ Mode BLOQUANT : une ligne dont le nom / prénom / N° vient d'être modifié pour
    //    créer un doublon (A) ou une usurpation (B) est annulée (ancienne valeur remise).
    const modeSecurite = modeSecurite_(feuille);
    if (modeSecurite === "BLOQUANT" && toucheIdentite) {
      for (let ligne = debut; ligne <= derniere; ligne++) {
        const plageAnnulee = uneCellule
          ? e.range
          : feuille.getRange(ligne, colEdit, 1, Math.min(nbCols, COL.NOTES - colEdit + 1));
        const cas = controlerLigneEditee_(
          feuille,
          ligne,
          plageAnnulee,
          uneCellule ? e.oldValue : undefined,
          colEdit
        );
        if (cas) refus.push("ligne " + ligne + " (Cas " + cas + ")");
      }
    }
    // Ligne entièrement vidée : on efface aussi sa date
    const bloc = feuille.getRange(debut, COL.NOM, derniere - debut + 1, NB_COLONNES_SAISIE).getValues();
    bloc.forEach(function (r, k) {
      if (
        r.every(function (v) {
          return v === "" || v === null;
        })
      )
        feuille.getRange(debut + k, COL.DATE).clearContent();
    });
    // 4️⃣ Notes « ⚠️ Ajout forcé » / « ℹ️ Passage » et rouge recalculés pour toute l'offre,
    //    avec les mêmes règles que l'application (la 1re occurrence reste propre).
    recalculerMarquages_(feuille);
  } finally {
    if (verrou) libererVerrou_(lock);
  }
  if (refus.length) {
    SpreadsheetApp.getUi().alert(
      "🛑 SAISIE REFUSÉE",
      "Mode BLOQUANT actif :\nCe doublon ou cette usurpation est strictement interdit(e).\n\nModification annulée : " +
        refus.join(", ") +
        ".",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

// Horodatage + mise en forme (majuscules, texte, virgule) d'une ligne modifiée à la main.
// valeur : ce qui a été tapé (cellule seule) — permet de rétablir un N° « 0123 » que
// Sheets a déjà converti en 123 ; undefined pour un collage (valeurs relues TELLES
// QU'AFFICHÉES : un N° pris pour une date ou un grand nombre reste lisible).
function preparerLigneEditee_(feuille, ligne, colEdit, nbCols, valeur, uneCellule) {
  // 1️⃣ HORODATAGE AUTOMATIQUE
  const celluleDate = feuille.getRange(ligne, COL.DATE);
  if (celluleDate.isBlank() && colEdit + nbCols - 1 > COL.DATE) {
    const rempli = uneCellule
      ? !!valeur
      : feuille
          .getRange(ligne, COL.NOM, 1, NB_COLONNES_SAISIE)
          .getValues()[0]
          .some(function (v) {
            return v !== "" && v !== null;
          });
    if (rempli && (colEdit > COL.DATE || !uneCellule)) celluleDate.setValue(new Date());
  }
  // 2️⃣ FORMATAGE AUTOMATIQUE (Majuscules, virgules)
  for (let c = Math.max(colEdit, COL.NOM); c <= Math.min(colEdit + nbCols - 1, COL.MONTANT); c++) {
    let v = uneCellule ? valeur : feuille.getRange(ligne, c).getValue();
    if (!uneCellule && c <= COL.PIECE && (v instanceof Date || typeof v === "number"))
      v = feuille.getRange(ligne, c).getDisplayValue();
    if (v === undefined || v === null || v === "" || v instanceof Date) continue;
    if (c <= COL.PIECE) {
      // en texte : Sheets a déjà converti la frappe (ex. N° "0123" -> 123), on rétablit la valeur
      feuille.getRange(ligne, c).setValue(texte_(v.toString().toUpperCase().trim()));
    } else if (v.toString().indexOf(".") !== -1 && typeof v === "string") {
      feuille.getRange(ligne, c).setValue(v.toString().replace(".", ","));
    }
  }
}

// Mode BLOQUANT : la ligne modifiée à la main double-t-elle une AUTRE ligne (A) ou
// usurpe-t-elle une pièce (B) ? Si oui, la modification est annulée — ancienne valeur
// remise pour une cellule seule, cellules vidées pour un collage — et le cas est
// renvoyé (pour l'alerte) ; sinon null. Le marquage est fait ensuite pour toute
// l'offre par recalculerMarquages_.
function controlerLigneEditee_(feuille, ligneEdit, plageAnnulee, ancienneValeur, colEdit) {
  const rowData = feuille.getRange(ligneEdit, 1, 1, NB_COLONNES).getValues()[0];
  if (!_normId_(rowData[IDX.NOM]) && !_normPiece_(rowData[IDX.PIECE])) return null;
  const det = detecterDoublons_(
    feuille,
    rowData[IDX.NOM],
    rowData[IDX.PRENOM],
    rowData[IDX.PIECE],
    ligneEdit
  );
  if (det.pireCas !== "A" && det.pireCas !== "B") return null;
  if (ancienneValeur !== undefined && ancienneValeur !== null) {
    plageAnnulee.setValue(
      colEdit >= COL.NOM && colEdit <= COL.PIECE ? texte_(ancienneValeur.toString()) : ancienneValeur
    );
  } else {
    plageAnnulee.clearContent();
  }
  // Ligne redevenue vide (ex. nouvelle ligne refusée) : pas de date orpheline
  const reste = feuille.getRange(ligneEdit, COL.NOM, 1, NB_COLONNES_SAISIE).getValues()[0];
  if (
    reste.every(function (v) {
      return v === "" || v === null;
    })
  )
    feuille.getRange(ligneEdit, COL.DATE).clearContent();
  return det.pireCas;
}
