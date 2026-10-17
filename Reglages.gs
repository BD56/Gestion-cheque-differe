// Réglages de la structure (textes, montant, passages autorisés).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Reglages_() {
  return "2026.10.17-2337";
}

// =================================================================
// --- RÉGLAGES DE LA STRUCTURE (généralisation) ---
//     Stockés dans PropertiesService (clés CFG_*). Une clé absente = valeur
//     par défaut ci-dessous, qui correspond à l'existant (Carrefour Vannes) :
//     sans réglage, l'affichage et le comportement restent identiques.
//     Ne touche PAS à la détection A/B/C (« Saisies » reste la source de vérité).
// =================================================================
const CONFIG_DEFAUTS = {
  NOM_STRUCTURE: "l'Hypermarché Carrefour Vannes", // avec l'article : lu « L'auteur concède à … »
  NOM_OFFRE: "Gestion Chèques Reportés",
  TITRE_APP: "Caisse - Saisie Chèques",
  LIBELLE_MONTANT: "Montant",
  MONTANT_OBLIGATOIRE: "OUI", // "OUI" ou "NON"
  LIBELLE_NOTES: "Notes ou Infos",
  PRECISION_NOTES: "numéro de caisse, etc.", // affichée entre parenthèses (vide = rien)
  PASSAGES_MAX: "1", // passages autorisés par client et par offre (1 à 10)
};

// Nombre de passages autorisés par client (même nom + même pièce) sur une offre.
function passagesMax_() {
  const n = parseInt(getConfig().PASSAGES_MAX, 10);
  return n >= 1 && n <= 10 ? n : 1;
}

function getConfig() {
  const props = PropertiesService.getDocumentProperties().getProperties();
  const cfg = {};
  for (const k in CONFIG_DEFAUTS) {
    const v = props["CFG_" + k];
    cfg[k] = v === undefined || v === null ? CONFIG_DEFAUTS[k] : v;
  }
  return cfg;
}

// Enregistre les réglages (espace responsable). Seules les clés connues sont
// acceptées ; les libellés principaux ne peuvent pas être vides.
function setConfig(valeurs, jeton) {
  exigerAdmin_(jeton);
  const obligatoires = ["NOM_STRUCTURE", "NOM_OFFRE", "TITRE_APP", "LIBELLE_MONTANT", "LIBELLE_NOTES"];
  const aEcrire = {};
  for (const k in CONFIG_DEFAUTS) {
    if (!valeurs || !(k in valeurs)) continue;
    let v = valeurs[k] === null || valeurs[k] === undefined ? "" : valeurs[k].toString().trim();
    if (k === "MONTANT_OBLIGATOIRE") v = v === "NON" ? "NON" : "OUI";
    if (k === "PASSAGES_MAX" && !/^([1-9]|10)$/.test(v))
      throw new Error("Passages autorisés par client : un nombre de 1 à 10.");
    if (v.length > 100) throw new Error("« " + k + " » : 100 caractères maximum.");
    if (obligatoires.indexOf(k) !== -1 && v === "") throw new Error("« " + k + " » ne peut pas être vide.");
    aEcrire["CFG_" + k] = v;
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // réglage + marquages changés ensemble (pas de saisie entre les deux)
  try {
    const ancien = getConfig();
    const changes = Object.keys(aEcrire)
      .filter(function (k) {
        return String(ancien[k.slice(4)]) !== aEcrire[k];
      })
      .map(function (k) {
        return k.slice(4) + " : « " + ancien[k.slice(4)] + " » → « " + aEcrire[k] + " »";
      });
    if (changes.length) journaliser_(quiJeton_(jeton), "Réglages", changes.join(" ; "));
    const ancienMax = passagesMax_();
    PropertiesService.getDocumentProperties().setProperties(aEcrire);
    // Limite de passages changée : marquages de l'offre recalculés avec la nouvelle règle
    if (passagesMax_() !== ancienMax) {
      const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
      if (f) recalculerMarquages_(f);
    }
  } finally {
    libererVerrou_(lock);
  }
  return getConfig();
}
