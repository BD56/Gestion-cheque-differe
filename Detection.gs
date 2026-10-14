// Détection des doublons A/B/C, normalisation des noms et N°, marquage de
// « Saisies » (notes ⚠️ / ℹ️ et rouge).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Detection_() {
  return "2026.10.14-1359";
}

// Notes ajoutées automatiquement par l'application (retirées avant toute réécriture)
const NOTES_SYSTEME_REGEX = /(?:\n|\|)?\s*(?:⚠️ Ajout forcé \(Cas [ABC]\)|ℹ️ Passage \d+\/\d+)/g;
function notePassage_(rang, max) {
  return "ℹ️ Passage " + rang + "/" + max;
}
function ajouterNote_(notes, ajout) {
  return notes ? notes + "\n" + ajout : ajout;
}

// Normalisation d'un N° de pièce pour la COMPARAISON : majuscules, lettres et chiffres
// seulement (espaces, tirets, points, « / », « _ », caractères invisibles ignorés) ;
// un N° entièrement numérique est comparé SANS ses 0 initiaux.
// Raison : Google Sheets convertit en nombre un texte qui ressemble à un nombre
// ("012345678901" -> 12345678901, ex. anciennes CNI 2000-2009) ; les lignes déjà
// enregistrées ainsi doivent rester reconnues (sinon doublon manqué).
function _normPiece_(p) {
  if (p === null || p === undefined || p === "") return "";
  const n = p
    .toString()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
  return /^\d+$/.test(n) ? n.replace(/^0+(?=\d)/, "") : n;
}

// Notes « ⚠️ Ajout forcé » seules (sans « ℹ️ Passage ») : saisie signalée en alerte
const ALERTE_FORCE_REGEX = /(?:\n|\|)?\s*⚠️ Ajout forcé \(Cas [ABC]\)/g;

// Normalisation d'un NOM / PRÉNOM pour la comparaison : majuscules, sans accents
// (HÉLÈNE = HELENE), lettres spéciales dépliées (Œ -> OE, Ø -> O, Ł -> L), sans
// espaces, tirets, apostrophes (toutes formes), points, virgules, « / », « _ » ni
// caractères invisibles (D'ARC = D’ARC = DARC). Sinon un homonyme (cas C) passait
// inaperçu. ⚠️ Miroir : ScriptFormulaire.html::normIdJS.
const SEPARATEURS_NOM_REGEX = /[\s\-\u2010-\u2015\u2212'’‘ʼ`´′.,_/\u200B-\u200D\uFEFF]/g;
function _normId_(v) {
  if (v === null || v === undefined || v === "") return "";
  return v
    .toString()
    .toUpperCase()
    .replace(/Œ/g, "OE")
    .replace(/Æ/g, "AE")
    .replace(/Ø/g, "O")
    .replace(/Ł/g, "L")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(SEPARATEURS_NOM_REGEX, "");
}

// Détection A/B/C sur « Saisies » (mêmes règles que traiterSaisie / onEdit),
// utilisée par forcerSaisie et modifierSaisie. ligneExclue : n° de ligne à ne
// pas comparer (la ligne corrigée elle-même), ou 0.
// Même client (A) : doublon seulement si ses passages atteignent la limite autorisée.
// Renvoie { pireCas: 'A'|'B'|'C'|null, details: [...], passages: nb de passages du client }.
function detecterDoublons_(feuille, nom, prenom, piece, ligneExclue) {
  const nomN = _normId_(nom),
    prenomN = _normId_(prenom),
    pieceN = _normPiece_(piece);
  const donnees = feuille.getDataRange().getValues();
  const details = [];
  let pireCas = null,
    passages = 0;
  for (let i = 1; i < donnees.length; i++) {
    if (i === ligneExclue - 1) continue;
    const memeId =
      nomN !== "" &&
      prenomN !== "" &&
      _normId_(donnees[i][IDX.NOM]) === nomN &&
      _normId_(donnees[i][IDX.PRENOM]) === prenomN;
    const memePiece = pieceN !== "" && _normPiece_(donnees[i][IDX.PIECE]) === pieceN;
    if (!memeId && !memePiece) continue;
    const t = memeId && memePiece ? "A" : memePiece ? "B" : "C";
    if (t === "A") passages++;
    else if (t === "B") pireCas = "B";
    else if (t === "C" && pireCas !== "B") pireCas = "C";
    details.push({
      ligne: i + 1,
      type: t,
      date:
        donnees[i][IDX.DATE] instanceof Date
          ? Utilities.formatDate(donnees[i][IDX.DATE], fuseau_(), "dd/MM/yyyy HH:mm")
          : donnees[i][IDX.DATE]
            ? donnees[i][IDX.DATE].toString()
            : "",
      nom: donnees[i][IDX.NOM] ? donnees[i][IDX.NOM].toString() : "",
      prenom: donnees[i][IDX.PRENOM] ? donnees[i][IDX.PRENOM].toString() : "",
      piece: donnees[i][IDX.PIECE] ? donnees[i][IDX.PIECE].toString() : "",
      montant: donnees[i][IDX.MONTANT] ? donnees[i][IDX.MONTANT].toString() : "",
      notes: donnees[i][IDX.NOTES] ? donnees[i][IDX.NOTES].toString() : "",
    });
  }
  if (passages >= passagesMax_()) pireCas = "A";
  return { pireCas: pireCas, details: details, passages: passages };
}

// La pièce est-elle déjà enregistrée sous un autre nom (au moins une ligne de type B) ?
function aUneUsurpation_(det) {
  return det.details.some(function (d) {
    return d.type === "B";
  });
}

// Recalcule la note « ⚠️ Ajout forcé (Cas X) » et le rouge de chaque ligne de « Saisies ».
// Même règle qu'à l'enregistrement : une ligne est marquée si elle double une ligne
// PLUS ANCIENNE (au-dessus) ; la première occurrence reste propre. La note saisie par
// l'hôtesse est conservée. Appelée après une correction ou une suppression.
function recalculerMarquages_(feuille) {
  const derniere = feuille.getLastRow();
  if (derniere < 2) return;
  const plage = feuille.getRange(2, 1, derniere - 1, NB_COLONNES_LIGNE);
  const v = plage.getValues();
  // Notes lues TELLES QU'AFFICHÉES : une note que Sheets a prise pour une date (« 3/4 »)
  // reste « 03/04 » et n'est pas réécrite en « Fri Apr 03 2026 00:00:00 GMT… »
  const notesAffichees = feuille.getRange(2, COL.NOTES, derniere - 1, 1).getDisplayValues();
  let notesChangees = false;
  const rouge = "#f4cccc";
  const max = passagesMax_();
  const notes = [],
    fonds = [];
  for (let i = 0; i < v.length; i++) {
    const nomN = _normId_(v[i][IDX.NOM]),
      prenomN = _normId_(v[i][IDX.PRENOM]),
      pieceN = _normPiece_(v[i][IDX.PIECE]);
    let pireCas = null,
      passages = 0;
    if (nomN || prenomN || pieceN) {
      for (let j = 0; j < i; j++) {
        const memeId =
          nomN !== "" &&
          prenomN !== "" &&
          _normId_(v[j][IDX.NOM]) === nomN &&
          _normId_(v[j][IDX.PRENOM]) === prenomN;
        const memePiece = pieceN !== "" && _normPiece_(v[j][IDX.PIECE]) === pieceN;
        if (memeId && memePiece) passages++;
        else if (memePiece) pireCas = "B";
        else if (memeId && pireCas !== "B") pireCas = "C";
      }
      if (passages >= max) pireCas = "A";
    }
    const noteActuelle =
      v[i][IDX.NOTES] instanceof Date
        ? notesAffichees[i][0]
        : v[i][IDX.NOTES] === null || v[i][IDX.NOTES] === undefined
          ? ""
          : v[i][IDX.NOTES].toString();
    const notePropre = noteActuelle.replace(NOTES_SYSTEME_REGEX, "").trim();
    const noteSysteme = pireCas
      ? "⚠️ Ajout forcé (Cas " + pireCas + ")"
      : passages > 0
        ? notePassage_(passages + 1, max)
        : "";
    const noteVoulue = noteSysteme ? ajouterNote_(notePropre, noteSysteme) : notePropre;
    if (noteVoulue !== noteActuelle) notesChangees = true;
    notes.push([texte_(noteVoulue)]);
    fonds.push([
      null,
      pireCas === "A" || pireCas === "C" ? rouge : null,
      pireCas === "A" || pireCas === "C" ? rouge : null,
      pireCas === "A" || pireCas === "B" ? rouge : null,
      null,
      pireCas ? rouge : null,
      null,
    ]);
  }
  if (notesChangees) feuille.getRange(2, COL.NOTES, v.length, 1).setValues(notes);
  plage.setBackgrounds(fonds);
}

function messagesDoublon_(mode, pireCas) {
  const r = { bloque: false, couleur: "ROUGE", titre: "", message: "" };
  const homonyme =
    "Un client porte ce nom avec une autre pièce. Demandez une 2e pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente.";
  if (pireCas === "C") {
    r.couleur = "ORANGE";
    r.titre = "⚠️ HOMONYME DÉTECTÉ";
    r.message = homonyme;
    return r;
  }
  if (mode === "BLOQUANT") {
    r.bloque = true;
    r.titre = "🛑 CORRECTION REFUSÉE";
    r.message =
      pireCas === "A"
        ? "Ce client a déjà profité de l'offre (autre ligne)."
        : "Ce numéro de pièce d'identité est déjà associé à un autre client.";
  } else {
    r.titre = pireCas === "A" ? "🛑 ALERTE FRAUDE" : "🛑 ANOMALIE GRAVE";
    r.message =
      pireCas === "A"
        ? "Ce client est déjà enregistré avec ce numéro de pièce (autre ligne)."
        : "Ce numéro de pièce d'identité est déjà utilisé sous un autre nom !";
  }
  return r;
}
