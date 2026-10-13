// =================================================================
// --- STRUCTURE DE LA FEUILLE « Saisies » (source de vérité) ---
//     Les archives (« Archives_… ») ont la même structure : une copie de « Saisies ».
//     Ne pas changer ces valeurs sans adapter les feuilles existantes.
// =================================================================
var FEUILLE_SAISIES = "Saisies";
var CELLULE_MODE = "Z1"; // mode de sécurité : SIGNALER ou BLOQUANT
var ENTETES_SAISIES = ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos"];
// Numéros de colonnes (A = 1), pour getRange(ligne, colonne…)
var COL = { DATE: 1, NOM: 2, PRENOM: 3, PIECE: 4, MONTANT: 5, NOTES: 6 };
// Positions dans une ligne lue par getValues() (A = 0) : toujours COL - 1
var IDX = { DATE: 0, NOM: 1, PRENOM: 2, PIECE: 3, MONTANT: 4, NOTES: 5 };
var NB_COLONNES = 6;          // A à F : la ligne complète
var NB_COLONNES_SAISIE = 5;   // B à F : ce qui est tapé (tout sauf la date)
var NB_COLONNES_LIGNE = 7;    // A à G : largeur vidée / décolorée (G reste vide)
var PREFIXE_ARCHIVES = "Archives_";

// Autres onglets (anciens écrans du Sheet, gardés pour le panneau ⚙️)
var FEUILLE_IMPRESSION = "A_IMPRIMER";
var CELLULE_JOUR_IMPRESSION = "Z1"; // jour choisi (vide = aujourd'hui)
var FEUILLE_OFFRE_COMPLETE = "OFFRE_COMPLETE";

// Fuseau horaire de référence (réglage du projet Apps Script : Europe/Paris par défaut).
// Un seul fuseau pour les dates d'offre, les noms d'archives, l'impression, le robot.
function fuseau_() {
  try { return Session.getScriptTimeZone() || "Europe/Paris"; } catch (e) { return "Europe/Paris"; }
}

// Mode de sécurité de « Saisies »!Z1 (tolère « Bloquant », espaces…).
function modeSecurite_(feuille) {
  var v = feuille ? (feuille.getRange(CELLULE_MODE).getValue() || "").toString().trim().toUpperCase() : "";
  return v === "BLOQUANT" ? "BLOQUANT" : "SIGNALER";
}

// Avant de rendre le verrou : écritures envoyées au tableur (la saisie suivante les lit).
function libererVerrou_(lock) {
  try { SpreadsheetApp.flush(); } catch (e) {}
  lock.releaseLock();
}

function doGet(e) {
  nettoyerSiCopie_(); // copie du modèle (ou d'un autre classeur) : repart sans code/dates/réglages hérités
  // Nouvelle structure : crée « Saisies » si elle n'existe pas encore (rien n'est écrasé)
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES)) installerFeuilles_();
  var cfg = getConfig();
  var page = HtmlService.createTemplateFromFile('Index');
  page.cfg = cfg;
  // Dates de l'offre glissées dans la page : la tablette affiche tout de suite le bon
  // écran (saisie ou « aucune opération »), sans attendre un appel au serveur.
  page.dates = lireDates_();
  return page.evaluate()
      .setTitle(cfg.TITRE_APP)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// =================================================================
// --- INSTALLATION (nouvelle structure) ---
//     Menu du Sheet « 🚀 APPLICATION → 🧰 Installer / vérifier » (ou fonction
//     installer depuis l'éditeur). À lancer sur chaque nouvelle copie du modèle
//     et après chaque collage d'une nouvelle version : ça accorde les
//     autorisations nécessaires et crée ce qui manque. N'écrase aucune donnée.
//     Seule exception : une COPIE d'un autre classeur repart sans les réglages
//     hérités (code responsable, dates, réglages) — cf. nettoyerSiCopie_.
// =================================================================
// Réservé aux personnes ayant accès au fichier (menu du Sheet, éditeur Apps Script) :
// un visiteur de l'application ne peut pas le lancer.
function installer() {
  exigerEditeur_();
  var rapport = [];
  if (nettoyerSiCopie_()) rapport.push("Nouvelle copie détectée : code responsable, dates et réglages hérités effacés.");
  rapport = rapport.concat(installerFeuilles_(), installerDeclencheurs_());
  if (rapport.length === 0) rapport.push("Rien à faire : tout est déjà en place.");
  Logger.log(rapport.join("\n"));
  return rapport.join("\n");
}

// Crée les robots de nuit manquants. Renvoie la liste de ce qui a été fait.
function installerDeclencheurs_() {
  var faits = [];
  var existants = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (existants.indexOf('verificationClotureNocturne') === -1) {
    ScriptApp.newTrigger('verificationClotureNocturne').timeBased().everyDays(1).atHour(1).create();
    faits.push("Déclencheur créé : clôture automatique et suppression des archives de plus de 3 ans (chaque nuit vers 1h).");
  }
  if (ANNUAIRE_ACTIF && existants.indexOf('purgerAnnuaire') === -1) {
    ScriptApp.newTrigger('purgerAnnuaire').timeBased().everyDays(1).atHour(3).create();
    faits.push("Déclencheur créé : purge de l'annuaire (chaque nuit vers 3h).");
  }
  return faits;
}

// État des robots de nuit (affiché dans l'espace responsable).
function etatRobots_() {
  var noms = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  var props = PropertiesService.getDocumentProperties();
  return {
    cloture: noms.indexOf('verificationClotureNocturne') !== -1,
    purge: !ANNUAIRE_ACTIF || noms.indexOf('purgerAnnuaire') !== -1,
    derniereNuit: props.getProperty('DERNIERE_NUIT') || "",
    derniereNuitMs: Number(props.getProperty('DERNIERE_NUIT_MS') || 0)
  };
}

// Depuis le menu du Sheet : installe puis affiche le compte rendu + la suite
// (et le code d'activation si le code responsable n'existe pas encore).
function installerDepuisMenu() {
  var ui = SpreadsheetApp.getUi(); // échoue hors du Google Sheets : rien n'est fait
  var rapport = installer();
  var props = PropertiesService.getDocumentProperties();
  if (!props.getProperty('ADMIN_PIN_HASH')) rapport += "\n\n" + texteActivation_(genererCodeActivation_());
  ui.alert("🧰 Installation",
    rapport +
    "\n\nSi l'application n'est pas encore en ligne : Extensions → Apps Script → " +
    "Déployer → Nouveau déploiement → Application Web (voir INSTALLATION.md).",
    ui.ButtonSet.OK);
}

// Menu du Sheet « 🔑 Code d'activation » : pour créer le code responsable depuis
// l'application (1re installation, ou après « Réinitialiser le code »).
function afficherCodeActivation() {
  var ui = SpreadsheetApp.getUi();
  exigerEditeur_();
  if (PropertiesService.getDocumentProperties().getProperty('ADMIN_PIN_HASH')) {
    ui.alert("🔑 Code d'activation", "Un code responsable existe déjà : il sert à autoriser les tablettes.\n\n" +
      "Code oublié ? Panneau ⚙️ (à droite) → « Réinitialiser le code responsable » : un code d'activation sera alors affiché.", ui.ButtonSet.OK);
    return;
  }
  ui.alert("🔑 Code d'activation", texteActivation_(genererCodeActivation_()), ui.ButtonSet.OK);
}

// Les réglages (PropertiesService du document) sont marqués avec l'ID du
// classeur. Si la marque existe mais ne correspond pas, c'est une COPIE : on
// efface tout ce qui a été hérité (code responsable, dates, réglages, mode
// annuaire) pour repartir vierge. Classeur jamais marqué (ex. Vannes avant la
// généralisation) : on pose la marque sans rien effacer.
// Renvoie true si un nettoyage a eu lieu.
function nettoyerSiCopie_() {
  var props = PropertiesService.getDocumentProperties();
  var id = SpreadsheetApp.getActiveSpreadsheet().getId();
  var marque = props.getProperty('ID_CLASSEUR');
  if (marque === id) return false;
  if (marque) props.deleteAllProperties();
  props.setProperty('ID_CLASSEUR', id);
  return !!marque;
}

// Copie pas encore installée ? (lecture seule, utilisable dans onOpen)
function estCopieNonInstallee_() {
  try {
    var marque = PropertiesService.getDocumentProperties().getProperty('ID_CLASSEUR');
    return !!marque && marque !== SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (e) {
    return false;
  }
}

// Crée les feuilles manquantes. Renvoie la liste de ce qui a été fait.
function installerFeuilles_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var faits = [];
  if (!ss.getSheetByName(FEUILLE_SAISIES)) {
    var f = ss.insertSheet(FEUILLE_SAISIES, 0);
    f.getRange(1, 1, 1, NB_COLONNES).setValues([ENTETES_SAISIES]).setFontWeight("bold");
    f.getRange("A2:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
    f.getRange(CELLULE_MODE).setValue("SIGNALER");
    f.setFrozenRows(1);
    faits.push("Feuille « " + FEUILLE_SAISIES + " » créée.");
  }
  if (ANNUAIRE_ACTIF && !ss.getSheetByName(ANNUAIRE_FEUILLE)) {
    _feuilleAnnuaire_();
    faits.push("Feuille « " + ANNUAIRE_FEUILLE + " » créée (masquée).");
  }
  return faits;
}

// =================================================================
// --- RÉGLAGES DE LA STRUCTURE (généralisation) ---
//     Stockés dans PropertiesService (clés CFG_*). Une clé absente = valeur
//     par défaut ci-dessous, qui correspond à l'existant (Carrefour Vannes) :
//     sans réglage, l'affichage et le comportement restent identiques.
//     Ne touche PAS à la détection A/B/C (« Saisies » reste la source de vérité).
// =================================================================
var CONFIG_DEFAUTS = {
  NOM_STRUCTURE: "l'Hypermarché Carrefour Vannes", // avec l'article : lu « L'auteur concède à … »
  NOM_OFFRE: "Gestion Chèques Reportés",
  TITRE_APP: "Caisse - Saisie Chèques",
  LIBELLE_MONTANT: "Montant",
  MONTANT_OBLIGATOIRE: "OUI",              // "OUI" ou "NON"
  LIBELLE_NOTES: "Notes ou Infos",
  PRECISION_NOTES: "numéro de caisse, etc.", // affichée entre parenthèses (vide = rien)
  PASSAGES_MAX: "1"                         // passages autorisés par client et par offre (1 à 10)
};

// Nombre de passages autorisés par client (même nom + même pièce) sur une offre.
function passagesMax_() {
  var n = parseInt(getConfig().PASSAGES_MAX, 10);
  return (n >= 1 && n <= 10) ? n : 1;
}

// Notes ajoutées automatiquement par l'application (retirées avant toute réécriture)
var NOTES_SYSTEME_REGEX = /(?:\n|\|)?\s*(?:⚠️ Ajout forcé \(Cas [ABC]\)|ℹ️ Passage \d+\/\d+)/g;
function notePassage_(rang, max) { return "ℹ️ Passage " + rang + "/" + max; }
function ajouterNote_(notes, ajout) { return notes ? notes + "\n" + ajout : ajout; }

function getConfig() {
  var props = PropertiesService.getDocumentProperties().getProperties();
  var cfg = {};
  for (var k in CONFIG_DEFAUTS) {
    var v = props['CFG_' + k];
    cfg[k] = (v === undefined || v === null) ? CONFIG_DEFAUTS[k] : v;
  }
  return cfg;
}

// Enregistre les réglages (espace responsable). Seules les clés connues sont
// acceptées ; les libellés principaux ne peuvent pas être vides.
function setConfig(valeurs, jeton) {
  exigerAdmin_(jeton);
  var obligatoires = ["NOM_STRUCTURE", "NOM_OFFRE", "TITRE_APP", "LIBELLE_MONTANT", "LIBELLE_NOTES"];
  var aEcrire = {};
  for (var k in CONFIG_DEFAUTS) {
    if (!valeurs || !(k in valeurs)) continue;
    var v = (valeurs[k] === null || valeurs[k] === undefined) ? "" : valeurs[k].toString().trim();
    if (k === "MONTANT_OBLIGATOIRE") v = (v === "NON") ? "NON" : "OUI";
    if (k === "PASSAGES_MAX" && !/^([1-9]|10)$/.test(v)) throw new Error("Passages autorisés par client : un nombre de 1 à 10.");
    if (v.length > 100) throw new Error("« " + k + " » : 100 caractères maximum.");
    if (obligatoires.indexOf(k) !== -1 && v === "") throw new Error("« " + k + " » ne peut pas être vide.");
    aEcrire['CFG_' + k] = v;
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // réglage + marquages changés ensemble (pas de saisie entre les deux)
  try {
    var ancienMax = passagesMax_();
    PropertiesService.getDocumentProperties().setProperties(aEcrire);
    // Limite de passages changée : marquages de l'offre recalculés avec la nouvelle règle
    if (passagesMax_() !== ancienMax) {
      var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
      if (f) recalculerMarquages_(f);
    }
  } finally {
    libererVerrou_(lock);
  }
  return getConfig();
}

// =================================================================
// --- ESPACE RESPONSABLE : CODE PIN (vérifié côté serveur) ---
//     Protège réglages, mode, dates, clôture, archives, corrections.
//     La saisie et l'impression restent libres.
//     - Le code n'est jamais stocké en clair (empreinte SHA-256 + sel).
//     - Code juste -> jeton de session (CacheService), valable 10 min
//       d'inactivité. Chaque action protégée exige un jeton valide.
//     - 5 codes faux -> blocage 15 min.
//     - Le panneau du Sheet (secours) passe sans code : réservé aux
//       éditeurs du classeur. Il permet aussi de réinitialiser le code.
// =================================================================
var ADMIN_PIN_REGEX = /^\d{6}$/;   // exactement 6 chiffres
var ADMIN_ESSAIS_MAX = 5;          // 5 codes faux -> blocage
var ADMIN_BLOCAGE_MIN = 15;
var ADMIN_PAUSE_MS = 10000;        // pause imposée par le SERVEUR après chaque code faux
var ADMIN_SESSION_SEC = 600;

function empreintePin_(sel, pin) {
  var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sel + ":" + pin, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(octets);
}

function etatAdmin() {
  return { pinDefini: !!PropertiesService.getDocumentProperties().getProperty('ADMIN_PIN_HASH') };
}

// Le jeton est LIÉ à la tablette qui a saisi le code : il ne sert à rien depuis un
// autre appareil. La tablette l'envoie avec sa clé : { j: jeton, c: clé }.
// (« E » = jeton sans tablette : panneau du Sheet ou code d'activation.)
function creerJetonAdmin_(tablette) {
  var jeton = Utilities.getUuid();
  CacheService.getScriptCache().put('ADM_' + jeton, tablette ? 'T:' + tablette.id : 'E', ADMIN_SESSION_SEC);
  return jeton;
}

function jetonValide_(jeton) {
  var j = jeton, cle = null;
  if (jeton && typeof jeton === 'object') { j = jeton.j; cle = jeton.c; }
  if (!j || typeof j !== 'string') return false;
  var cache = CacheService.getScriptCache();
  var lien = cache.get('ADM_' + j);
  if (!lien) return false;
  if (lien !== 'E') {
    var t = tabletteDeCle_(cle);
    if (!t || lien !== 'T:' + t.id) return false;
  }
  cache.put('ADM_' + j, lien, ADMIN_SESSION_SEC); // prolonge (10 min d'inactivité)
  return true;
}

// L'utilisateur courant est-il propriétaire/éditeur du classeur ? (panneau du Sheet)
// Dans la web app, l'e-mail du visiteur n'est en général pas disponible -> false.
function estEditeurDuClasseur_() {
  try {
    var email = Session.getActiveUser().getEmail();
    if (!email) return false;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var proprio = ss.getOwner();
    if (proprio && proprio.getEmail() === email) return true;
    return ss.getEditors().some(function (u) { return u.getEmail() === email; });
  } catch (e) {
    return false;
  }
}

function exigerAdmin_(jeton) {
  if (jetonValide_(jeton) || estEditeurDuClasseur_()) return;
  throw new Error("ADMIN_REQUIS : code responsable requis (session expirée ?)");
}

function exigerEditeur_() {
  if (!estEditeurDuClasseur_()) throw new Error("Réservé aux personnes ayant accès au Google Sheets.");
}

// Robot de nuit : lancé par SON déclencheur (ou à la main par un éditeur). Un visiteur
// de l'application ne peut pas le déclencher (identifiant du déclencheur inconnu).
function exigerDeclencheurOuEditeur_(e) {
  if (e && e.triggerUid && ScriptApp.getProjectTriggers().some(function (t) {
    return String(t.getUniqueId()) === String(e.triggerUid);
  })) return;
  exigerEditeur_();
}

// Vérifie le code responsable avec les protections contre les essais au hasard.
// Compteurs SÉPARÉS par « groupe » : un par tablette autorisée (« T_<id> »), un pour
// les appareils non autorisés (« INCONNU » : écran d'autorisation), un pour le panneau
// du Sheet. Un inconnu qui a le lien ne peut donc PAS bloquer l'espace responsable des
// tablettes autorisées (au pire, l'autorisation de nouvelles tablettes, 15 min).
//  - après chaque code faux : 10 s de pause pendant lesquelles tout essai est refusé ;
//  - après 5 codes faux : blocage 15 min (jamais plus long).
// À appeler sous verrou. Renvoie { ok:true } ou { ok:false, message }.
function verifierPin_(props, pin, groupe) {
  var hash = props.getProperty('ADMIN_PIN_HASH');
  if (!hash) return { ok: false, message: "Aucun code défini : créez-le d'abord." };
  var cleEtat = 'PIN_ESSAIS_' + (groupe || 'EDITEUR');
  var etat = {};
  try { etat = JSON.parse(props.getProperty(cleEtat) || '{}'); } catch (e) { etat = {}; }
  var maintenant = Date.now();
  if ((etat.bloque || 0) > maintenant) {
    return { ok: false, message: "Trop d'essais. Réessayez dans " + Math.ceil((etat.bloque - maintenant) / 60000) + " min." };
  }
  if (maintenant - (etat.dernier || 0) < ADMIN_PAUSE_MS) {
    return { ok: false, message: "Patientez " + Math.ceil((ADMIN_PAUSE_MS - (maintenant - etat.dernier)) / 1000) + " s avant un nouvel essai." };
  }
  if (empreintePin_(props.getProperty('ADMIN_PIN_SEL'), (pin || "").toString()) === hash) {
    props.deleteProperty(cleEtat);
    return { ok: true };
  }
  if (groupe === 'INCONNU') { // trace visible dans l'espace responsable
    var inc = {};
    try { inc = JSON.parse(props.getProperty('PIN_INCONNUS') || '{}'); } catch (e) { inc = {}; }
    props.setProperty('PIN_INCONNUS', JSON.stringify({ n: (inc.n || 0) + 1, dernier: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm") }));
  }
  var echecs = (etat.echecs || 0) + 1;
  if (echecs >= ADMIN_ESSAIS_MAX) {
    props.setProperty(cleEtat, JSON.stringify({ echecs: 0, dernier: maintenant, bloque: maintenant + ADMIN_BLOCAGE_MIN * 60000 }));
    return { ok: false, message: "Code faux. Trop d'essais : bloqué " + ADMIN_BLOCAGE_MIN + " min." };
  }
  props.setProperty(cleEtat, JSON.stringify({ echecs: echecs, dernier: maintenant, bloque: 0 }));
  return { ok: false, message: "Code faux (" + (ADMIN_ESSAIS_MAX - echecs) + " essai(s) restant(s)). Patientez 10 s." };
}

// Efface les compteurs d'essais (tous, ou ceux d'une tablette).
function effacerEssais_(props, groupe) {
  var tout = props.getProperties();
  for (var k in tout) {
    if (groupe ? k === 'PIN_ESSAIS_' + groupe : k.indexOf('PIN_ESSAIS_') === 0) props.deleteProperty(k);
  }
}

// Code juste -> { ok:true, jeton } ; sinon { ok:false, message }. Tablette autorisée requise.
function ouvrirSessionAdmin(pin, cle) {
  exigerTablette_(cle);
  var t = tabletteDeCle_(cle);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var v = verifierPin_(PropertiesService.getDocumentProperties(), pin, t ? 'T_' + t.id : 'EDITEUR');
    return v.ok ? { ok: true, jeton: creerJetonAdmin_(t) } : v;
  } finally {
    lock.releaseLock();
  }
}

// --- CODE D'ACTIVATION : prouve l'accès au Google Sheets ---
// Créer le code responsable (1re installation, ou après « Réinitialiser le code »)
// exige ce code à 8 chiffres, affiché UNIQUEMENT dans le Google Sheets (menu
// « 🧰 Installer », « 🔑 Code d'activation », ou réinitialisation du code). Sinon,
// la première personne qui ouvre le lien pourrait choisir le code responsable.
// Usage unique, valable 24 h, 10 essais au plus. Seule son empreinte est gardée.
var ACTIVATION_DUREE_H = 24;
var ACTIVATION_ESSAIS_MAX = 10;

function genererCodeActivation_() {
  var chiffres = "";
  while (chiffres.length < 8) {
    var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid(), Utilities.Charset.UTF_8);
    for (var i = 0; i < octets.length && chiffres.length < 8; i++) {
      var b = octets[i] & 255;
      if (b < 250) chiffres += String(b % 10); // 250 = 25 × 10 : pas de biais
    }
  }
  var sel = Utilities.getUuid();
  PropertiesService.getDocumentProperties().setProperties({
    ACTIVATION_SEL: sel,
    ACTIVATION_HASH: empreintePin_(sel, chiffres),
    ACTIVATION_EXPIRE: String(Date.now() + ACTIVATION_DUREE_H * 3600000),
    ACTIVATION_ESSAIS: '0'
  });
  return chiffres.slice(0, 4) + "-" + chiffres.slice(4);
}

function texteActivation_(code) {
  return "🔑 Code d'activation : " + code + "\n(valable " + ACTIVATION_DUREE_H + " h, une seule fois)\n\n" +
    "Sur la tablette, ouvrez l'application : elle demande ce code, puis de choisir le code " +
    "responsable (6 chiffres). Ne le communiquez qu'au responsable.";
}

function effacerActivation_(props) {
  ['ACTIVATION_SEL', 'ACTIVATION_HASH', 'ACTIVATION_EXPIRE', 'ACTIVATION_ESSAIS'].forEach(function (k) { props.deleteProperty(k); });
}

// À appeler sous verrou. Renvoie { ok:true } ou { ok:false, message }.
function verifierActivation_(props, code) {
  var obtenir = " Obtenez-en un dans le Google Sheets : menu 🚀 APPLICATION → 🔑 Code d'activation.";
  var hash = props.getProperty('ACTIVATION_HASH');
  if (!hash) return { ok: false, message: "Code d'activation requis." + obtenir };
  if (Date.now() > Number(props.getProperty('ACTIVATION_EXPIRE') || 0)) {
    effacerActivation_(props);
    return { ok: false, message: "Code d'activation expiré." + obtenir };
  }
  var essais = Number(props.getProperty('ACTIVATION_ESSAIS') || 0);
  if (essais >= ACTIVATION_ESSAIS_MAX) {
    effacerActivation_(props);
    return { ok: false, message: "Trop d'essais : ce code d'activation n'est plus valable." + obtenir };
  }
  var chiffres = (code || "").toString().replace(/\D/g, '');
  if (chiffres.length === 8 && empreintePin_(props.getProperty('ACTIVATION_SEL'), chiffres) === hash) return { ok: true };
  props.setProperty('ACTIVATION_ESSAIS', String(essais + 1));
  return { ok: false, message: "Code d'activation incorrect." };
}

// Création (si aucun code : code d'activation exigé, sauf panneau du Sheet) ou
// changement (session responsable requise).
function definirPin(nouveauPin, jeton, cle, activation) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getDocumentProperties();
    var creation = !props.getProperty('ADMIN_PIN_HASH');
    if (!creation) exigerAdmin_(jeton);
    nouveauPin = (nouveauPin || "").toString();
    if (!ADMIN_PIN_REGEX.test(nouveauPin)) return { ok: false, message: "Le code doit contenir exactement 6 chiffres." };
    if (creation && !estEditeurDuClasseur_()) {
      var a = verifierActivation_(props, activation);
      if (!a.ok) return a;
    }
    var sel = Utilities.getUuid();
    props.setProperties({ ADMIN_PIN_SEL: sel, ADMIN_PIN_HASH: empreintePin_(sel, nouveauPin) });
    effacerEssais_(props);
    effacerActivation_(props);
    props.deleteProperty('PIN_INCONNUS'); // nouveau code : l'avertissement est soldé
    var garde = !creation && jetonValide_(jeton);
    return { ok: true, jeton: garde ? (typeof jeton === 'object' ? jeton.j : jeton) : creerJetonAdmin_(tabletteDeCle_(cle)) };
  } finally {
    lock.releaseLock();
  }
}

function fermerSessionAdmin(jeton) {
  var j = (jeton && typeof jeton === 'object') ? jeton.j : jeton;
  if (j && typeof j === 'string') CacheService.getScriptCache().remove('ADM_' + j);
}

// Secours (panneau du Sheet, éditeurs uniquement) : efface le code et affiche un
// code d'activation pour en créer un nouveau depuis n'importe quelle tablette.
function reinitialiserPinPanneau() {
  exigerEditeur_();
  var props = PropertiesService.getDocumentProperties();
  ['ADMIN_PIN_HASH', 'ADMIN_PIN_SEL', 'ADMIN_ECHECS', 'ADMIN_BLOQUE_JUSQUA', 'ADMIN_DERNIER_ECHEC'].forEach(function (k) { props.deleteProperty(k); });
  effacerEssais_(props);
  return "✅ Code responsable effacé.\n\n" + texteActivation_(genererCodeActivation_());
}

// =================================================================
// --- TABLETTES AUTORISÉES (appairage) ---
//     Seules les tablettes autorisées une fois par un responsable (code) peuvent
//     utiliser l'application : saisie, vérification, impression, espace
//     responsable. Un lien qui fuite ne donne donc accès à rien.
//     - La tablette garde une clé secrète (localStorage) ; le serveur n'en garde
//       que l'empreinte (comme le code), dans les propriétés du document.
//     - Le panneau du Sheet (éditeurs du classeur) passe sans clé.
//     - Retrait d'une tablette / de toutes : espace responsable, tuile « Tablettes ».
// =================================================================
var TABLETTES_MAX = 20;

function lireTablettes_() {
  try { return JSON.parse(PropertiesService.getDocumentProperties().getProperty('TABLETTES') || '[]'); }
  catch (e) { return []; }
}
function ecrireTablettes_(liste) {
  PropertiesService.getDocumentProperties().setProperty('TABLETTES', JSON.stringify(liste));
}
function empreinteCle_(cle) {
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "tablette:" + cle, Utilities.Charset.UTF_8));
}
function tabletteDeCle_(cle) {
  if (!cle || typeof cle !== 'string' || cle.length < 32) return null;
  var h = empreinteCle_(cle);
  var liste = lireTablettes_();
  for (var i = 0; i < liste.length; i++) if (liste[i].hash === h) return liste[i];
  return null;
}

// Refuse l'appel si la clé ne correspond à aucune tablette autorisée (sauf
// panneau du Sheet). Note la date de dernière utilisation (une fois par jour,
// propriété séparée : pas de réécriture de la liste, donc pas de conflit).
function exigerTablette_(cle) {
  var t = tabletteDeCle_(cle);
  if (t) {
    var props = PropertiesService.getDocumentProperties();
    var auj = Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy");
    if (props.getProperty('TABLETTE_VUE_' + t.id) !== auj) props.setProperty('TABLETTE_VUE_' + t.id, auj);
    return;
  }
  if (estEditeurDuClasseur_()) return;
  throw new Error("TABLETTE_NON_AUTORISEE : cette tablette n'est pas (ou plus) autorisée.");
}

// Autorise la tablette qui appelle (code responsable requis). Renvoie la clé à garder.
function appairerTablette(pin, nom) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getDocumentProperties();
    var v = verifierPin_(props, pin, 'INCONNU');
    if (!v.ok) return v;
    var liste = lireTablettes_();
    if (liste.length >= TABLETTES_MAX) return { ok: false, message: TABLETTES_MAX + " tablettes maximum : retirez-en une depuis l'espace responsable (tuile 🔑), ou toutes depuis le panneau du Google Sheets." };
    var cle = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    nom = (nom || "").toString().trim().slice(0, 40) || ("Tablette " + (liste.length + 1));
    liste.push({ id: id, nom: nom, hash: empreinteCle_(cle), creeLe: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm") });
    ecrireTablettes_(liste);
    return { ok: true, cle: cle, id: id, nom: nom };
  } finally {
    lock.releaseLock();
  }
}

function listerTablettes(jeton) {
  exigerAdmin_(jeton);
  var props = PropertiesService.getDocumentProperties();
  return lireTablettes_().map(function (t) {
    return { id: t.id, nom: t.nom, creeLe: t.creeLe, vueLe: props.getProperty('TABLETTE_VUE_' + t.id) || "" };
  });
}

function retirerTablette(id, jeton) {
  exigerAdmin_(jeton);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ecrireTablettes_(lireTablettes_().filter(function (t) { return t.id !== id; }));
    PropertiesService.getDocumentProperties().deleteProperty('TABLETTE_VUE_' + id);
    PropertiesService.getDocumentProperties().deleteProperty('PIN_ESSAIS_T_' + id);
    return "Tablette retirée.";
  } finally {
    lock.releaseLock();
  }
}

function retirerToutesTablettes(jeton) {
  exigerAdmin_(jeton);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getDocumentProperties();
    lireTablettes_().forEach(function (t) { props.deleteProperty('TABLETTE_VUE_' + t.id); props.deleteProperty('PIN_ESSAIS_T_' + t.id); });
    ecrireTablettes_([]);
    return "Toutes les tablettes ont été retirées : chacune devra être autorisée à nouveau.";
  } finally {
    lock.releaseLock();
  }
}

// Secours (panneau du Sheet) : retire toutes les tablettes (liste pleine, tablettes
// perdues…). Chacune devra être autorisée à nouveau avec le code responsable.
function retirerToutesTablettesPanneau() {
  exigerEditeur_();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getDocumentProperties();
    lireTablettes_().forEach(function (t) { props.deleteProperty('TABLETTE_VUE_' + t.id); props.deleteProperty('PIN_ESSAIS_T_' + t.id); });
    ecrireTablettes_([]);
    return "✅ Toutes les tablettes ont été retirées : autorisez à nouveau celles du magasin (avec le code responsable).";
  } finally {
    lock.releaseLock();
  }
}

// Tout ce qu'affiche l'espace responsable, en un appel.
function getInfosAdmin(jeton) {
  exigerAdmin_(jeton);
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  // Robots de nuit absents (application ouverte avant « Installer »…) : on les recrée.
  var robotsCrees = [];
  try { robotsCrees = installerDeclencheurs_(); } catch (e) { Logger.log("Robots de nuit : " + e); }
  var inconnus = {};
  try { inconnus = JSON.parse(PropertiesService.getDocumentProperties().getProperty('PIN_INCONNUS') || '{}'); } catch (e) { inconnus = {}; }
  return {
    mode: modeSecurite_(f),
    dates: lireDates_(),
    annuaireActif: ANNUAIRE_ACTIF,
    modeAnnuaire: getModeAnnuaire(),
    config: getConfig(),
    robots: etatRobots_(),
    robotsCrees: robotsCrees.length,
    essaisInconnus: inconnus
  };
}

// =================================================================
// --- FONCTIONS PRINCIPALES AVEC LOCKSERVICE POUR ATOMICITÉ ---
// =================================================================

function traiterSaisie(nom, prenom, piece, montant, notes, cle) {
  exigerTablette_(cle);
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les race conditions

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feuille = ss.getSheetByName(FEUILLE_SAISIES);
    if (!feuille) return { status: "BLOQUE", titre: "Erreur Serveur", message: "La feuille '" + FEUILLE_SAISIES + "' est introuvable." };

    var horsPeriode = controlerPeriode_();
    if (horsPeriode) return horsPeriode;
    var incomplet = controlerChamps_(nom, prenom, piece, montant);
    if (incomplet) return incomplet;

    var modeSecurite = modeSecurite_(feuille);
    
    // Nettoyage standard pour l'affichage
    nom = nom.toString().toUpperCase().trim();
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim();
    notes = notes ? notes.toString().replace(NOTES_SYSTEME_REGEX, '').trim() : "";
    if (montant && typeof montant === 'string' && montant.includes('.')) montant = montant.replace('.', ',');
    
    // Détection A/B/C : même fonction que forcerSaisie / corrections / onEdit
    var det = detecterDoublons_(feuille, nom, prenom, piece, 0);
    var pireCas = det.pireCas;
    var detailsDoublons = det.details;
    var passagesClient = det.passages; // passages déjà enregistrés pour CE client (même nom + même pièce)

    var passagesMax = passagesMax_();
    var limiteTxt = (passagesMax > 1) ? " (déjà " + passagesClient + " passage(s) ; maximum " + passagesMax + " par client)" : "";

    if (pireCas) {
      var isBloque = false;
      var msgTitre = "";
      var msgAlerte = "";
      var couleur = "ROUGE";
      
      if (modeSecurite === "BLOQUANT") {
        if (pireCas === 'A') {
          isBloque = true; msgTitre = "🛑 SAISIE REFUSÉE"; msgAlerte = "Ce client a déjà profité de l'offre." + limiteTxt;
        } else if (pireCas === 'B') {
          isBloque = true; msgTitre = "🛑 SAISIE REFUSÉE"; msgAlerte = "Ce numéro de pièce d'identité est déjà associé à un autre client.";
        } else if (pireCas === 'C') {
          isBloque = false; couleur = "ORANGE"; msgTitre = "⚠️ HOMONYME DÉTECTÉ"; 
          msgAlerte = "Un client porte ce nom avec une autre pièce. Demandez une 2e pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente avant de forcer l'ajout.";
        }
      } else {
        if (pireCas === 'A') {
          msgTitre = "🛑 ALERTE FRAUDE"; msgAlerte = "Ce client a déjà été enregistré avec ce numéro de pièce d'identité." + limiteTxt;
        } else if (pireCas === 'B') {
          msgTitre = "🛑 ANOMALIE GRAVE"; msgAlerte = "Ce numéro de pièce d'identité est déjà utilisé dans la base sous un autre nom !";
        } else if (pireCas === 'C') {
          couleur = "ORANGE"; msgTitre = "⚠️ HOMONYME DÉTECTÉ"; 
          msgAlerte = "Un client porte ce nom avec une autre pièce. Demandez une 2e pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente avant de forcer l'ajout.";
        }
      }

      var notePourSheet = "⚠️ Ajout forcé (Cas " + pireCas + ")";

      if (isBloque) {
        return { status: "BLOQUE", titre: msgTitre, message: msgAlerte, details: detailsDoublons };
      } else {
        return { status: "CONFIRMATION", titre: msgTitre, message: msgAlerte, couleur: couleur, details: detailsDoublons, noteForce: notePourSheet, flags: { identite: (pireCas==='A'||pireCas==='C'), piece: (pireCas==='A'||pireCas==='B') } };
      }
    } else {
      // Passage supplémentaire autorisé : trace dans les notes (« ℹ️ Passage 2/3 »), sans rouge
      if (passagesClient > 0) notes = ajouterNote_(notes, notePassage_(passagesClient + 1, passagesMax));
      feuille.appendRow([new Date(), texte_(nom), texte_(prenom), texte_(piece), montantSur_(montant), texte_(notes), ""]);
      // pas de rouge hérité de la ligne du dessus (mise en forme automatique de Sheets)
      feuille.getRange(feuille.getLastRow(), 1, 1, NB_COLONNES_LIGNE).setBackground(null);
      majAnnuaire_(nom, prenom, piece);
      return { status: "SUCCES", passage: passagesClient + 1, passagesMax: passagesMax,
               message: passagesClient > 0 ? "✅ Saisie enregistrée ! (passage " + (passagesClient + 1) + "/" + passagesMax + ")" : "✅ Saisie enregistrée !" };
    }
  } finally {
    libererVerrou_(lock); // écritures envoyées, puis verrou libéré (dans tous les cas)
  }
}

// Une saisie n'est acceptée que PENDANT l'offre (dates de l'opération, heure de Paris).
// Sinon (tablette restée ouverte après la clôture, appel direct…) -> refus, rien d'écrit.
// Renvoie null si la saisie est permise, sinon la réponse de refus.
function controlerPeriode_() {
  var dates = lireDates_();
  var refus = function (msg) { return { status: "BLOQUE", horsPeriode: true, titre: "🛑 HORS PÉRIODE", message: msg, details: [] }; };
  if (!dates.debut || !dates.fin) return refus("Aucune opération en cours : saisie impossible.");
  var auj = Utilities.formatDate(new Date(), fuseau_(), "yyyy-MM-dd");
  var jjmm = function (iso) { var p = iso.split('-'); return p.length === 3 ? p[2] + "/" + p[1] : iso; };
  if (auj < dates.debut) return refus("L'opération n'a pas encore commencé (début le " + jjmm(dates.debut) + ").");
  if (auj > dates.fin) return refus("L'opération est terminée (fin le " + jjmm(dates.fin) + ").");
  return null;
}

// Champs obligatoires (la tablette les vérifie déjà ; ceci couvre un appel direct).
// Renvoie null si complet, sinon la réponse de refus.
function controlerChamps_(nom, prenom, piece, montant) {
  // « vide » = rien de comparable (ex. un N° fait seulement de tirets, un nom « . ») :
  // une telle saisie ne pourrait jamais être reconnue comme doublon.
  var vide = function (v) { return v === null || v === undefined || v.toString().trim() === ""; };
  var manque = [];
  if (_normId_(nom) === "") manque.push("Nom");
  if (_normId_(prenom) === "") manque.push("Prénom");
  if (_normPiece_(piece) === "") manque.push("N° de pièce");
  if (vide(montant) && getConfig().MONTANT_OBLIGATOIRE !== "NON") manque.push(getConfig().LIBELLE_MONTANT);
  if (!manque.length) return null;
  return { status: "BLOQUE", titre: "🛑 SAISIE INCOMPLÈTE", message: "Champ(s) manquant(s) : " + manque.join(", ") + ".", details: [] };
}

// Ajout forcé (après confirmation d'un doublon à l'écran). Le serveur REFAIT la
// détection A/B/C sous verrou, sans se fier à la tablette :
//  - mode BLOQUANT + cas A/B -> refus (rien n'est écrit) ;
//  - sinon écriture, avec note d'alerte et couleurs CALCULÉES ICI (le cas réel,
//    pas celui vu par la tablette) ; plus de doublon -> ligne normale.
// messageErreur / flagIdentite / flagPiece : ignorés (gardés pour la
// compatibilité d'appel avec Index.html).
function forcerSaisie(nom, prenom, piece, montant, notes, messageErreur, flagIdentite, flagPiece, cle) {
  exigerTablette_(cle);
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les doublons forcés

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feuille = ss.getSheetByName(FEUILLE_SAISIES);
    if (!feuille) return { status: "BLOQUE", titre: "Erreur Serveur", message: "La feuille '" + FEUILLE_SAISIES + "' est introuvable." };
    var horsPeriode = controlerPeriode_();
    if (horsPeriode) return horsPeriode;
    var incomplet = controlerChamps_(nom, prenom, piece, montant);
    if (incomplet) return incomplet;
    
    nom = nom.toString().toUpperCase().trim(); 
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim(); 
    notes = notes ? notes.toString().replace(NOTES_SYSTEME_REGEX, '').trim() : "";
    if (montant && typeof montant === 'string' && montant.includes('.')) montant = montant.replace('.', ',');

    var modeSecurite = modeSecurite_(feuille);
    var det = detecterDoublons_(feuille, nom, prenom, piece, 0);
    var pireCas = det.pireCas;

    // 🛑 Mode BLOQUANT : un vrai doublon (A) ou une usurpation (B) ne se force jamais
    if (modeSecurite === "BLOQUANT" && (pireCas === 'A' || pireCas === 'B')) {
      return {
        status: "BLOQUE", cas: pireCas, titre: "🛑 SAISIE REFUSÉE",
        message: (pireCas === 'A') ? "Ce client a déjà profité de l'offre." : "Ce numéro de pièce d'identité est déjà associé à un autre client.",
        details: det.details
      };
    }

    var noteFinale = notes;
    if (pireCas) noteFinale = ajouterNote_(notes, "⚠️ Ajout forcé (Cas " + pireCas + ")");
    else if (det.passages > 0) noteFinale = ajouterNote_(notes, notePassage_(det.passages + 1, passagesMax_()));
    
    feuille.appendRow([new Date(), texte_(nom), texte_(prenom), texte_(piece), montantSur_(montant), texte_(noteFinale), ""]);
    var indexLigne = feuille.getLastRow();
    
    // 🧹 LE CORRECTIF : On efface l'héritage automatique de Google Sheets sur les 7 colonnes
    feuille.getRange(indexLigne, 1, 1, NB_COLONNES_LIGNE).setBackground(null);
    
    // 🎨 Couleurs selon le cas RÉEL (mêmes règles que onEdit)
    if (pireCas) {
      feuille.getRange(indexLigne, COL.NOTES).setBackground("#f4cccc");
      if (pireCas === 'A' || pireCas === 'C') feuille.getRange(indexLigne, COL.NOM, 1, 2).setBackground("#f4cccc"); // nom + prénom
      if (pireCas === 'A' || pireCas === 'B') feuille.getRange(indexLigne, COL.PIECE).setBackground("#f4cccc");
    }

    // Usurpation : la pièce figure déjà sous un AUTRE nom (même si le pire cas est A,
    // ex. l'usurpateur qui revient) -> on ne remplace pas le nom du titulaire
    if (!aUneUsurpation_(det)) majAnnuaire_(nom, prenom, piece);
    return { status: "SUCCES", cas: pireCas,
             message: pireCas ? "⚠️ Saisie forcée et enregistrée en rouge." : "✅ Saisie enregistrée !" };
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
  exigerTablette_(cle);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = ss.getSheetByName(FEUILLE_SAISIES);
  if (!feuille) return { trouve: false };

  var mode = feuille.getRange(CELLULE_MODE).getValue() || "SIGNALER";
  var pieceNorm = _normPiece_(piece);
  if (pieceNorm === "") return { trouve: false, mode: mode };

  var donnees = feuille.getDataRange().getValues();
  var matches = [];
  for (var i = 1; i < donnees.length; i++) {
    var pieceHisto = _normPiece_(donnees[i][IDX.PIECE]);
    if (pieceHisto !== "" && pieceHisto === pieceNorm) {
      matches.push({
        ligne: i + 1,
        date: (donnees[i][IDX.DATE] instanceof Date) ? Utilities.formatDate(donnees[i][IDX.DATE], fuseau_(), "dd/MM/yyyy HH:mm") : (donnees[i][IDX.DATE] ? donnees[i][IDX.DATE].toString() : ""),
        nom: donnees[i][IDX.NOM] ? donnees[i][IDX.NOM].toString() : "",
        prenom: donnees[i][IDX.PRENOM] ? donnees[i][IDX.PRENOM].toString() : "",
        montant: donnees[i][IDX.MONTANT] ? donnees[i][IDX.MONTANT].toString() : ""
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
// --- ANNUAIRE INTER-OFFRES (Niveau 3) — ACTIF (kill-switch: ANNUAIRE_ACTIF) ---
//     Index pièce -> Nom/Prénom des offres passées, pour pré-remplir la saisie.
//     Passer ANNUAIRE_ACTIF à false coupe tout (écriture, lecture, affichage).
//     Store NON autoritaire : la décision A/B/C reste sur « Saisies ».
// =================================================================
var ANNUAIRE_ACTIF = true;
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

// Normalisation d'un N° de pièce pour la COMPARAISON : majuscules, lettres et chiffres
// seulement (espaces, tirets, points, « / », « _ », caractères invisibles ignorés) ;
// un N° entièrement numérique est comparé SANS ses 0 initiaux.
// Raison : Google Sheets convertit en nombre un texte qui ressemble à un nombre
// ("012345678901" -> 12345678901, ex. anciennes CNI 2000-2009) ; les lignes déjà
// enregistrées ainsi doivent rester reconnues (sinon doublon manqué).
function _normPiece_(p) {
  if (p === null || p === undefined || p === "") return "";
  var n = p.toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '');
  return /^\d+$/.test(n) ? n.replace(/^0+(?=\d)/, '') : n;
}

// Valeur texte à écrire dans le Sheet telle quelle : l'apostrophe initiale
// (invisible) empêche Google Sheets de la convertir (nombre -> 0 perdu, date,
// formule « = »). Les valeurs vides ou non textuelles sont écrites telles quelles.
function texte_(v) {
  return (typeof v === 'string' && v !== "") ? "'" + v : v;
}

// Montant : laissé tel quel (Sheets le lit comme un nombre), sauf s'il pourrait être
// pris pour une formule (= + - @) -> écrit en texte.
function montantSur_(m) {
  return (typeof m === 'string' && /^\s*[=+\-@]/.test(m)) ? "'" + m : m;
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

// Données pré-chargées au démarrage pour la vérif IMMÉDIATE (locale) au blur :
// pièces de l'offre en cours (N2) + annuaire (N3). Rafraîchi au retour sur la page
// et après chaque saisie. NE remplace PAS la validation finale (toujours serveur).
function chargerCacheVerif(cle) {
  exigerTablette_(cle);
  return cacheVerif_();
}

function cacheVerif_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = ss.getSheetByName(FEUILLE_SAISIES);
  var mode = modeSecurite_(feuille);

  var offre = [];
  if (feuille) {
    var donnees = feuille.getDataRange().getValues();
    for (var i = 1; i < donnees.length; i++) {
      var pn = _normPiece_(donnees[i][IDX.PIECE]);
      // lignes sans N° gardées si elles ont un nom (un homonyme reste détectable)
      if (pn === "" && _normId_(donnees[i][IDX.NOM]) === "") continue;
      offre.push({
        pieceNorm: pn,
        ligne: i + 1,
        date: (donnees[i][IDX.DATE] instanceof Date) ? Utilities.formatDate(donnees[i][IDX.DATE], fuseau_(), "dd/MM/yyyy HH:mm") : (donnees[i][IDX.DATE] ? donnees[i][IDX.DATE].toString() : ""),
        nom: donnees[i][IDX.NOM] ? donnees[i][IDX.NOM].toString() : "",
        prenom: donnees[i][IDX.PRENOM] ? donnees[i][IDX.PRENOM].toString() : "",
        piece: donnees[i][IDX.PIECE] ? donnees[i][IDX.PIECE].toString() : "",
        montant: donnees[i][IDX.MONTANT] ? donnees[i][IDX.MONTANT].toString() : "",
        notes: donnees[i][IDX.NOTES] ? donnees[i][IDX.NOTES].toString() : ""
      });
    }
  }

  var annuaire = {};
  if (ANNUAIRE_ACTIF) {
    var fa = _feuilleAnnuaire_();
    var ad = fa.getDataRange().getValues();
    for (var j = 1; j < ad.length; j++) {
      var p = _normPiece_(ad[j][0]);
      if (p !== "") annuaire[p] = { nom: ad[j][1] ? ad[j][1].toString() : "", prenom: ad[j][2] ? ad[j][2].toString() : "" };
    }
  }

  // Réglages joints : un réglage changé sur une autre tablette (passages autorisés,
  // montant obligatoire…) est appliqué ici dès le rechargement suivant.
  return { mode: mode, offre: offre, annuaire: annuaire, annuaireActif: ANNUAIRE_ACTIF, modeAnnuaire: getModeAnnuaire(), config: getConfig() };
}

// Démarrage de la tablette : UN seul appel (au lieu de trois) pour le mode, les
// dates et le cache de vérification. Le cache (toute l'offre + l'annuaire) n'est
// envoyé que si l'offre est en cours : hors période, la saisie est impossible.
function demarrage(cle) {
  exigerTablette_(cle);
  return {
    infos: infosPanneau_(),
    dates: lireDates_(),
    config: getConfig(),
    cache: controlerPeriode_() ? null : cacheVerif_()
  };
}

// --- FONCTIONS SECONDAIRES ---
function getInfosPanneau(cle) {
  exigerTablette_(cle);
  return infosPanneau_();
}

function infosPanneau_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName(FEUILLE_SAISIES);
  var mode = modeSecurite_(f);
  return { success: true, mode: mode, annuaireActif: ANNUAIRE_ACTIF, modeAnnuaire: getModeAnnuaire() };
}

// Impression calculée directement depuis « Saisies » (colonnes A-F). Ne dépend
// plus des onglets A_IMPRIMER / OFFRE_COMPLETE (conservés tels quels pour le
// panneau du Sheet, en secours) et ne les modifie plus.
//  - 'jour'  : lignes dont la date tombe le jour choisi ("aujourdhui" ou
//              "yyyy-MM-dd"), date en jj/mm/aaaa — comme A_IMPRIMER.
//  - 'offre' : toutes les lignes non vides, date + heure — comme OFFRE_COMPLETE.
// Renvoie [] s'il n'y a aucune ligne à imprimer.
function genererDonneesImpression(type, dateChoisieStr, cle) {
  exigerTablette_(cle);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = ss.getSheetByName(FEUILLE_SAISIES);
  if (!feuille) return [];
  var tz = ss.getSpreadsheetTimeZone(); // même référence que INT()/TODAY() dans A_IMPRIMER
  var jour = null;
  if (type === 'jour') {
    jour = (dateChoisieStr === "aujourdhui") ? Utilities.formatDate(new Date(), tz, "yyyy-MM-dd") : dateChoisieStr;
  }
  return tableauImpression_(feuille, jour, tz);
}

// En-tête + lignes A-F affichées d'une feuille au format « Saisies ».
// jour (yyyy-MM-dd) : ne garde que ce jour-là, date en jj/mm/aaaa ;
// jour null : toutes les lignes non vides, telles qu'affichées.
function tableauImpression_(feuille, jour, tz) {
  var derniere = feuille.getLastRow();
  if (derniere < 2) return [];
  var cfg = getConfig();
  var entete = ENTETES_SAISIES.slice(0, IDX.MONTANT).concat([cfg.LIBELLE_MONTANT, cfg.LIBELLE_NOTES]);
  var plage = feuille.getRange(2, 1, derniere - 1, NB_COLONNES);
  var valeurs = plage.getValues();
  var affichage = plage.getDisplayValues();

  var lignes = [];
  for (var i = 0; i < valeurs.length; i++) {
    if (jour) {
      var d = valeurs[i][IDX.DATE];
      if (!(d instanceof Date) || Utilities.formatDate(d, tz, "yyyy-MM-dd") !== jour) continue;
      var ligne = affichage[i].slice();
      ligne[IDX.DATE] = Utilities.formatDate(d, tz, "dd/MM/yyyy");
      lignes.push(ligne);
    } else {
      if (affichage[i].join("") === "") continue;
      lignes.push(affichage[i]);
    }
  }
  return lignes.length ? [entete].concat(lignes) : [];
}

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
var ARCHIVES_RETENTION_ANS = 3;
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

// =================================================================
// --- CORRECTION / SUPPRESSION D'UNE SAISIE (espace responsable) ---
//     Remplace l'édition manuelle du Sheet. Mêmes règles que onEdit : la
//     ligne corrigée est RECONTRÔLÉE (A/B/C) contre toutes les autres lignes
//     de « Saisies », sous verrou. Mode BLOQUANT : A et B refusés. Sinon,
//     doublon -> confirmation explicite, puis marquage rouge + note d'alerte.
//     Garde-fou : la ligne doit encore contenir ce que l'écran affichait
//     (sinon refus : la feuille a bougé entre-temps).
// =================================================================
var ALERTE_FORCE_REGEX = /(?:\n|\|)?\s*⚠️ Ajout forcé \(Cas [ABC]\)/g;

// Normalisation d'un NOM / PRÉNOM pour la comparaison : majuscules, sans accents
// (HÉLÈNE = HELENE), lettres spéciales dépliées (Œ -> OE, Ø -> O, Ł -> L), sans
// espaces, tirets, apostrophes (toutes formes), points, virgules, « / », « _ » ni
// caractères invisibles (D'ARC = D’ARC = DARC). Sinon un homonyme (cas C) passait
// inaperçu. ⚠️ Miroir : Index.html::normIdJS.
var SEPARATEURS_NOM_REGEX = /[\s\-\u2010-\u2015\u2212'’‘ʼ`´′.,_\/\u200B-\u200D\uFEFF]/g;
function _normId_(v) {
  if (v === null || v === undefined || v === "") return "";
  return v.toString().toUpperCase().replace(/Œ/g, 'OE').replace(/Æ/g, 'AE').replace(/Ø/g, 'O').replace(/Ł/g, 'L').replace(/Đ/g, 'D')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(SEPARATEURS_NOM_REGEX, '');
}

// Saisies de l'offre en cours, la plus récente d'abord.
function listerSaisies(jeton) {
  exigerAdmin_(jeton);
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  if (!feuille) return [];
  var derniere = feuille.getLastRow();
  if (derniere < 2) return [];
  var plage = feuille.getRange(2, 1, derniere - 1, NB_COLONNES);
  var valeurs = plage.getValues();
  var affichage = plage.getDisplayValues();
  var liste = [];
  for (var i = 0; i < valeurs.length; i++) {
    if (affichage[i].join("") === "") continue;
    var notes = valeurs[i][IDX.NOTES] ? valeurs[i][IDX.NOTES].toString() : "";
    liste.push({
      ligne: i + 2,
      date: affichage[i][IDX.DATE],
      nom: valeurs[i][IDX.NOM] ? valeurs[i][IDX.NOM].toString() : "",
      prenom: valeurs[i][IDX.PRENOM] ? valeurs[i][IDX.PRENOM].toString() : "",
      piece: valeurs[i][IDX.PIECE] ? valeurs[i][IDX.PIECE].toString() : "",
      montant: affichage[i][IDX.MONTANT],
      notes: notes.replace(NOTES_SYSTEME_REGEX, '').trim(),
      alerte: notes !== notes.replace(ALERTE_FORCE_REGEX, '')
    });
  }
  return liste.reverse();
}

// La ligne contient-elle toujours ce que l'écran affichait ?
function verifierLigneAttendue_(feuille, ligne, attendu) {
  ligne = Number(ligne);
  if (!(ligne >= 2 && ligne <= feuille.getLastRow() && Math.floor(ligne) === ligne)) {
    throw new Error("Ligne introuvable : rechargez la liste.");
  }
  var v = feuille.getRange(ligne, COL.NOM, 1, 3).getValues()[0]; // nom, prénom, N°
  var a = attendu || {};
  if ((v[0] || "").toString() !== (a.nom || "") || (v[1] || "").toString() !== (a.prenom || "") || (v[2] || "").toString() !== (a.piece || "")) {
    throw new Error("Cette ligne a changé entre-temps : rechargez la liste.");
  }
  return ligne;
}

// Détection A/B/C sur « Saisies » (mêmes règles que traiterSaisie / onEdit),
// utilisée par forcerSaisie et modifierSaisie. ligneExclue : n° de ligne à ne
// pas comparer (la ligne corrigée elle-même), ou 0.
// Même client (A) : doublon seulement si ses passages atteignent la limite autorisée.
// Renvoie { pireCas: 'A'|'B'|'C'|null, details: [...], passages: nb de passages du client }.
function detecterDoublons_(feuille, nom, prenom, piece, ligneExclue) {
  var nomN = _normId_(nom), prenomN = _normId_(prenom), pieceN = _normPiece_(piece);
  var donnees = feuille.getDataRange().getValues();
  var pireCas = null, details = [], passages = 0;
  for (var i = 1; i < donnees.length; i++) {
    if (i === ligneExclue - 1) continue;
    var memeId = (nomN !== "" && prenomN !== "" && _normId_(donnees[i][IDX.NOM]) === nomN && _normId_(donnees[i][IDX.PRENOM]) === prenomN);
    var memePiece = (pieceN !== "" && _normPiece_(donnees[i][IDX.PIECE]) === pieceN);
    if (!memeId && !memePiece) continue;
    var t = (memeId && memePiece) ? 'A' : (memePiece ? 'B' : 'C');
    if (t === 'A') passages++;
    else if (t === 'B') pireCas = 'B';
    else if (t === 'C' && pireCas !== 'B') pireCas = 'C';
    details.push({
      ligne: i + 1, type: t,
      date: (donnees[i][IDX.DATE] instanceof Date) ? Utilities.formatDate(donnees[i][IDX.DATE], fuseau_(), "dd/MM/yyyy HH:mm") : (donnees[i][IDX.DATE] ? donnees[i][IDX.DATE].toString() : ""),
      nom: donnees[i][IDX.NOM] ? donnees[i][IDX.NOM].toString() : "", prenom: donnees[i][IDX.PRENOM] ? donnees[i][IDX.PRENOM].toString() : "",
      piece: donnees[i][IDX.PIECE] ? donnees[i][IDX.PIECE].toString() : "", montant: donnees[i][IDX.MONTANT] ? donnees[i][IDX.MONTANT].toString() : "",
      notes: donnees[i][IDX.NOTES] ? donnees[i][IDX.NOTES].toString() : ""
    });
  }
  if (passages >= passagesMax_()) pireCas = 'A';
  return { pireCas: pireCas, details: details, passages: passages };
}

// La pièce est-elle déjà enregistrée sous un autre nom (au moins une ligne de type B) ?
function aUneUsurpation_(det) {
  return det.details.some(function (d) { return d.type === 'B'; });
}

// Recalcule la note « ⚠️ Ajout forcé (Cas X) » et le rouge de chaque ligne de « Saisies ».
// Même règle qu'à l'enregistrement : une ligne est marquée si elle double une ligne
// PLUS ANCIENNE (au-dessus) ; la première occurrence reste propre. La note saisie par
// l'hôtesse est conservée. Appelée après une correction ou une suppression.
function recalculerMarquages_(feuille) {
  var derniere = feuille.getLastRow();
  if (derniere < 2) return;
  var plage = feuille.getRange(2, 1, derniere - 1, NB_COLONNES_LIGNE);
  var v = plage.getValues();
  // Notes lues TELLES QU'AFFICHÉES : une note que Sheets a prise pour une date (« 3/4 »)
  // reste « 03/04 » et n'est pas réécrite en « Fri Apr 03 2026 00:00:00 GMT… »
  var notesAffichees = feuille.getRange(2, COL.NOTES, derniere - 1, 1).getDisplayValues();
  var notesChangees = false;
  var rouge = "#f4cccc";
  var max = passagesMax_();
  var notes = [], fonds = [];
  for (var i = 0; i < v.length; i++) {
    var nomN = _normId_(v[i][IDX.NOM]), prenomN = _normId_(v[i][IDX.PRENOM]), pieceN = _normPiece_(v[i][IDX.PIECE]);
    var pireCas = null, passages = 0;
    if (nomN || prenomN || pieceN) {
      for (var j = 0; j < i; j++) {
        var memeId = (nomN !== "" && prenomN !== "" && _normId_(v[j][IDX.NOM]) === nomN && _normId_(v[j][IDX.PRENOM]) === prenomN);
        var memePiece = (pieceN !== "" && _normPiece_(v[j][IDX.PIECE]) === pieceN);
        if (memeId && memePiece) passages++;
        else if (memePiece) pireCas = 'B';
        else if (memeId && pireCas !== 'B') pireCas = 'C';
      }
      if (passages >= max) pireCas = 'A';
    }
    var noteActuelle = (v[i][IDX.NOTES] instanceof Date) ? notesAffichees[i][0] : (v[i][IDX.NOTES] === null || v[i][IDX.NOTES] === undefined ? "" : v[i][IDX.NOTES].toString());
    var notePropre = noteActuelle.replace(NOTES_SYSTEME_REGEX, '').trim();
    var noteSysteme = pireCas ? "⚠️ Ajout forcé (Cas " + pireCas + ")" : (passages > 0 ? notePassage_(passages + 1, max) : "");
    var noteVoulue = noteSysteme ? ajouterNote_(notePropre, noteSysteme) : notePropre;
    if (noteVoulue !== noteActuelle) notesChangees = true;
    notes.push([texte_(noteVoulue)]);
    fonds.push([null,
      (pireCas === 'A' || pireCas === 'C') ? rouge : null, (pireCas === 'A' || pireCas === 'C') ? rouge : null,
      (pireCas === 'A' || pireCas === 'B') ? rouge : null, null, pireCas ? rouge : null, null]);
  }
  if (notesChangees) feuille.getRange(2, COL.NOTES, v.length, 1).setValues(notes);
  plage.setBackgrounds(fonds);
}

function messagesDoublon_(mode, pireCas) {
  var r = { bloque: false, couleur: "ROUGE", titre: "", message: "" };
  var homonyme = "Un client porte ce nom avec une autre pièce. Demandez une 2e pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente.";
  if (pireCas === 'C') { r.couleur = "ORANGE"; r.titre = "⚠️ HOMONYME DÉTECTÉ"; r.message = homonyme; return r; }
  if (mode === "BLOQUANT") {
    r.bloque = true; r.titre = "🛑 CORRECTION REFUSÉE";
    r.message = (pireCas === 'A') ? "Ce client a déjà profité de l'offre (autre ligne)." : "Ce numéro de pièce d'identité est déjà associé à un autre client.";
  } else {
    r.titre = (pireCas === 'A') ? "🛑 ALERTE FRAUDE" : "🛑 ANOMALIE GRAVE";
    r.message = (pireCas === 'A') ? "Ce client est déjà enregistré avec ce numéro de pièce (autre ligne)." : "Ce numéro de pièce d'identité est déjà utilisé sous un autre nom !";
  }
  return r;
}

// nouveau = { nom, prenom, piece, montant, notes } ; forcer = confirmer malgré un doublon.
function modifierSaisie(ligne, attendu, nouveau, forcer, jeton) {
  exigerAdmin_(jeton);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
    if (!feuille) throw new Error("La feuille '" + FEUILLE_SAISIES + "' est introuvable.");
    ligne = verifierLigneAttendue_(feuille, ligne, attendu);

    var n = nouveau || {};
    var nom = (n.nom || "").toString().toUpperCase().trim();
    var prenom = (n.prenom || "").toString().toUpperCase().trim();
    var piece = (n.piece || "").toString().toUpperCase().trim();
    var montant = (n.montant || "").toString().trim();
    if (montant.indexOf('.') !== -1) montant = montant.replace('.', ',');
    var notesPropres = (n.notes || "").toString().replace(NOTES_SYSTEME_REGEX, '').trim();
    if (!_normId_(nom) || !_normId_(prenom) || !_normPiece_(piece)) throw new Error("Le Nom, le Prénom et le N° de pièce sont obligatoires.");
    if (getConfig().MONTANT_OBLIGATOIRE !== "NON" && !montant) throw new Error("Le montant est obligatoire.");

    // Recontrôle A/B/C contre toutes les AUTRES lignes (comme onEdit)
    var det = detecterDoublons_(feuille, nom, prenom, piece, ligne);
    var pireCas = det.pireCas, details = det.details;

    var mode = modeSecurite_(feuille);
    if (pireCas) {
      var m = messagesDoublon_(mode, pireCas);
      if (m.bloque) return { status: "BLOQUE", titre: m.titre, message: m.message, details: details };
      if (!forcer) return { status: "CONFIRMATION", titre: m.titre, message: m.message, couleur: m.couleur, details: details };
    }

    feuille.getRange(ligne, COL.NOM, 1, NB_COLONNES_SAISIE).setValues([[texte_(nom), texte_(prenom), texte_(piece), montantSur_(montant), texte_(notesPropres)]]);
    // Note d'alerte + rouge recalculés pour TOUTES les lignes (la correction peut créer
    // ou faire disparaître un doublon ailleurs dans l'offre)
    recalculerMarquages_(feuille);
    if (!aUneUsurpation_(det)) majAnnuaire_(nom, prenom, piece);
    return { status: "SUCCES", message: pireCas ? "⚠️ Correction forcée (Cas " + pireCas + ") : le doublon est marqué en rouge." : "✅ Saisie corrigée." };
  } finally {
    libererVerrou_(lock);
  }
}

function supprimerSaisie(ligne, attendu, jeton) {
  exigerAdmin_(jeton);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
    if (!feuille) throw new Error("La feuille '" + FEUILLE_SAISIES + "' est introuvable.");
    ligne = verifierLigneAttendue_(feuille, ligne, attendu);
    feuille.deleteRow(ligne);
    recalculerMarquages_(feuille); // un doublon de la ligne supprimée n'en est peut-être plus un
    return "🗑️ Saisie supprimée.";
  } finally {
    libererVerrou_(lock);
  }
}

function basculerModeWebApp(jeton) {
  exigerAdmin_(jeton);
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  if (!feuille) throw new Error("La feuille '" + FEUILLE_SAISIES + "' est introuvable.");
  var modeActuel = modeSecurite_(feuille);
  var nouveauMode = (modeActuel === "SIGNALER") ? "BLOQUANT" : "SIGNALER";
  feuille.getRange(CELLULE_MODE).setValue(nouveauMode); return nouveauMode;
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

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 APPLICATION')
    .addItem('⚙️ Ouvrir le panneau de contrôle', 'afficherPanneau')
    .addItem('🧰 Installer / vérifier l\'installation', 'installerDepuisMenu')
    .addItem('🔑 Code d\'activation (créer le code responsable)', 'afficherCodeActivation')
    .addToUi();
  if (estCopieNonInstallee_()) {
    try { SpreadsheetApp.getActiveSpreadsheet().toast("Nouvelle copie : menu 🚀 APPLICATION → 🧰 Installer.", "Installation", 20); } catch (e) {}
    return;
  }
  afficherPanneau(); 
}

function afficherPanneau() {
  var html = HtmlService.createHtmlOutputFromFile('Panneau').setTitle('⚙️ Contrôle').setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

function allerVersImpression(dateChoisieStr) {
  exigerEditeur_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName(FEUILLE_IMPRESSION);
  if (!f) return;
  if (dateChoisieStr === "aujourdhui") f.getRange(CELLULE_JOUR_IMPRESSION).clearContent();
  else f.getRange(CELLULE_JOUR_IMPRESSION).setValue("'" + dateChoisieStr);
  SpreadsheetApp.flush(); ss.setActiveSheet(f);
}

function allerVersOffre() {
  exigerEditeur_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName(FEUILLE_OFFRE_COMPLETE);
  if (f) ss.setActiveSheet(f);
}

// =================================================================
// --- CERVEAU INTERNE DU GOOGLE SHEETS (SUR MODIFICATION MANUELLE) ---
// =================================================================
function onEdit(e) {
  if (!e || !e.range) return;
  var feuille = e.range.getSheet();
  
  // On ne déclenche la magie que sur la bonne feuille
  if (feuille.getName() !== FEUILLE_SAISIES) return;
  
  var premiere = e.range.getRow();
  var colEdit = e.range.getColumn();
  var nbLignes = e.range.getNumRows();
  var nbCols = e.range.getNumColumns();
  var derniere = premiere + nbLignes - 1;
  
  // On ignore la ligne 1 (en-têtes) et on s'arrête à la colonne F
  if (derniere < 2 || colEdit > COL.NOTES) return;
  var uneCellule = (nbLignes === 1 && nbCols === 1);
  var debut = Math.max(2, premiere);
  // Nom, prénom ou N° touchés ? (sinon : montant / notes seulement, jamais annulé)
  var toucheIdentite = colEdit <= COL.PIECE && colEdit + nbCols - 1 >= COL.NOM;

  // Même verrou que les tablettes : une saisie ne peut pas s'intercaler pendant le contrôle
  var lock = null, verrou = false;
  try { lock = LockService.getScriptLock(); verrou = lock.tryLock(10000); } catch (err) { verrou = false; }
  try {
    // 1️⃣ + 2️⃣ Horodatage et formatage, ligne par ligne (un collage peut couvrir
    //    plusieurs lignes : chacune est traitée, pas seulement la première)
    for (var l = debut; l <= derniere; l++) {
      preparerLigneEditee_(feuille, l, colEdit, nbCols, uneCellule ? e.value : undefined, uneCellule);
    }
    SpreadsheetApp.flush();

    // 3️⃣ Mode BLOQUANT : une ligne dont le nom / prénom / N° vient d'être modifié pour
    //    créer un doublon (A) ou une usurpation (B) est annulée (ancienne valeur remise).
    var modeSecurite = modeSecurite_(feuille);
    var refus = [];
    if (modeSecurite === "BLOQUANT" && toucheIdentite) {
      for (var ligne = debut; ligne <= derniere; ligne++) {
        var plageAnnulee = uneCellule ? e.range : feuille.getRange(ligne, colEdit, 1, Math.min(nbCols, COL.NOTES - colEdit + 1));
        var cas = controlerLigneEditee_(feuille, ligne, plageAnnulee, uneCellule ? e.oldValue : undefined, colEdit);
        if (cas) refus.push("ligne " + ligne + " (Cas " + cas + ")");
      }
    }
    // Ligne entièrement vidée : on efface aussi sa date
    var bloc = feuille.getRange(debut, COL.NOM, derniere - debut + 1, NB_COLONNES_SAISIE).getValues();
    bloc.forEach(function (r, k) {
      if (r.every(function (v) { return v === "" || v === null; })) feuille.getRange(debut + k, COL.DATE).clearContent();
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
      "Mode BLOQUANT actif :\nCe doublon ou cette usurpation est strictement interdit(e).\n\nModification annulée : " + refus.join(", ") + ".",
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
  var celluleDate = feuille.getRange(ligne, COL.DATE);
  if (celluleDate.isBlank() && colEdit + nbCols - 1 > COL.DATE) {
    var rempli = uneCellule ? !!valeur : feuille.getRange(ligne, COL.NOM, 1, NB_COLONNES_SAISIE).getValues()[0].some(function (v) { return v !== "" && v !== null; });
    if (rempli && (colEdit > COL.DATE || !uneCellule)) celluleDate.setValue(new Date());
  }
  // 2️⃣ FORMATAGE AUTOMATIQUE (Majuscules, virgules)
  for (var c = Math.max(colEdit, COL.NOM); c <= Math.min(colEdit + nbCols - 1, COL.MONTANT); c++) {
    var v = uneCellule ? valeur : feuille.getRange(ligne, c).getValue();
    if (!uneCellule && c <= COL.PIECE && (v instanceof Date || typeof v === 'number')) v = feuille.getRange(ligne, c).getDisplayValue();
    if (v === undefined || v === null || v === "" || v instanceof Date) continue;
    if (c <= COL.PIECE) {
      // en texte : Sheets a déjà converti la frappe (ex. N° "0123" -> 123), on rétablit la valeur
      feuille.getRange(ligne, c).setValue(texte_(v.toString().toUpperCase().trim()));
    } else if (v.toString().indexOf('.') !== -1 && typeof v === 'string') {
      feuille.getRange(ligne, c).setValue(v.toString().replace('.', ','));
    }
  }
}

// Mode BLOQUANT : la ligne modifiée à la main double-t-elle une AUTRE ligne (A) ou
// usurpe-t-elle une pièce (B) ? Si oui, la modification est annulée — ancienne valeur
// remise pour une cellule seule, cellules vidées pour un collage — et le cas est
// renvoyé (pour l'alerte) ; sinon null. Le marquage est fait ensuite pour toute
// l'offre par recalculerMarquages_.
function controlerLigneEditee_(feuille, ligneEdit, plageAnnulee, ancienneValeur, colEdit) {
  var rowData = feuille.getRange(ligneEdit, 1, 1, NB_COLONNES).getValues()[0];
  if (!_normId_(rowData[IDX.NOM]) && !_normPiece_(rowData[IDX.PIECE])) return null;
  var det = detecterDoublons_(feuille, rowData[IDX.NOM], rowData[IDX.PRENOM], rowData[IDX.PIECE], ligneEdit);
  if (det.pireCas !== 'A' && det.pireCas !== 'B') return null;
  if (ancienneValeur !== undefined && ancienneValeur !== null) {
    plageAnnulee.setValue(colEdit >= COL.NOM && colEdit <= COL.PIECE ? texte_(ancienneValeur.toString()) : ancienneValeur);
  } else {
    plageAnnulee.clearContent();
  }
  // Ligne redevenue vide (ex. nouvelle ligne refusée) : pas de date orpheline
  var reste = feuille.getRange(ligneEdit, COL.NOM, 1, NB_COLONNES_SAISIE).getValues()[0];
  if (reste.every(function (v) { return v === "" || v === null; })) feuille.getRange(ligneEdit, COL.DATE).clearContent();
  return det.pireCas;
}


// =================================================================
// --- ROBOT DE NUIT : CLÔTURE AUTOMATIQUE ---
// =================================================================

function verificationClotureNocturne(e) {
  exigerDeclencheurOuEditeur_(e);
  // Passage du robot noté : l'espace responsable signale un robot qui ne tourne plus
  var props = PropertiesService.getDocumentProperties();
  props.setProperties({ DERNIERE_NUIT: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"), DERNIERE_NUIT_MS: String(Date.now()) });

  // Archives de plus de 3 ans : supprimées (n'empêche jamais la clôture)
  try { purgerArchives_(); } catch (e) { Logger.log("Purge des archives : " + e); }

  var dates = lireDates_();
  
  // S'il n'y a pas de date de fin enregistrée, le robot se rendort
  if (!dates.fin || dates.fin === "") {
    return; 
  }
  
  // Jour d'aujourd'hui dans le fuseau du projet, comparé au texte « aaaa-mm-jj »
  // (pas de new Date("aaaa-mm-jj"), lu en UTC : décalage hors métropole)
  var aujourdhui = Utilities.formatDate(new Date(), fuseau_(), "yyyy-MM-dd");
  
  // Si la date d'aujourd'hui est STRICTEMENT supérieure à la date de fin
  // Ça veut dire que l'offre s'est terminée hier. On archive !
  if (aujourdhui > dates.fin) {
    // On appelle ta fonction d'archivage existante
    archiverOffre_(); 
    
    // On efface les dates en mémoire pour verrouiller la tablette le matin
    enregistrerDates_("", ""); 
  }
}

// =================================================================
// --- GESTION DES DATES DE L'OPÉRATION (MÉMOIRE SECRÈTE) ---
// =================================================================

function getDatesOperation(cle) {
  exigerTablette_(cle);
  return lireDates_();
}

function lireDates_() {
  var memoire = PropertiesService.getDocumentProperties();
  return {
    debut: memoire.getProperty('DATE_DEBUT') || '',
    fin: memoire.getProperty('DATE_FIN') || ''
  };
}

function setDatesOperation(dateDebut, dateFin, jeton) {
  exigerAdmin_(jeton);
  dateDebut = (dateDebut || "").toString().trim();
  dateFin = (dateFin || "").toString().trim();
  var iso = /^\d{4}-\d{2}-\d{2}$/;
  if (dateDebut !== "" || dateFin !== "") {
    if (!iso.test(dateDebut) || !iso.test(dateFin)) throw new Error("Saisissez la date de début ET la date de fin (ou aucune des deux pour arrêter l'opération).");
    if (dateDebut > dateFin) throw new Error("La date de début doit précéder la date de fin.");
  }
  var message = enregistrerDates_(dateDebut, dateFin);
  // Offre qui commence plus tard alors que « Saisies » contient encore des lignes :
  // l'ancienne offre n'a pas été clôturée -> elles seraient mélangées avec la nouvelle.
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  var auj = Utilities.formatDate(new Date(), fuseau_(), "yyyy-MM-dd");
  if (dateDebut > auj && f && f.getLastRow() > 1) {
    message += "\n⚠️ Des saisies sont encore dans la liste : clôturez l'offre précédente avant le " +
      dateDebut.split('-').reverse().join('/') + ", sinon elles seront mélangées avec la nouvelle.";
  }
  return message;
}

function enregistrerDates_(dateDebut, dateFin) {
  var memoire = PropertiesService.getDocumentProperties();
  memoire.setProperty('DATE_DEBUT', dateDebut);
  memoire.setProperty('DATE_FIN', dateFin);

  return "Dates enregistrées avec succès !";
}
