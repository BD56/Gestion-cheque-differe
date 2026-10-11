function doGet(e) {
  nettoyerSiCopie_(); // copie du modèle (ou d'un autre classeur) : repart sans code/dates/réglages hérités
  // Nouvelle structure : crée « Saisies » si elle n'existe pas encore (rien n'est écrasé)
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies")) installerFeuilles_();
  var cfg = getConfig();
  var page = HtmlService.createTemplateFromFile('Index');
  page.cfg = cfg;
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
function installer() {
  var rapport = [];
  if (nettoyerSiCopie_()) rapport.push("Nouvelle copie détectée : code responsable, dates et réglages hérités effacés.");
  rapport = rapport.concat(installerFeuilles_());
  var existants = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
  if (existants.indexOf('verificationClotureNocturne') === -1) {
    ScriptApp.newTrigger('verificationClotureNocturne').timeBased().everyDays(1).atHour(1).create();
    rapport.push("Déclencheur créé : clôture automatique (chaque nuit vers 1h).");
  }
  if (ANNUAIRE_ACTIF && existants.indexOf('purgerAnnuaire') === -1) {
    ScriptApp.newTrigger('purgerAnnuaire').timeBased().everyDays(1).atHour(3).create();
    rapport.push("Déclencheur créé : purge de l'annuaire (chaque nuit vers 3h).");
  }
  if (rapport.length === 0) rapport.push("Rien à faire : tout est déjà en place.");
  Logger.log(rapport.join("\n"));
  return rapport.join("\n");
}

// Depuis le menu du Sheet : installe puis affiche le compte rendu + la suite.
function installerDepuisMenu() {
  var rapport = installer();
  var ui = SpreadsheetApp.getUi();
  ui.alert("🧰 Installation",
    rapport +
    "\n\nSi l'application n'est pas encore en ligne : Extensions → Apps Script → " +
    "Déployer → Nouveau déploiement → Application Web (voir INSTALLATION.md).",
    ui.ButtonSet.OK);
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
  if (!ss.getSheetByName("Saisies")) {
    var f = ss.insertSheet("Saisies", 0);
    f.getRange(1, 1, 1, 6).setValues([["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos"]]).setFontWeight("bold");
    f.getRange("A2:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
    f.getRange("Z1").setValue("SIGNALER");
    f.setFrozenRows(1);
    faits.push("Feuille « Saisies » créée.");
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
  PRECISION_NOTES: "numéro caisse, etc..." // affichée entre parenthèses (vide = rien)
};

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
    if (v.length > 100) throw new Error("« " + k + " » : 100 caractères maximum.");
    if (obligatoires.indexOf(k) !== -1 && v === "") throw new Error("« " + k + " » ne peut pas être vide.");
    aEcrire['CFG_' + k] = v;
  }
  PropertiesService.getDocumentProperties().setProperties(aEcrire);
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
var ADMIN_PIN_REGEX = /^\d{4,8}$/;
var ADMIN_ESSAIS_MAX = 5;
var ADMIN_BLOCAGE_MIN = 15;
var ADMIN_SESSION_SEC = 600;

function empreintePin_(sel, pin) {
  var octets = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sel + ":" + pin, Utilities.Charset.UTF_8);
  return Utilities.base64Encode(octets);
}

function etatAdmin() {
  return { pinDefini: !!PropertiesService.getDocumentProperties().getProperty('ADMIN_PIN_HASH') };
}

function creerJetonAdmin_() {
  var jeton = Utilities.getUuid();
  CacheService.getScriptCache().put('ADM_' + jeton, '1', ADMIN_SESSION_SEC);
  return jeton;
}

function jetonValide_(jeton) {
  if (!jeton || typeof jeton !== 'string') return false;
  var cache = CacheService.getScriptCache();
  if (cache.get('ADM_' + jeton) !== '1') return false;
  cache.put('ADM_' + jeton, '1', ADMIN_SESSION_SEC); // prolonge (10 min d'inactivité)
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

// Code juste -> { ok:true, jeton } ; sinon { ok:false, message }
function ouvrirSessionAdmin(pin) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getDocumentProperties();
    var hash = props.getProperty('ADMIN_PIN_HASH');
    if (!hash) return { ok: false, message: "Aucun code défini : créez-le d'abord." };
    var bloque = Number(props.getProperty('ADMIN_BLOQUE_JUSQUA') || 0);
    if (bloque > Date.now()) {
      return { ok: false, message: "Trop d'essais. Réessayez dans " + Math.ceil((bloque - Date.now()) / 60000) + " min." };
    }
    if (empreintePin_(props.getProperty('ADMIN_PIN_SEL'), (pin || "").toString()) === hash) {
      props.setProperty('ADMIN_ECHECS', '0');
      return { ok: true, jeton: creerJetonAdmin_() };
    }
    var echecs = Number(props.getProperty('ADMIN_ECHECS') || 0) + 1;
    if (echecs >= ADMIN_ESSAIS_MAX) {
      props.setProperties({ ADMIN_ECHECS: '0', ADMIN_BLOQUE_JUSQUA: String(Date.now() + ADMIN_BLOCAGE_MIN * 60000) });
      return { ok: false, message: "Code faux. Trop d'essais : bloqué " + ADMIN_BLOCAGE_MIN + " min." };
    }
    props.setProperty('ADMIN_ECHECS', String(echecs));
    return { ok: false, message: "Code faux (" + (ADMIN_ESSAIS_MAX - echecs) + " essai(s) restant(s))." };
  } finally {
    lock.releaseLock();
  }
}

// Création (si aucun code) ou changement (session responsable requise).
function definirPin(nouveauPin, jeton) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getDocumentProperties();
    if (props.getProperty('ADMIN_PIN_HASH')) exigerAdmin_(jeton);
    nouveauPin = (nouveauPin || "").toString();
    if (!ADMIN_PIN_REGEX.test(nouveauPin)) return { ok: false, message: "Le code doit contenir 4 à 8 chiffres." };
    var sel = Utilities.getUuid();
    props.setProperties({
      ADMIN_PIN_SEL: sel,
      ADMIN_PIN_HASH: empreintePin_(sel, nouveauPin),
      ADMIN_ECHECS: '0',
      ADMIN_BLOQUE_JUSQUA: '0'
    });
    return { ok: true, jeton: (jeton && jetonValide_(jeton)) ? jeton : creerJetonAdmin_() };
  } finally {
    lock.releaseLock();
  }
}

function fermerSessionAdmin(jeton) {
  if (jeton && typeof jeton === 'string') CacheService.getScriptCache().remove('ADM_' + jeton);
}

// Secours (panneau du Sheet, éditeurs uniquement) : efface le code. Le prochain
// passage dans l'espace responsable demandera d'en créer un nouveau.
function reinitialiserPinPanneau() {
  if (!estEditeurDuClasseur_()) throw new Error("Réservé aux éditeurs du classeur.");
  var props = PropertiesService.getDocumentProperties();
  ['ADMIN_PIN_HASH', 'ADMIN_PIN_SEL', 'ADMIN_ECHECS', 'ADMIN_BLOQUE_JUSQUA'].forEach(function (k) { props.deleteProperty(k); });
  return "✅ Code responsable effacé. Il sera redemandé (création) dans l'application.";
}

// Tout ce qu'affiche l'espace responsable, en un appel.
function getInfosAdmin(jeton) {
  exigerAdmin_(jeton);
  var f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies");
  return {
    mode: f ? (f.getRange("Z1").getValue() || "SIGNALER") : "SIGNALER",
    dates: getDatesOperation(),
    annuaireActif: ANNUAIRE_ACTIF,
    modeAnnuaire: getModeAnnuaire(),
    config: getConfig()
  };
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

    var horsPeriode = controlerPeriode_();
    if (horsPeriode) return horsPeriode;

    var modeSecurite = feuille.getRange("Z1").getValue() || "SIGNALER";
    
    // Nettoyage standard pour l'affichage
    nom = nom.toString().toUpperCase().trim();
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim();
    notes = notes ? notes.toString().trim() : "";
    if (montant && typeof montant === 'string' && montant.includes('.')) montant = montant.replace('.', ',');
    
    // Nettoyage profond pour la comparaison (cf. _normId_ / _normPiece_) - UNE FOIS
    var nomNorm = _normId_(nom);
    var prenomNorm = _normId_(prenom);
    var pieceNorm = _normPiece_(piece);
    
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
      
      var nomHistoNorm = _normId_(nomHisto);
      var prenomHistoNorm = _normId_(prenomHisto);
      var pieceHistoNorm = _normPiece_(pieceHisto);
      
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
      feuille.appendRow([new Date(), texte_(nom), texte_(prenom), texte_(piece), montant, texte_(notes), ""]);
      majAnnuaire_(nom, prenom, piece);
      return { status: "SUCCES", message: "✅ Saisie enregistrée !" };
    }
  } finally {
    lock.releaseLock(); // Libérer le verrou dans tous les cas
  }
}

// Une saisie n'est acceptée que PENDANT l'offre (dates de l'opération, heure de Paris).
// Sinon (tablette restée ouverte après la clôture, appel direct…) -> refus, rien d'écrit.
// Renvoie null si la saisie est permise, sinon la réponse de refus.
function controlerPeriode_() {
  var dates = getDatesOperation();
  var refus = function (msg) { return { status: "BLOQUE", horsPeriode: true, titre: "🛑 HORS PÉRIODE", message: msg, details: [] }; };
  if (!dates.debut || !dates.fin) return refus("Aucune opération en cours : saisie impossible.");
  var auj = Utilities.formatDate(new Date(), "Europe/Paris", "yyyy-MM-dd");
  var jjmm = function (iso) { var p = iso.split('-'); return p.length === 3 ? p[2] + "/" + p[1] : iso; };
  if (auj < dates.debut) return refus("L'opération n'a pas encore commencé (début le " + jjmm(dates.debut) + ").");
  if (auj > dates.fin) return refus("L'opération est terminée (fin le " + jjmm(dates.fin) + ").");
  return null;
}

// Ajout forcé (après confirmation d'un doublon à l'écran). Le serveur REFAIT la
// détection A/B/C sous verrou, sans se fier à la tablette :
//  - mode BLOQUANT + cas A/B -> refus (rien n'est écrit) ;
//  - sinon écriture, avec note d'alerte et couleurs CALCULÉES ICI (le cas réel,
//    pas celui vu par la tablette) ; plus de doublon -> ligne normale.
// messageErreur / flagIdentite / flagPiece : ignorés (gardés pour la
// compatibilité d'appel avec Index.html).
function forcerSaisie(nom, prenom, piece, montant, notes, messageErreur, flagIdentite, flagPiece) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Verrou pour éviter les doublons forcés

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var feuille = ss.getSheetByName("Saisies");
    if (!feuille) return { status: "BLOQUE", titre: "Erreur Serveur", message: "La feuille 'Saisies' est introuvable." };
    var horsPeriode = controlerPeriode_();
    if (horsPeriode) return horsPeriode;
    
    nom = nom.toString().toUpperCase().trim(); 
    prenom = prenom.toString().toUpperCase().trim();
    piece = piece.toString().toUpperCase().trim(); 
    notes = notes ? notes.toString().replace(ALERTE_FORCE_REGEX, '').trim() : "";
    if (montant && typeof montant === 'string' && montant.includes('.')) montant = montant.replace('.', ',');

    var modeSecurite = feuille.getRange("Z1").getValue() || "SIGNALER";
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
    if (pireCas) {
      var alerte = "⚠️ Ajout forcé (Cas " + pireCas + ")";
      noteFinale = (notes !== "") ? notes + "\n" + alerte : alerte;
    }
    
    feuille.appendRow([new Date(), texte_(nom), texte_(prenom), texte_(piece), montant, texte_(noteFinale), ""]);
    var indexLigne = feuille.getLastRow();
    
    // 🧹 LE CORRECTIF : On efface l'héritage automatique de Google Sheets sur les 7 colonnes
    feuille.getRange(indexLigne, 1, 1, 7).setBackground(null);
    
    // 🎨 Couleurs selon le cas RÉEL (mêmes règles que onEdit)
    if (pireCas) {
      feuille.getRange(indexLigne, 6).setBackground("#f4cccc");
      if (pireCas === 'A' || pireCas === 'C') feuille.getRange(indexLigne, 2, 1, 2).setBackground("#f4cccc");
      if (pireCas === 'A' || pireCas === 'B') feuille.getRange(indexLigne, 4).setBackground("#f4cccc");
    }

    // Usurpation (B) : la pièce appartient à quelqu'un d'autre -> on ne remplace pas son nom
    if (pireCas !== 'B') majAnnuaire_(nom, prenom, piece);
    return { status: "SUCCES", cas: pireCas,
             message: pireCas ? "⚠️ Saisie forcée et enregistrée en rouge." : "✅ Saisie enregistrée !" };
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
  var pieceNorm = _normPiece_(piece);
  if (pieceNorm === "") return { trouve: false, mode: mode };

  var donnees = feuille.getDataRange().getValues();
  var matches = [];
  for (var i = 1; i < donnees.length; i++) {
    var pieceHisto = _normPiece_(donnees[i][3]);
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

// Normalisation d'un N° de pièce pour la COMPARAISON : majuscules, sans espaces ni
// tirets ; un N° entièrement numérique est comparé SANS ses 0 initiaux.
// Raison : Google Sheets convertit en nombre un texte qui ressemble à un nombre
// ("012345678901" -> 12345678901, ex. anciennes CNI 2000-2009) ; les lignes déjà
// enregistrées ainsi doivent rester reconnues (sinon doublon manqué).
function _normPiece_(p) {
  if (p === null || p === undefined || p === "") return "";
  var n = p.toString().toUpperCase().replace(/[\s-]/g, '');
  return /^\d+$/.test(n) ? n.replace(/^0+(?=\d)/, '') : n;
}

// Valeur texte à écrire dans le Sheet telle quelle : l'apostrophe initiale
// (invisible) empêche Google Sheets de la convertir (nombre -> 0 perdu, date,
// formule « = »). Les valeurs vides ou non textuelles sont écrites telles quelles.
function texte_(v) {
  return (typeof v === 'string' && v !== "") ? "'" + v : v;
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
  for (var p in index) rows.push([texte_(p), texte_(String(index[p].nom || "")), texte_(String(index[p].prenom || "")), index[p].date]);
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

// Données pré-chargées au démarrage pour la vérif IMMÉDIATE (locale) au blur :
// pièces de l'offre en cours (N2) + annuaire (N3). Rafraîchi au retour sur la page
// et après chaque saisie. NE remplace PAS la validation finale (toujours serveur).
function chargerCacheVerif() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = ss.getSheetByName("Saisies");
  var mode = feuille ? (feuille.getRange("Z1").getValue() || "SIGNALER") : "SIGNALER";

  var offre = [];
  if (feuille) {
    var donnees = feuille.getDataRange().getValues();
    for (var i = 1; i < donnees.length; i++) {
      var pn = _normPiece_(donnees[i][3]);
      if (pn === "") continue;
      offre.push({
        pieceNorm: pn,
        ligne: i + 1,
        date: (donnees[i][0] instanceof Date) ? Utilities.formatDate(donnees[i][0], "Europe/Paris", "dd/MM/yyyy HH:mm") : (donnees[i][0] ? donnees[i][0].toString() : ""),
        nom: donnees[i][1] ? donnees[i][1].toString() : "",
        prenom: donnees[i][2] ? donnees[i][2].toString() : "",
        piece: donnees[i][3] ? donnees[i][3].toString() : "",
        montant: donnees[i][4] ? donnees[i][4].toString() : "",
        notes: donnees[i][5] ? donnees[i][5].toString() : ""
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

  return { mode: mode, offre: offre, annuaire: annuaire, annuaireActif: ANNUAIRE_ACTIF, modeAnnuaire: getModeAnnuaire() };
}

// --- FONCTIONS SECONDAIRES ---
function getInfosPanneau() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var f = ss.getSheetByName("Saisies");
  var mode = f.getRange("Z1").getValue() || "SIGNALER";
  return { success: true, mode: mode, urlFichier: ss.getUrl(), annuaireActif: ANNUAIRE_ACTIF, modeAnnuaire: getModeAnnuaire() };
}

// Impression calculée directement depuis « Saisies » (colonnes A-F). Ne dépend
// plus des onglets A_IMPRIMER / OFFRE_COMPLETE (conservés tels quels pour le
// panneau du Sheet, en secours) et ne les modifie plus.
//  - 'jour'  : lignes dont la date tombe le jour choisi ("aujourdhui" ou
//              "yyyy-MM-dd"), date en jj/mm/aaaa — comme A_IMPRIMER.
//  - 'offre' : toutes les lignes non vides, date + heure — comme OFFRE_COMPLETE.
// Renvoie [] s'il n'y a aucune ligne à imprimer.
function genererDonneesImpression(type, dateChoisieStr) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var feuille = ss.getSheetByName("Saisies");
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
  var entete = ["Date", "Nom", "Prénom", "N° Pièce", cfg.LIBELLE_MONTANT, cfg.LIBELLE_NOTES];
  var plage = feuille.getRange(2, 1, derniere - 1, 6);
  var valeurs = plage.getValues();
  var affichage = plage.getDisplayValues();

  var lignes = [];
  for (var i = 0; i < valeurs.length; i++) {
    if (jour) {
      var d = valeurs[i][0];
      if (!(d instanceof Date) || Utilities.formatDate(d, tz, "yyyy-MM-dd") !== jour) continue;
      var ligne = affichage[i].slice();
      ligne[0] = Utilities.formatDate(d, tz, "dd/MM/yyyy");
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

// Liste des archives, la plus récente d'abord.
function listerArchives(jeton) {
  exigerAdmin_(jeton);
  var liste = [];
  SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (f) {
    var nom = f.getName();
    if (nom.indexOf("Archives_") !== 0) return;
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
  if (nom.indexOf("Archives_") !== 0) throw new Error("Archive inconnue.");
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
// (HÉLÈNE = HELENE), ligatures dépliées (Œ -> OE), sans espaces, tirets, apostrophes
// ni points (D'ARC = DARC). Sinon un homonyme (cas C) passait inaperçu.
function _normId_(v) {
  if (v === null || v === undefined || v === "") return "";
  return v.toString().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/Œ/g, 'OE').replace(/Æ/g, 'AE').replace(/[\s\-'’.]/g, '');
}

// Saisies de l'offre en cours, la plus récente d'abord.
function listerSaisies(jeton) {
  exigerAdmin_(jeton);
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies");
  if (!feuille) return [];
  var derniere = feuille.getLastRow();
  if (derniere < 2) return [];
  var plage = feuille.getRange(2, 1, derniere - 1, 6);
  var valeurs = plage.getValues();
  var affichage = plage.getDisplayValues();
  var liste = [];
  for (var i = 0; i < valeurs.length; i++) {
    if (affichage[i].join("") === "") continue;
    var notes = valeurs[i][5] ? valeurs[i][5].toString() : "";
    liste.push({
      ligne: i + 2,
      date: affichage[i][0],
      nom: valeurs[i][1] ? valeurs[i][1].toString() : "",
      prenom: valeurs[i][2] ? valeurs[i][2].toString() : "",
      piece: valeurs[i][3] ? valeurs[i][3].toString() : "",
      montant: affichage[i][4],
      notes: notes.replace(ALERTE_FORCE_REGEX, '').trim(),
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
  var v = feuille.getRange(ligne, 2, 1, 3).getValues()[0];
  var a = attendu || {};
  if ((v[0] || "").toString() !== (a.nom || "") || (v[1] || "").toString() !== (a.prenom || "") || (v[2] || "").toString() !== (a.piece || "")) {
    throw new Error("Cette ligne a changé entre-temps : rechargez la liste.");
  }
  return ligne;
}

// Détection A/B/C sur « Saisies » (mêmes règles que traiterSaisie / onEdit),
// utilisée par forcerSaisie et modifierSaisie. ligneExclue : n° de ligne à ne
// pas comparer (la ligne corrigée elle-même), ou 0.
// Renvoie { pireCas: 'A'|'B'|'C'|null, details: [...] }.
function detecterDoublons_(feuille, nom, prenom, piece, ligneExclue) {
  var nomN = _normId_(nom), prenomN = _normId_(prenom), pieceN = _normPiece_(piece);
  var donnees = feuille.getDataRange().getValues();
  var pireCas = null, details = [];
  for (var i = 1; i < donnees.length; i++) {
    if (i === ligneExclue - 1) continue;
    var memeId = (nomN !== "" && prenomN !== "" && _normId_(donnees[i][1]) === nomN && _normId_(donnees[i][2]) === prenomN);
    var memePiece = (pieceN !== "" && _normPiece_(donnees[i][3]) === pieceN);
    if (!memeId && !memePiece) continue;
    var t = (memeId && memePiece) ? 'A' : (memePiece ? 'B' : 'C');
    if (t === 'A') pireCas = 'A';
    else if (t === 'B' && pireCas !== 'A') pireCas = 'B';
    else if (t === 'C' && pireCas !== 'A' && pireCas !== 'B') pireCas = 'C';
    details.push({
      ligne: i + 1, type: t,
      date: (donnees[i][0] instanceof Date) ? Utilities.formatDate(donnees[i][0], "Europe/Paris", "dd/MM/yyyy HH:mm") : (donnees[i][0] ? donnees[i][0].toString() : ""),
      nom: donnees[i][1] ? donnees[i][1].toString() : "", prenom: donnees[i][2] ? donnees[i][2].toString() : "",
      piece: donnees[i][3] ? donnees[i][3].toString() : "", montant: donnees[i][4] ? donnees[i][4].toString() : "",
      notes: donnees[i][5] ? donnees[i][5].toString() : ""
    });
  }
  return { pireCas: pireCas, details: details };
}

// Recalcule la note « ⚠️ Ajout forcé (Cas X) » et le rouge de chaque ligne de « Saisies ».
// Même règle qu'à l'enregistrement : une ligne est marquée si elle double une ligne
// PLUS ANCIENNE (au-dessus) ; la première occurrence reste propre. La note saisie par
// l'hôtesse est conservée. Appelée après une correction ou une suppression.
function recalculerMarquages_(feuille) {
  var derniere = feuille.getLastRow();
  if (derniere < 2) return;
  var plage = feuille.getRange(2, 1, derniere - 1, 7);
  var v = plage.getValues();
  var rouge = "#f4cccc";
  var notes = [], fonds = [];
  for (var i = 0; i < v.length; i++) {
    var nomN = _normId_(v[i][1]), prenomN = _normId_(v[i][2]), pieceN = _normPiece_(v[i][3]);
    var pireCas = null;
    if (nomN || prenomN || pieceN) {
      for (var j = 0; j < i; j++) {
        var memeId = (nomN !== "" && prenomN !== "" && _normId_(v[j][1]) === nomN && _normId_(v[j][2]) === prenomN);
        var memePiece = (pieceN !== "" && _normPiece_(v[j][3]) === pieceN);
        if (memeId && memePiece) { pireCas = 'A'; break; }
        if (memePiece) pireCas = 'B';
        else if (memeId && pireCas !== 'B') pireCas = 'C';
      }
    }
    var notePropre = (v[i][5] ? v[i][5].toString() : "").replace(ALERTE_FORCE_REGEX, '').trim();
    var alerte = pireCas ? "⚠️ Ajout forcé (Cas " + pireCas + ")" : "";
    notes.push([texte_(alerte ? (notePropre ? notePropre + "\n" + alerte : alerte) : notePropre)]);
    fonds.push([null,
      (pireCas === 'A' || pireCas === 'C') ? rouge : null, (pireCas === 'A' || pireCas === 'C') ? rouge : null,
      (pireCas === 'A' || pireCas === 'B') ? rouge : null, null, pireCas ? rouge : null, null]);
  }
  feuille.getRange(2, 6, v.length, 1).setValues(notes);
  plage.setBackgrounds(fonds);
}

function messagesDoublon_(mode, pireCas) {
  var r = { bloque: false, couleur: "ROUGE", titre: "", message: "" };
  var homonyme = "Un client porte ce nom avec une autre pièce. Demandez une 2ème pièce d'identité pour confirmer qu'il s'agit bien d'une personne différente.";
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
    var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies");
    if (!feuille) throw new Error("La feuille 'Saisies' est introuvable.");
    ligne = verifierLigneAttendue_(feuille, ligne, attendu);

    var n = nouveau || {};
    var nom = (n.nom || "").toString().toUpperCase().trim();
    var prenom = (n.prenom || "").toString().toUpperCase().trim();
    var piece = (n.piece || "").toString().toUpperCase().trim();
    var montant = (n.montant || "").toString().trim();
    if (montant.indexOf('.') !== -1) montant = montant.replace('.', ',');
    var notesPropres = (n.notes || "").toString().replace(ALERTE_FORCE_REGEX, '').trim();
    if (!nom || !prenom || !piece) throw new Error("Le Nom, le Prénom et le N° de pièce sont obligatoires.");
    if (getConfig().MONTANT_OBLIGATOIRE !== "NON" && !montant) throw new Error("Le montant est obligatoire.");

    // Recontrôle A/B/C contre toutes les AUTRES lignes (comme onEdit)
    var det = detecterDoublons_(feuille, nom, prenom, piece, ligne);
    var pireCas = det.pireCas, details = det.details;

    var mode = feuille.getRange("Z1").getValue() || "SIGNALER";
    if (pireCas) {
      var m = messagesDoublon_(mode, pireCas);
      if (m.bloque) return { status: "BLOQUE", titre: m.titre, message: m.message, details: details };
      if (!forcer) return { status: "CONFIRMATION", titre: m.titre, message: m.message, couleur: m.couleur, details: details };
    }

    feuille.getRange(ligne, 2, 1, 5).setValues([[texte_(nom), texte_(prenom), texte_(piece), montant, texte_(notesPropres)]]);
    // Note d'alerte + rouge recalculés pour TOUTES les lignes (la correction peut créer
    // ou faire disparaître un doublon ailleurs dans l'offre)
    recalculerMarquages_(feuille);
    if (pireCas !== 'B') majAnnuaire_(nom, prenom, piece);
    return { status: "SUCCES", message: pireCas ? "⚠️ Correction forcée (Cas " + pireCas + ") : le doublon est marqué en rouge." : "✅ Saisie corrigée." };
  } finally {
    lock.releaseLock();
  }
}

function supprimerSaisie(ligne, attendu, jeton) {
  exigerAdmin_(jeton);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies");
    if (!feuille) throw new Error("La feuille 'Saisies' est introuvable.");
    ligne = verifierLigneAttendue_(feuille, ligne, attendu);
    feuille.deleteRow(ligne);
    recalculerMarquages_(feuille); // un doublon de la ligne supprimée n'en est peut-être plus un
    return "🗑️ Saisie supprimée.";
  } finally {
    lock.releaseLock();
  }
}

function basculerModeWebApp(jeton) {
  exigerAdmin_(jeton);
  var feuille = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Saisies");
  var modeActuel = feuille.getRange("Z1").getValue() || "SIGNALER";
  var nouveauMode = (modeActuel === "SIGNALER") ? "BLOQUANT" : "SIGNALER";
  feuille.getRange("Z1").setValue(nouveauMode); return nouveauMode;
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
    lock.releaseLock();
  }
}

function archiverOffreSousVerrou_() {
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
  enregistrerDates_("", "");

  return "✅ L'offre a été clôturée et archivée avec succès !";
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 APPLICATION')
    .addItem('⚙️ Ouvrir le panneau de contrôle', 'afficherPanneau')
    .addItem('🧰 Installer / vérifier l\'installation', 'installerDepuisMenu')
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
    // en texte : Sheets a déjà converti la frappe (ex. N° "0123" -> 123), on rétablit e.value
    feuille.getRange(ligneEdit, colEdit).setValue(texte_(e.value.toString().toUpperCase().trim()));
  }
  if (colEdit === 5 && e.value && e.value.toString().includes('.')) {
    feuille.getRange(ligneEdit, colEdit).setValue(e.value.toString().replace('.', ','));
  }

  // On laisse un instant au tableur pour s'actualiser
  Utilities.sleep(500);
  
  var modeSecurite = feuille.getRange("Z1").getValue() || "SIGNALER";
  var donnees = feuille.getDataRange().getValues();
  var rowData = donnees[ligneEdit - 1]; 
  
  var nom = _normId_(rowData[1]);
  var prenom = _normId_(rowData[2]);
  var piece = _normPiece_(rowData[3]);
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
    
    var nomHisto = _normId_(donnees[i][1]);
    var prenomHisto = _normId_(donnees[i][2]);
    var pieceHisto = _normPiece_(donnees[i][3]);
    
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
    archiverOffre_(); 
    
    // On efface les dates en mémoire pour verrouiller la tablette le matin
    enregistrerDates_("", ""); 
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

function setDatesOperation(dateDebut, dateFin, jeton) {
  exigerAdmin_(jeton);
  return enregistrerDates_(dateDebut, dateFin);
}

function enregistrerDates_(dateDebut, dateFin) {
  var memoire = PropertiesService.getDocumentProperties();
  memoire.setProperty('DATE_DEBUT', dateDebut);
  memoire.setProperty('DATE_FIN', dateFin);

  return "Dates enregistrées avec succès !";
}
