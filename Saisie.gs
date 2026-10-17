// Saisie d'un client (tablette), forçage, vérification du N°, correction et
// suppression d'une saisie, changement de mode.

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Saisie_() {
  return "2026.10.18-0103";
}

// =================================================================
// --- SAISIE ET FORÇAGE (sous verrou : une saisie à la fois) ---
// =================================================================

function traiterSaisie(nom, prenom, piece, montant, notes, cle) {
  exigerSession_(cle);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les race conditions

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const feuille = ss.getSheetByName(FEUILLE_SAISIES);
    if (!feuille)
      return {
        status: "BLOQUE",
        titre: "Erreur Serveur",
        message: "La feuille '" + FEUILLE_SAISIES + "' est introuvable.",
      };

    const horsPeriode = controlerPeriode_();
    if (horsPeriode) return horsPeriode;
    const incomplet = controlerChamps_(nom, prenom, piece, montant);
    if (incomplet) return incomplet;

    const modeSecurite = modeSecurite_(feuille);

    // Nettoyage standard pour l'affichage
    nom = nom.toString().toUpperCase().trim();
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim();
    notes = notes ? notes.toString().replace(NOTES_SYSTEME_REGEX, "").trim() : "";
    if (montant && typeof montant === "string" && montant.includes(".")) montant = montant.replace(".", ",");

    // Détection A/B/C : même fonction que forcerSaisie / corrections / onEdit
    const det = detecterDoublons_(feuille, nom, prenom, piece, 0);
    const pireCas = det.pireCas;
    const detailsDoublons = det.details;
    const passagesClient = det.passages; // passages déjà enregistrés pour CE client (même nom + même pièce)

    const passagesMax = passagesMax_();
    const limiteTxt =
      passagesMax > 1
        ? " (déjà " + passagesClient + " passage(s) ; maximum " + passagesMax + " par client)"
        : "";

    if (pireCas) {
      let isBloque = false;
      let msgTitre = "";
      let msgAlerte = "";
      let couleur = "ROUGE";

      if (modeSecurite === "BLOQUANT") {
        if (pireCas === "A") {
          isBloque = true;
          msgTitre = "🛑 SAISIE REFUSÉE";
          msgAlerte = "Ce client a déjà profité de l'offre." + limiteTxt;
        } else if (pireCas === "B") {
          isBloque = true;
          msgTitre = "🛑 SAISIE REFUSÉE";
          msgAlerte = "Ce numéro de pièce d'identité est déjà associé à un autre client.";
        } else if (pireCas === "C") {
          isBloque = false;
          couleur = "ORANGE";
          msgTitre = "⚠️ HOMONYME DÉTECTÉ";
          msgAlerte =
            "Un client porte ce nom avec une autre pièce. Demandez une 2e pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente avant de forcer l'ajout.";
        }
      } else {
        if (pireCas === "A") {
          msgTitre = "🛑 ALERTE FRAUDE";
          msgAlerte = "Ce client a déjà été enregistré avec ce numéro de pièce d'identité." + limiteTxt;
        } else if (pireCas === "B") {
          msgTitre = "🛑 ANOMALIE GRAVE";
          msgAlerte = "Ce numéro de pièce d'identité est déjà utilisé dans la base sous un autre nom !";
        } else if (pireCas === "C") {
          couleur = "ORANGE";
          msgTitre = "⚠️ HOMONYME DÉTECTÉ";
          msgAlerte =
            "Un client porte ce nom avec une autre pièce. Demandez une 2e pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente avant de forcer l'ajout.";
        }
      }

      const notePourSheet = "⚠️ Ajout forcé (Cas " + pireCas + ")";

      if (isBloque) {
        return {
          status: "BLOQUE",
          cas: pireCas,
          titre: msgTitre,
          message: msgAlerte,
          details: detailsDoublons,
        };
      } else {
        return {
          status: "CONFIRMATION",
          cas: pireCas,
          titre: msgTitre,
          message: msgAlerte,
          couleur: couleur,
          details: detailsDoublons,
          noteForce: notePourSheet,
          flags: { identite: pireCas === "A" || pireCas === "C", piece: pireCas === "A" || pireCas === "B" },
        };
      }
    } else {
      // Passage supplémentaire autorisé : trace dans les notes (« ℹ️ Passage 2/3 »), sans rouge
      if (passagesClient > 0) notes = ajouterNote_(notes, notePassage_(passagesClient + 1, passagesMax));
      feuille.appendRow([
        new Date(),
        texte_(nom),
        texte_(prenom),
        texte_(piece),
        montantSur_(montant),
        texte_(notes),
        "",
      ]);
      // pas de rouge hérité de la ligne du dessus (mise en forme automatique de Sheets)
      feuille.getRange(feuille.getLastRow(), 1, 1, NB_COLONNES_LIGNE).setBackground(null);
      majAnnuaire_(nom, prenom, piece);
      return {
        status: "SUCCES",
        passage: passagesClient + 1,
        passagesMax: passagesMax,
        message:
          passagesClient > 0
            ? "✅ Saisie enregistrée ! (passage " + (passagesClient + 1) + "/" + passagesMax + ")"
            : "✅ Saisie enregistrée !",
      };
    }
  } finally {
    libererVerrou_(lock); // écritures envoyées, puis verrou libéré (dans tous les cas)
  }
}

// Une saisie n'est acceptée que PENDANT l'offre (dates de l'opération, heure de Paris).
// Sinon (tablette restée ouverte après la clôture, appel direct…) -> refus, rien d'écrit.
// Renvoie null si la saisie est permise, sinon la réponse de refus.
function controlerPeriode_() {
  const dates = lireDates_();
  const refus = function (msg) {
    return { status: "BLOQUE", horsPeriode: true, titre: "🛑 HORS PÉRIODE", message: msg, details: [] };
  };
  if (!dates.debut || !dates.fin) return refus("Aucune opération en cours : saisie impossible.");
  const auj = Utilities.formatDate(new Date(), fuseau_(), "yyyy-MM-dd");
  const jjmm = function (iso) {
    const p = iso.split("-");
    return p.length === 3 ? p[2] + "/" + p[1] : iso;
  };
  if (auj < dates.debut)
    return refus("L'opération n'a pas encore commencé (début le " + jjmm(dates.debut) + ").");
  if (auj > dates.fin) return refus("L'opération est terminée (fin le " + jjmm(dates.fin) + ").");
  return null;
}

// Champs obligatoires (la tablette les vérifie déjà ; ceci couvre un appel direct).
// Renvoie null si complet, sinon la réponse de refus.
function controlerChamps_(nom, prenom, piece, montant) {
  // « vide » = rien de comparable (ex. un N° fait seulement de tirets, un nom « . ») :
  // une telle saisie ne pourrait jamais être reconnue comme doublon.
  const vide = function (v) {
    return v === null || v === undefined || v.toString().trim() === "";
  };
  const manque = [];
  if (_normId_(nom) === "") manque.push("Nom");
  if (_normId_(prenom) === "") manque.push("Prénom");
  if (_normPiece_(piece) === "") manque.push("N° de pièce");
  if (vide(montant) && getConfig().MONTANT_OBLIGATOIRE !== "NON") manque.push(getConfig().LIBELLE_MONTANT);
  if (!manque.length) return null;
  return {
    status: "BLOQUE",
    titre: "🛑 SAISIE INCOMPLÈTE",
    message: "Champ(s) manquant(s) : " + manque.join(", ") + ".",
    details: [],
  };
}

// Ajout forcé (après confirmation d'un doublon à l'écran). Le serveur REFAIT la
// détection A/B/C sous verrou, sans se fier à la tablette :
//  - mode BLOQUANT + cas A/B -> refus (rien n'est écrit) ;
//  - sinon écriture, avec note d'alerte et couleurs CALCULÉES ICI (le cas réel,
//    pas celui vu par la tablette) ; plus de doublon -> ligne normale.
// messageErreur / flagIdentite / flagPiece : ignorés (gardés pour la
// compatibilité d'appel avec Index.html).
function forcerSaisie(nom, prenom, piece, montant, notes, messageErreur, flagIdentite, flagPiece, cle) {
  exigerSession_(cle);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les doublons forcés

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const feuille = ss.getSheetByName(FEUILLE_SAISIES);
    if (!feuille)
      return {
        status: "BLOQUE",
        titre: "Erreur Serveur",
        message: "La feuille '" + FEUILLE_SAISIES + "' est introuvable.",
      };
    const horsPeriode = controlerPeriode_();
    if (horsPeriode) return horsPeriode;
    const incomplet = controlerChamps_(nom, prenom, piece, montant);
    if (incomplet) return incomplet;

    nom = nom.toString().toUpperCase().trim();
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim();
    notes = notes ? notes.toString().replace(NOTES_SYSTEME_REGEX, "").trim() : "";
    if (montant && typeof montant === "string" && montant.includes(".")) montant = montant.replace(".", ",");

    const modeSecurite = modeSecurite_(feuille);
    const det = detecterDoublons_(feuille, nom, prenom, piece, 0);
    const pireCas = det.pireCas;

    // 🛑 Mode BLOQUANT : un vrai doublon (A) ou une usurpation (B) ne se force jamais
    if (modeSecurite === "BLOQUANT" && (pireCas === "A" || pireCas === "B")) {
      return {
        status: "BLOQUE",
        cas: pireCas,
        titre: "🛑 SAISIE REFUSÉE",
        message:
          pireCas === "A"
            ? "Ce client a déjà profité de l'offre."
            : "Ce numéro de pièce d'identité est déjà associé à un autre client.",
        details: det.details,
      };
    }

    let noteFinale = notes;
    if (pireCas) noteFinale = ajouterNote_(notes, "⚠️ Ajout forcé (Cas " + pireCas + ")");
    else if (det.passages > 0)
      noteFinale = ajouterNote_(notes, notePassage_(det.passages + 1, passagesMax_()));

    feuille.appendRow([
      new Date(),
      texte_(nom),
      texte_(prenom),
      texte_(piece),
      montantSur_(montant),
      texte_(noteFinale),
      "",
    ]);
    const indexLigne = feuille.getLastRow();

    // Pas de couleur héritée de la ligne du dessus (mise en forme automatique de Sheets)
    feuille.getRange(indexLigne, 1, 1, NB_COLONNES_LIGNE).setBackground(null);

    // 🎨 Couleurs selon le cas RÉEL (mêmes règles que onEdit)
    if (pireCas) {
      feuille.getRange(indexLigne, COL.NOTES).setBackground("#f4cccc");
      if (pireCas === "A" || pireCas === "C")
        feuille.getRange(indexLigne, COL.NOM, 1, 2).setBackground("#f4cccc"); // nom + prénom
      if (pireCas === "A" || pireCas === "B")
        feuille.getRange(indexLigne, COL.PIECE).setBackground("#f4cccc");
    }

    // Usurpation : la pièce figure déjà sous un AUTRE nom (même si le pire cas est A,
    // ex. l'usurpateur qui revient) -> on ne remplace pas le nom du titulaire
    if (!aUneUsurpation_(det)) majAnnuaire_(nom, prenom, piece);
    if (pireCas)
      journaliser_(
        quiSession_(cle),
        "Ajout forcé (cas " + pireCas + ")",
        nom + " " + prenom + " · pièce " + piece + " · " + (montant || "sans montant")
      );
    return {
      status: "SUCCES",
      cas: pireCas,
      message: pireCas ? "⚠️ Saisie forcée et enregistrée en rouge." : "✅ Saisie enregistrée !",
    };
  } finally {
    libererVerrou_(lock); // écritures envoyées, puis verrou libéré (dans tous les cas)
  }
}

// =================================================================
// --- VÉRIFICATION IMMÉDIATE DU N° DE PIÈCE (Niveau 2, lecture seule) ---
//     Pré-avertissement au blur du champ N° : ce numéro est-il déjà sur
//     l'offre en cours ? Ne bloque rien, ne réécrit rien, ne décide rien
//     (la décision A/B/C reste à traiterSaisie, à la validation).
// =================================================================
function verifierPiece(piece, cle) {
  exigerSession_(cle);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(FEUILLE_SAISIES);
  if (!feuille) return { trouve: false };

  const mode = feuille.getRange(CELLULE_MODE).getValue() || "SIGNALER";
  const pieceNorm = _normPiece_(piece);
  if (pieceNorm === "") return { trouve: false, mode: mode };

  const donnees = feuille.getDataRange().getValues();
  const matches = [];
  for (let i = 1; i < donnees.length; i++) {
    const pieceHisto = _normPiece_(donnees[i][IDX.PIECE]);
    if (pieceHisto !== "" && pieceHisto === pieceNorm) {
      matches.push({
        ligne: i + 1,
        date:
          donnees[i][IDX.DATE] instanceof Date
            ? Utilities.formatDate(donnees[i][IDX.DATE], fuseau_(), "dd/MM/yyyy HH:mm")
            : donnees[i][IDX.DATE]
              ? donnees[i][IDX.DATE].toString()
              : "",
        nom: donnees[i][IDX.NOM] ? donnees[i][IDX.NOM].toString() : "",
        prenom: donnees[i][IDX.PRENOM] ? donnees[i][IDX.PRENOM].toString() : "",
        montant: donnees[i][IDX.MONTANT] ? donnees[i][IDX.MONTANT].toString() : "",
      });
    }
  }
  const result = { trouve: matches.length > 0, mode: mode, matches: matches };
  // Niveau 3 : si la pièce n'est PAS sur l'offre en cours, on regarde l'annuaire.
  if (ANNUAIRE_ACTIF && matches.length === 0) {
    const connu = chercherAnnuaire_(pieceNorm);
    if (connu) {
      result.annuaire = connu;
      result.modeAnnuaire = getModeAnnuaire();
    }
  }
  return result;
}

// =================================================================
// --- CORRECTION / SUPPRESSION D'UNE SAISIE (espace responsable) ---
//     Remplace l'édition manuelle du Sheet. Mêmes règles que onEdit : la
//     ligne corrigée est RECONTRÔLÉE (A/B/C) contre toutes les autres lignes
//     de « Saisies », sous verrou. Mode BLOQUANT : A et B refusés. Sinon,
//     doublon -> confirmation explicite, puis marquage rouge + note d'alerte.
//     Garde-fou : la ligne doit encore contenir ce que l'écran affichait
//     (sinon refus : la feuille a bougé entre-temps).
// =================================================================
// Saisies de l'offre en cours, la plus récente d'abord.
function listerSaisies(jeton) {
  exigerAdmin_(jeton);
  return listeSaisies_();
}
function listeSaisies_() {
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  if (!feuille) return [];
  const derniere = feuille.getLastRow();
  if (derniere < 2) return [];
  const plage = feuille.getRange(2, 1, derniere - 1, NB_COLONNES);
  const valeurs = plage.getValues();
  const affichage = plage.getDisplayValues();
  const liste = [];
  for (let i = 0; i < valeurs.length; i++) {
    if (affichage[i].join("") === "") continue;
    const notes = valeurs[i][IDX.NOTES] ? valeurs[i][IDX.NOTES].toString() : "";
    liste.push({
      ligne: i + 2,
      date: affichage[i][IDX.DATE],
      nom: valeurs[i][IDX.NOM] ? valeurs[i][IDX.NOM].toString() : "",
      prenom: valeurs[i][IDX.PRENOM] ? valeurs[i][IDX.PRENOM].toString() : "",
      piece: valeurs[i][IDX.PIECE] ? valeurs[i][IDX.PIECE].toString() : "",
      montant: affichage[i][IDX.MONTANT],
      notes: notes.replace(NOTES_SYSTEME_REGEX, "").trim(),
      alerte: notes !== notes.replace(ALERTE_FORCE_REGEX, ""),
    });
  }
  return liste.reverse();
}

// Vue d'ensemble de l'espace responsable : chiffres de l'offre en cours, lus dans
// « Saisies » (source de vérité). Montant illisible : compté pour 0.
function chiffresOffre_(feuille) {
  const r = { saisies: 0, total: 0, forcees: 0, responsables: lirePersonnes_().length };
  if (!feuille || feuille.getLastRow() < 2) return r;
  const valeurs = feuille.getRange(2, 1, feuille.getLastRow() - 1, NB_COLONNES).getValues();
  valeurs.forEach(function (v) {
    if (v.join("") === "") return;
    r.saisies++;
    r.total += nombreMontant_(v[IDX.MONTANT]);
    const notes = v[IDX.NOTES] ? v[IDX.NOTES].toString() : "";
    if (notes !== notes.replace(ALERTE_FORCE_REGEX, "")) r.forcees++;
  });
  r.total = Math.round(r.total * 100) / 100;
  return r;
}
// 150 | "150,50 €" | "1 234,50" -> nombre ; illisible -> 0
function nombreMontant_(m) {
  if (typeof m === "number") return isFinite(m) ? m : 0;
  let t = (m || "").toString().replace(/[\s\u00a0\u202f€']/g, "");
  if (t.indexOf(",") !== -1 && t.indexOf(".") !== -1) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? parseFloat(t) : 0;
}

// La ligne contient-elle toujours ce que l'écran affichait ?
function verifierLigneAttendue_(feuille, ligne, attendu) {
  ligne = Number(ligne);
  if (!(ligne >= 2 && ligne <= feuille.getLastRow() && Math.floor(ligne) === ligne)) {
    throw new Error("Ligne introuvable : rechargez la liste.");
  }
  const v = feuille.getRange(ligne, COL.NOM, 1, 3).getValues()[0]; // nom, prénom, N°
  const a = attendu || {};
  if (
    (v[0] || "").toString() !== (a.nom || "") ||
    (v[1] || "").toString() !== (a.prenom || "") ||
    (v[2] || "").toString() !== (a.piece || "")
  ) {
    throw new Error("Cette ligne a changé entre-temps : rechargez la liste.");
  }
  return ligne;
}

// nouveau = { nom, prenom, piece, montant, notes } ; forcer = confirmer malgré un doublon.
function modifierSaisie(ligne, attendu, nouveau, forcer, jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
    if (!feuille) throw new Error("La feuille '" + FEUILLE_SAISIES + "' est introuvable.");
    ligne = verifierLigneAttendue_(feuille, ligne, attendu);

    const n = nouveau || {};
    const nom = (n.nom || "").toString().toUpperCase().trim();
    const prenom = (n.prenom || "").toString().toUpperCase().trim();
    const piece = (n.piece || "").toString().toUpperCase().trim();
    let montant = (n.montant || "").toString().trim();
    if (montant.indexOf(".") !== -1) montant = montant.replace(".", ",");
    const notesPropres = (n.notes || "").toString().replace(NOTES_SYSTEME_REGEX, "").trim();
    if (!_normId_(nom) || !_normId_(prenom) || !_normPiece_(piece))
      throw new Error("Le Nom, le Prénom et le N° de pièce sont obligatoires.");
    if (getConfig().MONTANT_OBLIGATOIRE !== "NON" && !montant) throw new Error("Le montant est obligatoire.");

    // Recontrôle A/B/C contre toutes les AUTRES lignes (comme onEdit)
    const det = detecterDoublons_(feuille, nom, prenom, piece, ligne);
    const pireCas = det.pireCas,
      details = det.details;

    const mode = modeSecurite_(feuille);
    if (pireCas) {
      const m = messagesDoublon_(mode, pireCas);
      if (m.bloque) return { status: "BLOQUE", titre: m.titre, message: m.message, details: details };
      if (!forcer)
        return {
          status: "CONFIRMATION",
          titre: m.titre,
          message: m.message,
          couleur: m.couleur,
          details: details,
        };
    }

    const avant = feuille.getRange(ligne, 1, 1, NB_COLONNES).getDisplayValues()[0];
    feuille
      .getRange(ligne, COL.NOM, 1, NB_COLONNES_SAISIE)
      .setValues([[texte_(nom), texte_(prenom), texte_(piece), montantSur_(montant), texte_(notesPropres)]]);
    // Journal : seulement les champs changés, avant → après
    const changes = [
      ["Nom", avant[IDX.NOM], nom],
      ["Prénom", avant[IDX.PRENOM], prenom],
      ["N° de pièce", avant[IDX.PIECE], piece],
      ["Montant", avant[IDX.MONTANT], montant],
      ["Notes", avant[IDX.NOTES].replace(NOTES_SYSTEME_REGEX, "").trim(), notesPropres],
    ]
      .filter(function (c) {
        return String(c[1]).trim() !== String(c[2]).trim();
      })
      .map(function (c) {
        return c[0] + " : « " + c[1] + " » → « " + c[2] + " »";
      });
    journaliser_(
      quiJeton_(jeton),
      "Correction d'une saisie" + (pireCas ? " (forcée, cas " + pireCas + ")" : ""),
      avant[IDX.NOM] +
        " " +
        avant[IDX.PRENOM] +
        " (saisie le " +
        avant[IDX.DATE] +
        ") : " +
        (changes.length ? changes.join(" ; ") : "aucun changement")
    );
    // Note d'alerte + rouge recalculés pour TOUTES les lignes (la correction peut créer
    // ou faire disparaître un doublon ailleurs dans l'offre)
    recalculerMarquages_(feuille);
    if (!aUneUsurpation_(det)) majAnnuaire_(nom, prenom, piece);
    return {
      status: "SUCCES",
      message: pireCas
        ? "⚠️ Correction forcée (Cas " + pireCas + ") : le doublon est marqué en rouge."
        : "✅ Saisie corrigée.",
    };
  } finally {
    libererVerrou_(lock);
  }
}

function supprimerSaisie(ligne, attendu, jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
    if (!feuille) throw new Error("La feuille '" + FEUILLE_SAISIES + "' est introuvable.");
    ligne = verifierLigneAttendue_(feuille, ligne, attendu);
    const supprimee = feuille.getRange(ligne, 1, 1, NB_COLONNES).getDisplayValues()[0];
    feuille.deleteRow(ligne);
    journaliser_(quiJeton_(jeton), "Suppression d'une saisie", ligneLisible_(supprimee));
    recalculerMarquages_(feuille); // un doublon de la ligne supprimée n'en est peut-être plus un
    return "🗑️ Saisie supprimée.";
  } finally {
    libererVerrou_(lock);
  }
}

function basculerModeWebApp(jeton) {
  exigerAdmin_(jeton);
  const feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  if (!feuille) throw new Error("La feuille '" + FEUILLE_SAISIES + "' est introuvable.");
  const modeActuel = modeSecurite_(feuille);
  const nouveauMode = modeActuel === "SIGNALER" ? "BLOQUANT" : "SIGNALER";
  feuille.getRange(CELLULE_MODE).setValue(nouveauMode);
  const lisible = { SIGNALER: "Signaler", BLOQUANT: "Bloquant" };
  journaliser_(quiJeton_(jeton), "Mode de sécurité", lisible[modeActuel] + " → " + lisible[nouveauMode]);
  return nouveauMode;
}
