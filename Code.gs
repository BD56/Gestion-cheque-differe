function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Caisse - Saisie Chèques')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// =================================================================
// --- FONCTIONS PRINCIPALES AVEC LOCKSERVICE POUR ATOMICITÉ ---
// =================================================================

function traiterSaisie(nom, prenom, piece, montant, notes) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les race conditions

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feuille = ss.getSheetByName("Saisies");
    if (!feuille) return { status: "BLOQUE", titre: "Erreur Serveur", message: "La feuille 'Saisies' est introuvable." };

    var modeSecurite = feuille.getRange("Z1").getValue() || "SIGNALER";
    
    // Nettoyage standard pour l'affichage
    nom = nom.toString().toUpperCase().trim();
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim();
    notes = notes ? notes.toString().trim() : "";
    if (montant && typeof montant === 'string' && montant.includes('.')) montant = montant.replace('.', ',');
    
    // Nettoyage profond (sans espaces ni tirets) - UNE FOIS
    var nomNorm = nom.replace(/[\s-]/g, '');
    var prenomNorm = prenom.replace(/[\s-]/g, '');
    var pieceNorm = piece.replace(/[\s-]/g, '');
    
    var donnees = feuille.getDataRange().getValues();
    var pireCas = null; 
    var detailsDoublons = []; 
    
    // Optimisation: Ignorer les lignes vides
    for (var i = 1; i < donnees.length; i++) {
      var nomHisto = donnees[i][1] ? donnees[i][1].toString().toUpperCase().trim() : "";
      var prenomHisto = donnees[i][2] ? donnees[i][2].toString().toUpperCase().trim() : "";
      var pieceHisto = donnees[i][3] ? donnees[i][3].toString().toUpperCase().trim() : "";
      
      // Ignorer les lignes vides
      if (!nomHisto && !pieceHisto) continue;
      
      var montantHisto = donnees[i][4] ? donnees[i][4].toString() : "";
      var notesHisto = donnees[i][5] ? donnees[i][5].toString() : "";
      
      var nomHistoNorm = nomHisto.replace(/[\s-]/g, '');
      var prenomHistoNorm = prenomHisto.replace(/[\s-]/g, '');
      var pieceHistoNorm = pieceHisto.replace(/[\s-]/g, '');
      
      var estMemeIdentite = (nomNorm !== "" && prenomNorm !== "" && nomHistoNorm === nomNorm && prenomHistoNorm === prenomNorm);
      var estMemePiece = (pieceNorm !== "" && pieceHistoNorm === pieceNorm);
      
      if (estMemeIdentite || estMemePiece) {
        var typeCeDoublon = estMemeIdentite && estMemePiece ? 'A' 
                          : estMemePiece ? 'B' 
                          : 'C';
        
        // Si on trouve un Cas A, on peut arrêter la boucle (pire cas possible)
        if (typeCeDoublon === 'A') {
          pireCas = 'A';
          detailsDoublons.push({ 
            ligne: i + 1, 
            type: typeCeDoublon, 
            date: (donnees[i][0] instanceof Date) ? Utilities.formatDate(donnees[i][0], "Europe/Paris", "dd/MM/yyyy HH:mm") : donnees[i][0].toString(),
            nom: nomHisto, 
            prenom: prenomHisto, 
            piece: pieceHisto,
            montant: montantHisto,
            notes: notesHisto
          });
          break; // Sortir de la boucle immédiatement
        }
        
        if (typeCeDoublon === 'B' && pireCas !== 'A') pireCas = 'B';
        if (typeCeDoublon === 'C' && pireCas !== 'A' && pireCas !== 'B') pireCas = 'C';

        detailsDoublons.push({ 
          ligne: i + 1, 
          type: typeCeDoublon, 
          date: (donnees[i][0] instanceof Date) ? Utilities.formatDate(donnees[i][0], "Europe/Paris", "dd/MM/yyyy HH:mm") : donnees[i][0].toString(),
          nom: nomHisto, 
          prenom: prenomHisto, 
          piece: pieceHisto,
          montant: montantHisto,
          notes: notesHisto
        });
      }
    }
    
    if (pireCas) {
      var isBloque = false;
      var msgTitre = "";
      var msgAlerte = "";
      var couleur = "ROUGE";
      
      if (modeSecurite === "BLOQUANT") {
        if (pireCas === 'A') {
          isBloque = true; msgTitre = "🛑 SAISIE REFUSÉE"; msgAlerte = "Ce client a déjà profité de l'offre.";
        } else if (pireCas === 'B') {
          isBloque = true; msgTitre = "🛑 SAISIE REFUSÉE"; msgAlerte = "Ce numéro de pièce d'identité est déjà associé à un autre client.";
        } else if (pireCas === 'C') {
          isBloque = false; couleur = "ORANGE"; msgTitre = "⚠️ HOMONYME DÉTECTÉ"; 
          msgAlerte = "Un client porte ce nom avec une autre pièce. Demandez une 2ème pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente avant de forcer l'ajout.";
        }
      } else {
        if (pireCas === 'A') {
          msgTitre = "🛑 ALERTE FRAUDE"; msgAlerte = "Ce client a déjà été enregistré avec ce numéro de pièce d'identité.";
        } else if (pireCas === 'B') {
          msgTitre = "🛑 ANOMALIE GRAVE"; msgAlerte = "Ce numéro de pièce d'identité est déjà utilisé dans la base sous un autre nom !";
        } else if (pireCas === 'C') {
          couleur = "ORANGE"; msgTitre = "⚠️ HOMONYME DÉTECTÉ"; 
          msgAlerte = "Un client porte ce nom avec une autre pièce. Demandez une 2ème pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente avant de forcer l'ajout.";
        }
      }

      var notePourSheet = "⚠️ Ajout forcé (Cas " + pireCas + ")";

      if (isBloque) {
        return { status: "BLOQUE", titre: msgTitre, message: msgAlerte, details: detailsDoublons };
      } else {
        return { status: "CONFIRMATION", titre: msgTitre, message: msgAlerte, couleur: couleur, details: detailsDoublons, noteForce: notePourSheet, flags: { identite: (pireCas==='A'||pireCas==='C'), piece: (pireCas==='A'||pireCas==='B') } };
      }
    } else {
      feuille.appendRow([new Date(), nom, prenom, piece, montant, notes, ""]);
      majAnnuaire_(nom, prenom, piece);
      return { status: "SUCCES", message: "✅ Saisie enregistrée !" };
    }
  } finally {
    lock.releaseLock(); // Libérer le verrou dans tous les cas
  }
}

function forcerSaisie(nom, prenom, piece, montant, notes, messageErreur, flagIdentite, flagPiece) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les doublons forcés

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feuille = ss.getSheetByName("Saisies");
    
    nom = nom.toString().toUpperCase().trim(); 
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim(); 
    notes = notes ? notes.toString().trim() : "";
    if (montant && typeof montant === 'string' && montant.includes('.')) montant = montant.replace('.', ',');
    
    var noteFinale = notes;
    if (messageErreur !== "") {
      if (notes !== "") {
        noteFinale = notes + "\n" + messageErreur;
      } else {
        noteFinale = messageErreur;
      }
    }
    
    feuille.appendRow([new Date(), nom, prenom, piece, montant, noteFinale, ""]);
    var indexLigne = feuille.getLastRow();
    
    // 🧹 LE CORRECTIF : On efface l'héritage automatique de Google Sheets sur les 7 colonnes
    feuille.getRange(indexLigne, 1, 1, 7).setBackground(null);
    
    // 🎨 On applique tes vraies couleurs
    feuille.getRange(indexLigne, 6).setBackground("#f4cccc");
    if (flagIdentite) feuille.getRange(indexLigne, 2, 1, 2).setBackground("#f4cccc");
    if (flagPiece) feuille.getRange(indexLigne, 4).setBackground("#f4cccc");

    majAnnuaire_(nom, prenom, piece);
    return { status: "SUCCES", message: "⚠️ Saisie forcée et enregistrée en rouge." };
  } finally {
    lock.releaseLock(); // Libérer le verrou dans tous les cas
  }
}

// =================================================================
// --- VÉRIFICATION IMMÉDIATE DU N° DE PIÈCE (Niveau 2, lecture seule) ---
//     Pré-avertissement au blur du champ N° : ce numéro est-il déjà sur
//     l'offre en cours ? Ne bloque rien, ne réécrit rien, ne décide rien
//     (la décision A/B/C reste à traiterSaisie, à la validation).
// =================================================================
function verifierPiece(piece) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = ss.getSheetByName("Saisies");
  if (!feuille) return { trouve: false };

  var mode = feuille.getRange("Z1").getValue() || "SIGNALER";
  var pieceNorm = piece ? piece.toString().toUpperCase().replace(/[\s-]/g, '') : "";
  if (pieceNorm === "") return { trouve: false, mode: mode };

  var donnees = feuille.getDataRange().getValues();
  var matches = [];
  for (var i = 1; i < donnees.length; i++) {
    var pieceHisto = donnees[i][3] ? donnees[i][3].toString().toUpperCase().replace(/[\s-]/g, '') : "";
    if (pieceHisto !== "" && pieceHisto === pieceNorm) {
      matches.push({
        ligne: i + 1,
        date: (donnees[i][0] instanceof Date) ? Utilities.formatDate(donnees[i][0], "Europe/Paris", "dd/MM/yyyy HH:mm") : (donnees[i][0] ? donnees[i][0].toString() : ""),
        nom: donnees[i][1] ? donnees[i][1].toString() : "",
        prenom: donnees[i][2] ? donnees[i][2].toString() : "",
        montant: donnees[i][4] ? donnees[i][4].toString() : ""
      });
    }
  }
  var result = { trouve: matches.length > 0, mode: mode, matches: matches };
  // Niveau 3 : si la pièce n'est PAS sur l'offre en cours, on regarde l'annuaire.
  if (ANNUAIRE_ACTIF && matches.length === 0) {
    var connu = chercherAnnuaire_(pieceNorm);
    if (connu) { result.annuaire = connu; result.modeAnnuaire = getModeAnnuaire(); }
  }
  return result;
}

// =================================================================
// --- ANNUAIRE INTER-OFFRES (Niveau 3) — DORMANT (ANNUAIRE_ACTIF=false) ---
//     Index pièce -> Nom/Prénom des offres passées, pour pré-remplir la saisie.
//     Tant que dormant : rien n'est écrit, lu ni affiché. Réactivable en
//     passant ANNUAIRE_ACTIF à true (après feu vert direction / RGPD).
//     Store NON autoritaire : la décision A/B/C reste sur « Saisies ».
// =================================================================
var ANNUAIRE_ACTIF = false;
var ANNUAIRE_RETENTION_ANS = 3;   // purge après X ans d'inactivité (dernière vue)
var ANNUAIRE_FEUILLE = "_Annuaire";

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

function _normPiece_(p) {
  return p ? p.toString().toUpperCase().replace(/[\s-]/g, '') : "";
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
      f.getRange(i + 1, 1, 1, 4).setValues([[pieceNorm, nom, prenom, new Date()]]);
      return;
    }
  }
  f.appendRow([pieceNorm, nom, prenom, new Date()]);
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
function basculerModeAnnuaire() {
  var m = (getModeAnnuaire() === 'C') ? 'B' : 'C';
  PropertiesService.getDocumentProperties().setProperty('MODE_ANNUAIRE', m);
  return m;
}

// Reconstruit l'annuaire depuis « Saisies » + toutes les feuilles Archives_*
// (manuel, à lancer une fois avant activation). Garde la dernière occurrence.
function reconstruireAnnuaire() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = _feuilleAnnuaire_();
  f.clearContents();
  f.appendRow(["Piece", "Nom", "Prenom", "DerniereVue"]);
  var index = {};
  var feuilles = ss.getSheets();
  for (var s = 0; s < feuilles.length; s++) {
    var nomF = feuilles[s].getName();
    if (nomF !== "Saisies" && nomF.indexOf("Archives_") !== 0) continue;
    var data = feuilles[s].getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var pieceNorm = _normPiece_(data[i][3]);
      if (pieceNorm === "") continue;
      var d = (data[i][0] instanceof Date) ? data[i][0] : new Date(0);
      if (!index[pieceNorm] || d > index[pieceNorm].date) {
        index[pieceNorm] = { nom: data[i][1], prenom: data[i][2], date: d };
      }
    }
  }
  var rows = [];
  for (var p in index) rows.push([p, index[p].nom, index[p].prenom, index[p].date]);
  if (rows.length) f.getRange(2, 1, rows.length, 4).setValues(rows);
  return "Annuaire reconstruit : " + rows.length + " pièces.";
}

// Purge des entrées inactives depuis ANNUAIRE_RETENTION_ANS ans (à mettre sur trigger).
function purgerAnnuaire() {
  if (!ANNUAIRE_ACTIF) return;
  var f = _feuilleAnnuaire_();
  var data = f.getDataRange().getValues();
  var limite = new Date();
  limite.setFullYear(limite.getFullYear() - ANNUAIRE_RETENTION_ANS);
  for (var i = data.length - 1; i >= 1; i--) {
    var d = (data[i][3] instanceof Date) ? data[i][3] : null;
    if (!d || d < limite) f.deleteRow(i + 1);
  }
}

// --- FONCTIONS SECONDAIRES ---
function getInfosPanneau() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName("Saisies");
  var mode = f.getRange("Z1").getValue() || "SIGNALER";
  return { success: true, mode: mode, urlFichier: ss.getUrl(), annuaireActif: ANNUAIRE_ACTIF, modeAnnuaire: getModeAnnuaire() };
}

function genererDonneesImpression(type, dateChoisieStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = (type === 'jour') ? ss.getSheetByName("A_IMPRIMER") : ss.getSheetByName("OFFRE_COMPLETE");
  if (!feuille) return [];
  if (type === 'jour') {
    if (dateChoisieStr === "aujourdhui") feuille.getRange("Z1").clearContent();
    else feuille.getRange("Z1").setValue("'" + dateChoisieStr);
    SpreadsheetApp.flush(); Utilities.sleep(500); 
  }
  var dl = feuille.getLastRow();
  return (dl < 1) ? [] : feuille.getRange(1, 1, dl, 6).getDisplayValues();
}

function basculerModeWebApp() {
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies");
  var modeActuel = feuille.getRange("Z1").getValue() || "SIGNALER";
  var nouveauMode = (modeActuel === "SIGNALER") ? "BLOQUANT" : "SIGNALER";
  feuille.getRange("Z1").setValue(nouveauMode); return nouveauMode;
}

function archiverOffreWebApp() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuilleSaisies = ss.getSheetByName("Saisies");
  var dateFin = Utilities.formatDate(new Date(), "Europe/Paris", "dd-MM-yyyy_HH-mm");
  
  var archive = ss.insertSheet('Archives_' + dateFin, ss.getNumSheets());
  feuilleSaisies.getDataRange().copyTo(archive.getRange(1, 1));
  archive.setFrozenRows(1);
  
  var derniereLigne = feuilleSaisies.getLastRow();
  if (derniereLigne > 1) feuilleSaisies.getRange(2, 1, derniereLigne - 1, 7).clearContent().setBackground(null);
  
  feuilleSaisies.getRange("Z1").setValue("SIGNALER");
  
  // 🧹 NOUVEAU : On efface les dates en mémoire pour verrouiller les tablettes
  setDatesOperation("", "");

  return "✅ L'offre a été clôturée et archivée avec succès !";
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 APPLICATION')
    .addItem('⚙️ Ouvrir le panneau de contrôle', 'afficherPanneau')
    .addToUi();
  afficherPanneau(); 
}

function afficherPanneau() {
  var html = HtmlService.createHtmlOutputFromFile('Panneau').setTitle('⚙️ Contrôle').setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function allerVersImpression(dateChoisieStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName("A_IMPRIMER");
  if (!f) return;
  if (dateChoisieStr === "aujourdhui") f.getRange("Z1").clearContent();
  else f.getRange("Z1").setValue("'" + dateChoisieStr);
  SpreadsheetApp.flush(); ss.setActiveSheet(f);
}

function allerVersOffre() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName("OFFRE_COMPLETE");
  if (f) ss.setActiveSheet(f);
}

// =================================================================
// --- CERVEAU INTERNE DU GOOGLE SHEETS (SUR MODIFICATION MANUELLE) ---
// =================================================================
function onEdit(e) {
  if (!e || !e.range) return;
  var feuille = e.range.getSheet();
  
  // On ne déclenche la magie que sur la bonne feuille
  if (feuille.getName() !== "Saisies") return;
  
  var ligneEdit = e.range.getRow();
  var colEdit = e.range.getColumn();
  
  // On ignore la ligne 1 (en-têtes) et on s'arrête à la colonne F
  if (ligneEdit < 2 || colEdit > 6) return;
  
  // 1️⃣ HORODATAGE AUTOMATIQUE
  var celluleDate = feuille.getRange(ligneEdit, 1);
  if (celluleDate.isBlank() && e.value && colEdit > 1) {
    celluleDate.setValue(new Date());
  }
  
  // 2️⃣ FORMATAGE AUTOMATIQUE (Majuscules, virgules)
  if (colEdit >= 2 && colEdit <= 4 && e.value) {
    feuille.getRange(ligneEdit, colEdit).setValue(e.value.toString().toUpperCase().trim());
  }
  if (colEdit === 5 && e.value && e.value.toString().includes('.')) {
    feuille.getRange(ligneEdit, colEdit).setValue(e.value.toString().replace('.', ','));
  }

  // On laisse un instant au tableur pour s'actualiser
  Utilities.sleep(500);
  
  var modeSecurite = feuille.getRange("Z1").getValue() || "SIGNALER";
  var donnees = feuille.getDataRange().getValues();
  var rowData = donnees[ligneEdit - 1]; 
  
  var nom = rowData[1] ? rowData[1].toString().toUpperCase().replace(/[\s-]/g, '') : "";
  var prenom = rowData[2] ? rowData[2].toString().toUpperCase().replace(/[\s-]/g, '') : "";
  var piece = rowData[3] ? rowData[3].toString().toUpperCase().replace(/[\s-]/g, '') : "";
  var montant = rowData[4] ? rowData[4].toString() : "";
  var notes = rowData[5] ? rowData[5].toString() : "";
  
  var rangeLigne = feuille.getRange(ligneEdit, 1, 1, 7);
  var rangeID = feuille.getRange(ligneEdit, 2, 1, 2);
  var rangePiece = feuille.getRange(ligneEdit, 4);
  var rangeNotes = feuille.getRange(ligneEdit, 6);
  
  // 🧹 NETTOYEUR : On extrait la note de l'hôtesse sans l'alerte système
  var notePropre = notes.replace(/(?:\n|\|)?\s*⚠️ Ajout forcé \(Cas [ABC]\)/g, '').trim();
  
  // Si la ligne a été effacée ou ne contient plus assez d'infos pour faire un doublon
  if (nom === "" && prenom === "" && piece === "") {
    rangeLigne.setBackground(null);
    if (notes !== notePropre) rangeNotes.setValue(notePropre); // Restaure la note sans l'alerte
    
    // 🧹 NOUVEAU CORRECTIF : Si la ligne est complètement vidée, on efface aussi la date !
    if (montant === "" && notePropre === "") {
      feuille.getRange(ligneEdit, 1).clearContent();
    }
    return;
  }
  
  var pireCas = null;
  
  // 3️⃣ RECHERCHE DE DOUBLON SUR TOUTE LA BASE
  for (var i = 1; i < donnees.length; i++) {
    if (i === (ligneEdit - 1)) continue; // Ne se compare pas à soi-même
    
    var nomHisto = donnees[i][1] ? donnees[i][1].toString().toUpperCase().replace(/[\s-]/g, '') : "";
    var prenomHisto = donnees[i][2] ? donnees[i][2].toString().toUpperCase().replace(/[\s-]/g, '') : "";
    var pieceHisto = donnees[i][3] ? donnees[i][3].toString().toUpperCase().replace(/[\s-]/g, '') : "";
    
    var matchID = (nom !== "" && prenom !== "" && nomHisto === nom && prenomHisto === prenom);
    var matchPiece = (piece !== "" && pieceHisto === piece);
    
    if (matchID || matchPiece) {
      var typeCeDoublon = '';
      if (matchID && matchPiece) typeCeDoublon = 'A';
      else if (!matchID && matchPiece) typeCeDoublon = 'B';
      else if (matchID && !matchPiece) typeCeDoublon = 'C';
      
      if (typeCeDoublon === 'A') pireCas = 'A';
      if (typeCeDoublon === 'B' && pireCas !== 'A') pireCas = 'B';
      if (typeCeDoublon === 'C' && pireCas !== 'A' && pireCas !== 'B') pireCas = 'C';
    }
  }
  
  // 4️⃣ APPLICATION DES RÈGLES SELON LE MODE
  if (pireCas) {
    
    // 🛑 LE VIGILE : Mode BLOQUANT + Fraude grave (A ou B)
    if (modeSecurite === "BLOQUANT" && (pireCas === 'A' || pireCas === 'B')) {
      SpreadsheetApp.getUi().alert(
        "🛑 SAISIE REFUSÉE",
        "Mode BLOQUANT actif :\nCe doublon ou cette usurpation (Cas " + pireCas + ") est strictement interdit(e).\n\nVotre modification va être annulée.",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      e.range.clearContent(); // Annule la frappe
      rangeLigne.setBackground(null); // Nettoie le rouge s'il y en avait
      if (notes !== notePropre) rangeNotes.setValue(notePropre);
      return;
    }

    // 🟠 MODE SIGNALER (ou Cas C autorisé)
    rangeLigne.setBackground(null); // Reset pour éviter les bavures
    rangeNotes.setBackground("#f4cccc");
    if (pireCas === 'A' || pireCas === 'C') rangeID.setBackground("#f4cccc");
    if (pireCas === 'A' || pireCas === 'B') rangePiece.setBackground("#f4cccc");
    
    // Ajout de la note sans l'écraser
    var alerteTexte = "⚠️ Ajout forcé (Cas " + pireCas + ")";
    var noteFinale = (notePropre === "") ? alerteTexte : notePropre + "\n" + alerteTexte;
    if (notes !== noteFinale) rangeNotes.setValue(noteFinale);

  } else {
    // 🟢 AUCUN DOUBLON (ou vous venez de le corriger)
    rangeLigne.setBackground(null);
    if (notes !== notePropre) rangeNotes.setValue(notePropre);
  }
}


// =================================================================
// --- ROBOT DE NUIT : CLÔTURE AUTOMATIQUE ---
// =================================================================

function verificationClotureNocturne() {
  var dates = getDatesOperation();
  
  // S'il n'y a pas de date de fin enregistrée, le robot se rendort
  if (!dates.fin || dates.fin === "") {
    return; 
  }
  
  var dateFinObj = new Date(dates.fin);
  var dateJour = new Date();
  
  // On compare les jours (sans prendre en compte l'heure exacte)
  dateFinObj.setHours(0,0,0,0);
  dateJour.setHours(0,0,0,0);
  
  // Si la date d'aujourd'hui est STRICTEMENT supérieure à la date de fin
  // Ça veut dire que l'offre s'est terminée hier. On archive !
  if (dateJour > dateFinObj) {
    // On appelle ta fonction d'archivage existante
    archiverOffreWebApp(); 
    
    // On efface les dates en mémoire pour verrouiller la tablette le matin
    setDatesOperation("", ""); 
  }
}

// =================================================================
// --- GESTION DES DATES DE L'OPÉRATION (MÉMOIRE SECRÈTE) ---
// =================================================================

function getDatesOperation() {
  var memoire = PropertiesService.getDocumentProperties();
  return {
    debut: memoire.getProperty('DATE_DEBUT') || '',
    fin: memoire.getProperty('DATE_FIN') || ''
  };
}

function setDatesOperation(dateDebut, dateFin) {
  var memoire = PropertiesService.getDocumentProperties();
  memoire.setProperty('DATE_DEBUT', dateDebut);
  memoire.setProperty('DATE_FIN', dateFin);

  return "Dates enregistrées avec succès !";
}
