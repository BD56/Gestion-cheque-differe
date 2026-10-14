// Sécurité : code responsable (PIN), code d'activation, sessions (jetons),
// tablettes autorisées.

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Securite_() {
  return "2026.10.14-1035";
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
function empreintePin_(sel, pin) {
  const octets = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    sel + ":" + pin,
    Utilities.Charset.UTF_8
  );
  return Utilities.base64Encode(octets);
}

function etatAdmin() {
  return { pinDefini: !!PropertiesService.getDocumentProperties().getProperty("ADMIN_PIN_HASH") };
}

// Le jeton est LIÉ à la tablette qui a saisi le code : il ne sert à rien depuis un
// autre appareil. La tablette l'envoie avec sa clé : { j: jeton, c: clé }.
// (« E » = jeton sans tablette : panneau du Sheet ou code d'activation.)
function creerJetonAdmin_(tablette) {
  const jeton = Utilities.getUuid();
  CacheService.getScriptCache().put("ADM_" + jeton, tablette ? "T:" + tablette.id : "E", ADMIN_SESSION_SEC);
  return jeton;
}

function jetonValide_(jeton) {
  let j = jeton,
    cle = null;
  if (jeton && typeof jeton === "object") {
    j = jeton.j;
    cle = jeton.c;
  }
  if (!j || typeof j !== "string") return false;
  const cache = CacheService.getScriptCache();
  const lien = cache.get("ADM_" + j);
  if (!lien) return false;
  if (lien !== "E") {
    const t = tabletteDeCle_(cle);
    if (!t || lien !== "T:" + t.id) return false;
  }
  cache.put("ADM_" + j, lien, ADMIN_SESSION_SEC); // prolonge (10 min d'inactivité)
  return true;
}

// L'utilisateur courant est-il propriétaire/éditeur du classeur ? (panneau du Sheet)
// Dans la web app, l'e-mail du visiteur n'est en général pas disponible -> false.
function estEditeurDuClasseur_() {
  try {
    const email = Session.getActiveUser().getEmail();
    if (!email) return false;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const proprio = ss.getOwner();
    if (proprio && proprio.getEmail() === email) return true;
    return ss.getEditors().some(function (u) {
      return u.getEmail() === email;
    });
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
  if (
    e &&
    e.triggerUid &&
    ScriptApp.getProjectTriggers().some(function (t) {
      return String(t.getUniqueId()) === String(e.triggerUid);
    })
  )
    return;
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
  const hash = props.getProperty("ADMIN_PIN_HASH");
  if (!hash) return { ok: false, message: "Aucun code défini : créez-le d'abord." };
  const cleEtat = "PIN_ESSAIS_" + (groupe || "EDITEUR");
  let etat = {};
  try {
    etat = JSON.parse(props.getProperty(cleEtat) || "{}");
  } catch (e) {
    etat = {};
  }
  const maintenant = Date.now();
  if ((etat.bloque || 0) > maintenant) {
    return {
      ok: false,
      message: "Trop d'essais. Réessayez dans " + Math.ceil((etat.bloque - maintenant) / 60000) + " min.",
    };
  }
  if (maintenant - (etat.dernier || 0) < ADMIN_PAUSE_MS) {
    return {
      ok: false,
      message:
        "Patientez " +
        Math.ceil((ADMIN_PAUSE_MS - (maintenant - etat.dernier)) / 1000) +
        " s avant un nouvel essai.",
    };
  }
  if (empreintePin_(props.getProperty("ADMIN_PIN_SEL"), (pin || "").toString()) === hash) {
    props.deleteProperty(cleEtat);
    return { ok: true };
  }
  if (groupe === "INCONNU") {
    // trace visible dans l'espace responsable
    let inc = {};
    try {
      inc = JSON.parse(props.getProperty("PIN_INCONNUS") || "{}");
    } catch (e) {
      inc = {};
    }
    props.setProperty(
      "PIN_INCONNUS",
      JSON.stringify({
        n: (inc.n || 0) + 1,
        dernier: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"),
      })
    );
  }
  const echecs = (etat.echecs || 0) + 1;
  if (echecs >= ADMIN_ESSAIS_MAX) {
    props.setProperty(
      cleEtat,
      JSON.stringify({ echecs: 0, dernier: maintenant, bloque: maintenant + ADMIN_BLOCAGE_MIN * 60000 })
    );
    return { ok: false, message: "Code faux. Trop d'essais : bloqué " + ADMIN_BLOCAGE_MIN + " min." };
  }
  props.setProperty(cleEtat, JSON.stringify({ echecs: echecs, dernier: maintenant, bloque: 0 }));
  return {
    ok: false,
    message: "Code faux (" + (ADMIN_ESSAIS_MAX - echecs) + " essai(s) restant(s)). Patientez 10 s.",
  };
}

// Efface les compteurs d'essais (tous, ou ceux d'une tablette).
function effacerEssais_(props, groupe) {
  const tout = props.getProperties();
  for (const k in tout) {
    if (groupe ? k === "PIN_ESSAIS_" + groupe : k.indexOf("PIN_ESSAIS_") === 0) props.deleteProperty(k);
  }
}

// Code juste -> { ok:true, jeton } ; sinon { ok:false, message }. Tablette autorisée requise.
function ouvrirSessionAdmin(pin, cle) {
  exigerTablette_(cle);
  const t = tabletteDeCle_(cle);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const v = verifierPin_(PropertiesService.getDocumentProperties(), pin, t ? "T_" + t.id : "EDITEUR");
    return v.ok ? { ok: true, jeton: creerJetonAdmin_(t) } : v;
  } finally {
    lock.releaseLock();
  }
}

// =================================================================
// --- CODE D'ACTIVATION : prouve l'accès au Google Sheets ---
// Créer le code responsable (1re installation, ou après « Réinitialiser le code »)
// exige ce code à 8 chiffres, affiché UNIQUEMENT dans le Google Sheets (menu
// « 🧰 Installer », « 🔑 Code d'activation », ou réinitialisation du code). Sinon,
// la première personne qui ouvre le lien pourrait choisir le code responsable.
// Usage unique, valable 24 h, 10 essais au plus. Seule son empreinte est gardée.
// =================================================================
function genererCodeActivation_() {
  let chiffres = "";
  while (chiffres.length < 8) {
    const octets = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      Utilities.getUuid() + Utilities.getUuid(),
      Utilities.Charset.UTF_8
    );
    for (let i = 0; i < octets.length && chiffres.length < 8; i++) {
      const b = octets[i] & 255;
      if (b < 250) chiffres += String(b % 10); // 250 = 25 × 10 : pas de biais
    }
  }
  const sel = Utilities.getUuid();
  PropertiesService.getDocumentProperties().setProperties({
    ACTIVATION_SEL: sel,
    ACTIVATION_HASH: empreintePin_(sel, chiffres),
    ACTIVATION_EXPIRE: String(Date.now() + ACTIVATION_DUREE_H * 3600000),
    ACTIVATION_ESSAIS: "0",
  });
  return chiffres.slice(0, 4) + "-" + chiffres.slice(4);
}

function texteActivation_(code) {
  return (
    "🔑 Code d'activation : " +
    code +
    "\n(valable " +
    ACTIVATION_DUREE_H +
    " h, une seule fois)\n\n" +
    "Sur la tablette, ouvrez l'application : elle demande ce code, puis de choisir le code " +
    "responsable (6 chiffres). Ne le communiquez qu'au responsable."
  );
}

function effacerActivation_(props) {
  ["ACTIVATION_SEL", "ACTIVATION_HASH", "ACTIVATION_EXPIRE", "ACTIVATION_ESSAIS"].forEach(function (k) {
    props.deleteProperty(k);
  });
}

// À appeler sous verrou. Renvoie { ok:true } ou { ok:false, message }.
function verifierActivation_(props, code) {
  const obtenir = " Obtenez-en un dans le Google Sheets : menu 🚀 APPLICATION → 🔑 Code d'activation.";
  const hash = props.getProperty("ACTIVATION_HASH");
  if (!hash) return { ok: false, message: "Code d'activation requis." + obtenir };
  if (Date.now() > Number(props.getProperty("ACTIVATION_EXPIRE") || 0)) {
    effacerActivation_(props);
    return { ok: false, message: "Code d'activation expiré." + obtenir };
  }
  const essais = Number(props.getProperty("ACTIVATION_ESSAIS") || 0);
  if (essais >= ACTIVATION_ESSAIS_MAX) {
    effacerActivation_(props);
    return { ok: false, message: "Trop d'essais : ce code d'activation n'est plus valable." + obtenir };
  }
  const chiffres = (code || "").toString().replace(/\D/g, "");
  if (chiffres.length === 8 && empreintePin_(props.getProperty("ACTIVATION_SEL"), chiffres) === hash)
    return { ok: true };
  props.setProperty("ACTIVATION_ESSAIS", String(essais + 1));
  return { ok: false, message: "Code d'activation incorrect." };
}

// Création (si aucun code : code d'activation exigé, sauf panneau du Sheet) ou
// changement (session responsable requise).
function definirPin(nouveauPin, jeton, cle, activation) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    const creation = !props.getProperty("ADMIN_PIN_HASH");
    if (!creation) exigerAdmin_(jeton);
    nouveauPin = (nouveauPin || "").toString();
    if (!ADMIN_PIN_REGEX.test(nouveauPin))
      return { ok: false, message: "Le code doit contenir exactement 6 chiffres." };
    if (creation && !estEditeurDuClasseur_()) {
      const a = verifierActivation_(props, activation);
      if (!a.ok) return a;
    }
    const sel = Utilities.getUuid();
    props.setProperties({ ADMIN_PIN_SEL: sel, ADMIN_PIN_HASH: empreintePin_(sel, nouveauPin) });
    effacerEssais_(props);
    effacerActivation_(props);
    props.deleteProperty("PIN_INCONNUS"); // nouveau code : l'avertissement est soldé
    const garde = !creation && jetonValide_(jeton);
    return {
      ok: true,
      jeton: garde ? (typeof jeton === "object" ? jeton.j : jeton) : creerJetonAdmin_(tabletteDeCle_(cle)),
    };
  } finally {
    lock.releaseLock();
  }
}

function fermerSessionAdmin(jeton) {
  const j = jeton && typeof jeton === "object" ? jeton.j : jeton;
  if (j && typeof j === "string") CacheService.getScriptCache().remove("ADM_" + j);
}

// Secours (panneau du Sheet, éditeurs uniquement) : efface le code et affiche un
// code d'activation pour en créer un nouveau depuis n'importe quelle tablette.
function reinitialiserPinPanneau() {
  exigerEditeur_();
  const props = PropertiesService.getDocumentProperties();
  ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL", "ADMIN_ECHECS", "ADMIN_BLOQUE_JUSQUA", "ADMIN_DERNIER_ECHEC"].forEach(
    function (k) {
      props.deleteProperty(k);
    }
  );
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
//     - Retrait d'une tablette / de toutes : espace responsable, menu « Code & tablettes ».
// =================================================================
function lireTablettes_() {
  try {
    return JSON.parse(PropertiesService.getDocumentProperties().getProperty("TABLETTES") || "[]");
  } catch (e) {
    return [];
  }
}
function ecrireTablettes_(liste) {
  PropertiesService.getDocumentProperties().setProperty("TABLETTES", JSON.stringify(liste));
}
function empreinteCle_(cle) {
  return Utilities.base64Encode(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "tablette:" + cle, Utilities.Charset.UTF_8)
  );
}
function tabletteDeCle_(cle) {
  if (!cle || typeof cle !== "string" || cle.length < 32) return null;
  const h = empreinteCle_(cle);
  const liste = lireTablettes_();
  for (let i = 0; i < liste.length; i++) if (liste[i].hash === h) return liste[i];
  return null;
}

// Refuse l'appel si la clé ne correspond à aucune tablette autorisée (sauf
// panneau du Sheet). Note la date de dernière utilisation (une fois par jour,
// propriété séparée : pas de réécriture de la liste, donc pas de conflit).
function exigerTablette_(cle) {
  const t = tabletteDeCle_(cle);
  if (t) {
    const props = PropertiesService.getDocumentProperties();
    const auj = Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy");
    if (props.getProperty("TABLETTE_VUE_" + t.id) !== auj) props.setProperty("TABLETTE_VUE_" + t.id, auj);
    return;
  }
  if (estEditeurDuClasseur_()) return;
  throw new Error("TABLETTE_NON_AUTORISEE : cette tablette n'est pas (ou plus) autorisée.");
}

// Autorise la tablette qui appelle (code responsable requis). Renvoie la clé à garder.
function appairerTablette(pin, nom) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    const v = verifierPin_(props, pin, "INCONNU");
    if (!v.ok) return v;
    const liste = lireTablettes_();
    if (liste.length >= TABLETTES_MAX)
      return {
        ok: false,
        message:
          TABLETTES_MAX +
          " tablettes maximum : retirez-en une depuis l'espace responsable (menu Code & tablettes), ou toutes depuis le panneau du Google Sheets.",
      };
    const cle = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
    const id = Utilities.getUuid().replace(/-/g, "").slice(0, 10);
    nom = (nom || "").toString().trim().slice(0, 40) || "Tablette " + (liste.length + 1);
    liste.push({
      id: id,
      nom: nom,
      hash: empreinteCle_(cle),
      creeLe: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"),
    });
    ecrireTablettes_(liste);
    return { ok: true, cle: cle, id: id, nom: nom };
  } finally {
    lock.releaseLock();
  }
}

function listerTablettes(jeton) {
  exigerAdmin_(jeton);
  const props = PropertiesService.getDocumentProperties();
  return lireTablettes_().map(function (t) {
    return { id: t.id, nom: t.nom, creeLe: t.creeLe, vueLe: props.getProperty("TABLETTE_VUE_" + t.id) || "" };
  });
}

function retirerTablette(id, jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ecrireTablettes_(
      lireTablettes_().filter(function (t) {
        return t.id !== id;
      })
    );
    PropertiesService.getDocumentProperties().deleteProperty("TABLETTE_VUE_" + id);
    PropertiesService.getDocumentProperties().deleteProperty("PIN_ESSAIS_T_" + id);
    return "Tablette retirée.";
  } finally {
    lock.releaseLock();
  }
}

function retirerToutesTablettes(jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    lireTablettes_().forEach(function (t) {
      props.deleteProperty("TABLETTE_VUE_" + t.id);
      props.deleteProperty("PIN_ESSAIS_T_" + t.id);
    });
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
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    lireTablettes_().forEach(function (t) {
      props.deleteProperty("TABLETTE_VUE_" + t.id);
      props.deleteProperty("PIN_ESSAIS_T_" + t.id);
    });
    ecrireTablettes_([]);
    return "✅ Toutes les tablettes ont été retirées : autorisez à nouveau celles du magasin (avec le code responsable).";
  } finally {
    lock.releaseLock();
  }
}

// Tout ce qu'affiche l'espace responsable, en un appel.
function getInfosAdmin(jeton) {
  exigerAdmin_(jeton);
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  // Robots de nuit absents (application ouverte avant « Installer »…) : on les recrée.
  let robotsCrees = [];
  try {
    robotsCrees = installerDeclencheurs_();
  } catch (e) {
    Logger.log("Robots de nuit : " + e);
  }
  let inconnus = {};
  try {
    inconnus = JSON.parse(PropertiesService.getDocumentProperties().getProperty("PIN_INCONNUS") || "{}");
  } catch (e) {
    inconnus = {};
  }
  return {
    mode: modeSecurite_(f),
    dates: lireDates_(),
    annuaireActif: ANNUAIRE_ACTIF,
    modeAnnuaire: getModeAnnuaire(),
    config: getConfig(),
    robots: etatRobots_(),
    robotsCrees: robotsCrees.length,
    essaisInconnus: inconnus,
    chiffres: chiffresOffre_(f),
  };
}
