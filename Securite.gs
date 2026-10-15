// Sécurité : comptes (identifiant + mot de passe) et leurs sessions, code responsable
// (PIN, facultatif), code d'activation, jetons de l'espace responsable.

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Securite_() {
  return "2026.10.15-2028";
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

// Sans clé ni session : ce que l'écran d'accueil doit proposer (1re installation ou
// connexion). Ne dévoile aucun identifiant.
function etatAdmin() {
  const props = PropertiesService.getDocumentProperties();
  return { pinDefini: !!props.getProperty("ADMIN_PIN_HASH"), comptes: lireComptes_().length > 0 };
}

// Le jeton est LIÉ au compte qui l'a obtenu (« C:<id> ») : il ne sert à rien sans sa
// session. La page l'envoie avec : { j: jeton, c: session }. (« E » = jeton sans
// compte : panneau du Sheet.)
// Session de l'appelant : passée à part, ou reprise du jeton { j, c } (appels de
// l'espace responsable, qui ajoutent le jeton en dernier argument).
function cleAppelant_(cle, jeton) {
  return cle || (jeton && typeof jeton === "object" ? jeton.c : null);
}

function creerJetonAdmin_(appelant) {
  const jeton = Utilities.getUuid();
  CacheService.getScriptCache().put("ADM_" + jeton, appelant ? appelant.lien : "E", ADMIN_SESSION_SEC);
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
    const a = appelantDeCle_(cle);
    if (!a || lien !== a.lien) return false;
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
// Compteurs SÉPARÉS par « groupe » : un par compte (« C_<id> »), un pour le panneau du
// Sheet : les codes faux tapés depuis un compte ne bloquent pas les autres.
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

// Efface les compteurs d'essais (tous, ou ceux d'un groupe).
function effacerEssais_(props, groupe) {
  const tout = props.getProperties();
  for (const k in tout) {
    if (groupe ? k === "PIN_ESSAIS_" + groupe : k.indexOf("PIN_ESSAIS_") === 0) props.deleteProperty(k);
  }
}

// Code juste -> { ok:true, jeton } ; sinon { ok:false, message }. Compte connecté requis.
// Sans code responsable « à part » (choix fait à l'installation), un compte connecté
// ouvre l'espace responsable sans code.
function ouvrirSessionAdmin(pin, cle) {
  exigerSession_(cle);
  const a = appelantDeCle_(cle);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    if (a && a.compte && !props.getProperty("ADMIN_PIN_HASH"))
      return { ok: true, jeton: creerJetonAdmin_(a) };
    const v = verifierPin_(props, pin, a ? a.groupe : "EDITEUR");
    return v.ok ? { ok: true, jeton: creerJetonAdmin_(a) } : v;
  } finally {
    lock.releaseLock();
  }
}

// =================================================================
// --- CODE D'ACTIVATION : prouve l'accès au Google Sheets ---
// Créer le PREMIER compte (1re installation, ou après « Réinitialiser les comptes »)
// exige ce code à 8 chiffres, affiché UNIQUEMENT dans le Google Sheets (menu
// « 🧰 Installer », « 🔑 Code d'activation », ou réinitialisation). Sinon, la première
// personne qui ouvre le lien créerait le compte.
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
    "Sur l'appareil de la caisse centrale, ouvrez l'application : à la première installation, elle demande ce " +
    "code, puis de créer le compte de la caisse centrale (identifiant et mot de passe). Ne le communiquez qu'à elle."
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

// Création (aucun code : compte connecté — qui a déjà tous les droits sans code — ou
// panneau du Sheet) ou changement (session responsable requise).
function definirPin(nouveauPin, jeton, cle) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    const creation = !props.getProperty("ADMIN_PIN_HASH");
    if (!creation) exigerAdmin_(jeton);
    nouveauPin = (nouveauPin || "").toString();
    if (!ADMIN_PIN_REGEX.test(nouveauPin))
      return { ok: false, message: "Le code doit contenir exactement 6 chiffres." };
    const appelant = appelantDeCle_(cleAppelant_(cle, jeton));
    if (creation && !estEditeurDuClasseur_() && !(appelant && appelant.compte))
      return { ok: false, message: "Connectez-vous avec un compte pour créer le code." };
    const sel = Utilities.getUuid();
    props.setProperties({ ADMIN_PIN_SEL: sel, ADMIN_PIN_HASH: empreintePin_(sel, nouveauPin) });
    effacerEssais_(props);
    const garde = !creation && jetonValide_(jeton);
    return {
      ok: true,
      jeton: garde ? (typeof jeton === "object" ? jeton.j : jeton) : creerJetonAdmin_(appelant),
    };
  } finally {
    lock.releaseLock();
  }
}

function fermerSessionAdmin(jeton) {
  const j = jeton && typeof jeton === "object" ? jeton.j : jeton;
  if (j && typeof j === "string") CacheService.getScriptCache().remove("ADM_" + j);
}

// Secours (panneau du Sheet, éditeurs uniquement) : efface le code responsable ; tout
// compte connecté ouvre alors l'espace et peut en choisir un nouveau. Sans compte, un
// code d'activation est affiché pour créer le premier.
function reinitialiserPinPanneau() {
  exigerEditeur_();
  const props = PropertiesService.getDocumentProperties();
  ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL", "ADMIN_ECHECS", "ADMIN_BLOQUE_JUSQUA", "ADMIN_DERNIER_ECHEC"].forEach(
    function (k) {
      props.deleteProperty(k);
    }
  );
  effacerEssais_(props);
  if (lireComptes_().length > 0)
    return (
      "✅ Code responsable effacé : tout compte connecté ouvre maintenant l'espace responsable. " +
      "Un nouveau code peut être choisi dans l'application (espace responsable → Code & comptes)."
    );
  return "✅ Code responsable effacé.\n\n" + texteActivation_(genererCodeActivation_());
}

// =================================================================
// --- ACCÈS : session d'un compte connecté ---
//     Toutes les fonctions utilisées par la page exigent une session valable
//     (connexion() / premierCompte()) ; un lien qui fuite ne donne donc accès à
//     rien. Le panneau du Sheet (éditeurs du classeur) passe sans session.
// =================================================================
// Refuse l'appel sans session valable (sauf panneau du Sheet). Note la date de dernière
// utilisation du compte (une fois par jour, propriété séparée : pas de réécriture de la
// liste des comptes, donc pas de conflit).
function exigerSession_(cle) {
  const compte = compteDeSession_(cle);
  if (compte) {
    noterVue_("COMPTE_VUE_" + compte.id);
    return;
  }
  if (estEditeurDuClasseur_()) return;
  throw new Error(
    "CONNEXION_REQUISE : session terminée (3 h du matin), mot de passe changé ou compte retiré."
  );
}

function noterVue_(cle) {
  const props = PropertiesService.getDocumentProperties();
  const auj = Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy");
  if (props.getProperty(cle) !== auj) props.setProperty(cle, auj);
}

// Compte connecté qui appelle (null sinon). lien = attache du jeton responsable ;
// groupe = compteur d'essais du code responsable.
function appelantDeCle_(cle) {
  const c = compteDeSession_(cle);
  return c ? { compte: true, id: c.id, nom: c.identifiant, lien: "C:" + c.id, groupe: "C_" + c.id } : null;
}

// =================================================================
// --- COMPTES (identifiant + mot de passe) ---
//     Les comptes sont ceux de la (des) caisse(s) centrale(s). Se connecter donne une
//     SESSION valable jusqu'à 3 h du matin, que la page envoie à chaque appel (le
//     gestionnaire de mots de passe du navigateur retient le mot de passe : utile sous
//     Safari, qui oublie le stockage de la page quand on le quitte).
//     - Mot de passe jamais stocké : empreinte salée, répétée MDP_TOURS fois.
//     - Session = « S1.<compte>.<version>.<fin>.<signature> » : rien n'est stocké par
//       session ; la signature (HMAC, secret du document) empêche de la fabriquer.
//       Changer le mot de passe (version + 1) ou retirer le compte la rend caduque.
//     - Essais faux comptés PAR COMPTE : pause de 10 s, blocage 15 min après 5 (un
//       inconnu ne bloque pas les autres comptes).
//     - 1er compte : code d'activation du Google Sheets (comme le code responsable).
//       Les suivants : depuis l'espace responsable. Jamais d'inscription libre.
//     - Secours : le panneau du Sheet retire tous les comptes (retour à la 1re
//       installation, nouveau code d'activation).
// =================================================================
// Erreur passagère de Google : remontée telle quelle, jamais lue comme « aucun compte »
// (sinon l'écran de 1re installation s'afficherait, et une écriture perdrait les comptes).
function lireComptes_() {
  const brut = PropertiesService.getDocumentProperties().getProperty("COMPTES");
  try {
    return JSON.parse(brut || "[]");
  } catch (e) {
    return [];
  }
}
function ecrireComptes_(liste) {
  PropertiesService.getDocumentProperties().setProperty("COMPTES", JSON.stringify(liste));
}

function empreinteMdp_(sel, mdp) {
  let h = sel + ":" + mdp;
  for (let i = 0; i < MDP_TOURS; i++)
    h = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sel + ":" + h, Utilities.Charset.UTF_8)
    );
  return h;
}

function compteParIdentifiant_(liste, identifiant) {
  const n = _normId_(identifiant || "");
  return n === ""
    ? null
    : liste.filter(function (c) {
        return _normId_(c.identifiant) === n;
      })[0] || null;
}

// Identifiant obligatoire (40 caractères au plus) ; mot de passe de MDP_MIN caractères
// au moins. Renvoie un message d'erreur, ou "" si tout va bien.
function controlerIdentifiant_(identifiant) {
  return _normId_(identifiant) === "" ? "Choisissez un identifiant (ex. Caisse centrale 1)." : "";
}
function controlerMdp_(mdp) {
  if (mdp.length < MDP_MIN) return "Le mot de passe doit contenir au moins " + MDP_MIN + " caractères.";
  if (mdp.length > 100) return "Mot de passe trop long (100 caractères au plus).";
  return "";
}

function nouveauCompte_(identifiant, mdp) {
  const sel = Utilities.getUuid();
  return {
    id: Utilities.getUuid().replace(/-/g, "").slice(0, 10),
    identifiant: identifiant,
    sel: sel,
    hash: empreinteMdp_(sel, mdp),
    v: 1,
    creeLe: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"),
  };
}

// --- Sessions ---
function estSession_(cle) {
  return typeof cle === "string" && cle.indexOf("S1.") === 0;
}
// Secret de signature : créé au premier besoin, SOUS VERROU (appelants : connexion,
// 1re installation, changement de mot de passe).
function secretSessions_(creer) {
  const props = PropertiesService.getDocumentProperties();
  let secret = props.getProperty("SESSION_SECRET");
  if (!secret && creer) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("SESSION_SECRET", secret);
  }
  return secret;
}
function signatureSession_(secret, corps) {
  return Utilities.base64Encode(Utilities.computeHmacSha256Signature(corps, secret));
}
// Prochain SESSION_HEURE_FIN h (heure du fuseau du script), en millisecondes.
function finDeSession_(maintenant) {
  const tz = fuseau_();
  // décalage du fuseau à l'instant t (ms) : heure locale lue comme si elle était UTC, moins t
  const decalage = function (t) {
    const p = Utilities.formatDate(new Date(t), tz, "yyyy-MM-dd-HH-mm").split("-").map(Number);
    return Date.UTC(p[0], p[1] - 1, p[2], p[3], p[4]) - Math.floor(t / 60000) * 60000;
  };
  const p = Utilities.formatDate(maintenant, tz, "yyyy-MM-dd-HH").split("-").map(Number);
  const local = Date.UTC(p[0], p[1] - 1, p[2] + (p[3] >= SESSION_HEURE_FIN ? 1 : 0), SESSION_HEURE_FIN, 0);
  const essai = local - decalage(local);
  return local - decalage(essai); // 2e passage : changement d'heure entre-temps
}
function creerSession_(compte) {
  const corps = ["S1", compte.id, compte.v, finDeSession_(new Date())].join(".");
  return corps + "." + signatureSession_(secretSessions_(true), corps);
}
// Compte de la session si elle est valable (signature, échéance, version), null sinon.
function compteDeSession_(session) {
  if (!estSession_(session)) return null;
  const morceaux = session.split(".");
  if (morceaux.length !== 5) return null;
  const secret = secretSessions_(false);
  if (!secret) return null;
  const corps = morceaux.slice(0, 4).join(".");
  if (signatureSession_(secret, corps) !== morceaux[4]) return null;
  if (Date.now() >= Number(morceaux[3])) return null;
  const compte = lireComptes_().filter(function (c) {
    return c.id === morceaux[1];
  })[0];
  return compte && String(compte.v) === morceaux[2] ? compte : null;
}

// Mot de passe d'un compte, avec pause et blocage PAR COMPTE. À appeler sous verrou.
function verifierMdp_(props, compte, mdp) {
  const cleEtat = "CPT_ESSAIS_" + compte.id;
  let etat = {};
  try {
    etat = JSON.parse(props.getProperty(cleEtat) || "{}");
  } catch (e) {
    etat = {};
  }
  const maintenant = Date.now();
  if ((etat.bloque || 0) > maintenant)
    return {
      ok: false,
      message:
        "Trop d'essais pour ce compte. Réessayez dans " +
        Math.ceil((etat.bloque - maintenant) / 60000) +
        " min.",
    };
  if (maintenant - (etat.dernier || 0) < ADMIN_PAUSE_MS)
    return {
      ok: false,
      message:
        "Patientez " +
        Math.ceil((ADMIN_PAUSE_MS - (maintenant - etat.dernier)) / 1000) +
        " s avant un nouvel essai.",
    };
  if (empreinteMdp_(compte.sel, mdp) === compte.hash) {
    props.deleteProperty(cleEtat);
    return { ok: true };
  }
  const echecs = (etat.echecs || 0) + 1;
  if (echecs >= ADMIN_ESSAIS_MAX) {
    props.setProperty(
      cleEtat,
      JSON.stringify({ echecs: 0, dernier: maintenant, bloque: maintenant + ADMIN_BLOCAGE_MIN * 60000 })
    );
    return {
      ok: false,
      message: "Mot de passe incorrect. Trop d'essais : compte bloqué " + ADMIN_BLOCAGE_MIN + " min.",
    };
  }
  props.setProperty(cleEtat, JSON.stringify({ echecs: echecs, dernier: maintenant, bloque: 0 }));
  return {
    ok: false,
    message:
      "Mot de passe incorrect (" + (ADMIN_ESSAIS_MAX - echecs) + " essai(s) restant(s)). Patientez 10 s.",
  };
}

function reponseConnexion_(compte) {
  return {
    ok: true,
    session: creerSession_(compte),
    compte: { id: compte.id, identifiant: compte.identifiant },
  };
}

// Connexion : { ok, session, compte } ou { ok:false, message }.
function connexion(identifiant, mdp) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const compte = compteParIdentifiant_(lireComptes_(), (identifiant || "").toString());
    if (!compte) return { ok: false, message: "Identifiant inconnu." };
    const v = verifierMdp_(PropertiesService.getDocumentProperties(), compte, (mdp || "").toString());
    return v.ok ? reponseConnexion_(compte) : v;
  } finally {
    lock.releaseLock();
  }
}

// 1re installation : AUCUN compte. Code d'activation exigé (affiché seulement dans le
// Google Sheets), sinon la première personne qui ouvre le lien créerait le compte.
// Renvoie aussi un jeton responsable (10 min) : le code d'activation prouve l'accès au
// Sheet, qui permet déjà de réinitialiser le code ; le 1er compte peut donc garder,
// changer ou retirer un code responsable resté d'avant (ex. Sheet déjà en service).
function premierCompte(activation, identifiant, mdp) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    if (lireComptes_().length > 0)
      return { ok: false, message: "Un compte existe déjà : connectez-vous avec un identifiant existant." };
    identifiant = (identifiant || "").toString().trim().slice(0, 40);
    mdp = (mdp || "").toString();
    const erreur = controlerIdentifiant_(identifiant) || controlerMdp_(mdp);
    if (erreur) return { ok: false, message: erreur };
    if (!estEditeurDuClasseur_()) {
      const a = verifierActivation_(props, activation);
      if (!a.ok) return a;
    }
    const compte = nouveauCompte_(identifiant, mdp);
    ecrireComptes_([compte]);
    effacerActivation_(props);
    const r = reponseConnexion_(compte);
    r.jeton = creerJetonAdmin_(appelantDeCle_(r.session));
    return r;
  } finally {
    lock.releaseLock();
  }
}

function listerComptes(jeton) {
  exigerAdmin_(jeton);
  return listeComptes_();
}
// Ni empreinte ni sel : identifiant, dates et id (tiré au hasard)
function listeComptes_() {
  const props = PropertiesService.getDocumentProperties();
  return lireComptes_().map(function (c) {
    return {
      id: c.id,
      identifiant: c.identifiant,
      creeLe: c.creeLe,
      vueLe: props.getProperty("COMPTE_VUE_" + c.id) || "",
    };
  });
}

function creerCompte(identifiant, mdp, jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    identifiant = (identifiant || "").toString().trim().slice(0, 40);
    mdp = (mdp || "").toString();
    const erreur = controlerIdentifiant_(identifiant) || controlerMdp_(mdp);
    if (erreur) return { ok: false, message: erreur };
    const liste = lireComptes_();
    const pris = compteParIdentifiant_(liste, identifiant);
    if (pris)
      return {
        ok: false,
        message: "« " + pris.identifiant + " » existe déjà : choisissez un autre identifiant.",
      };
    if (liste.length >= COMPTES_MAX)
      return { ok: false, message: COMPTES_MAX + " comptes au plus : retirez-en un d'abord." };
    const compte = nouveauCompte_(identifiant, mdp);
    liste.push(compte);
    ecrireComptes_(liste);
    return { ok: true, compte: { id: compte.id, identifiant: compte.identifiant } };
  } finally {
    lock.releaseLock();
  }
}

// Nouveau mot de passe : les sessions ouvertes avec l'ancien ne servent plus (version + 1).
// Si c'est le compte de l'appelant (cle = sa session), une nouvelle session est renvoyée.
function changerMotDePasse(id, mdp, jeton, cle) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    mdp = (mdp || "").toString();
    const erreur = controlerMdp_(mdp);
    if (erreur) return { ok: false, message: erreur };
    const appelant = appelantDeCle_(cleAppelant_(cle, jeton));
    const liste = lireComptes_();
    const compte = liste.filter(function (c) {
      return c.id === id;
    })[0];
    if (!compte) return { ok: false, message: "Ce compte n'existe plus." };
    compte.sel = Utilities.getUuid();
    compte.hash = empreinteMdp_(compte.sel, mdp);
    compte.v = (Number(compte.v) || 1) + 1;
    ecrireComptes_(liste);
    PropertiesService.getDocumentProperties().deleteProperty("CPT_ESSAIS_" + id);
    const r = { ok: true, message: "Mot de passe de « " + compte.identifiant + " » changé." };
    if (appelant && appelant.compte && appelant.id === id) r.session = creerSession_(compte);
    return r;
  } finally {
    lock.releaseLock();
  }
}

// Retire un compte (ses sessions ne servent plus). Le dernier compte reste : sans lui,
// plus personne ne pourrait se connecter (secours : panneau du Sheet).
function retirerCompte(id, jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const liste = lireComptes_();
    const reste = liste.filter(function (c) {
      return c.id !== id;
    });
    if (reste.length === liste.length) return { ok: false, message: "Ce compte n'existe plus." };
    if (reste.length === 0) return { ok: false, message: "Impossible de retirer le dernier compte." };
    ecrireComptes_(reste);
    const props = PropertiesService.getDocumentProperties();
    ["COMPTE_VUE_", "CPT_ESSAIS_", "PIN_ESSAIS_C_"].forEach(function (k) {
      props.deleteProperty(k + id);
    });
    return { ok: true, message: "Compte retiré." };
  } finally {
    lock.releaseLock();
  }
}

// Ne plus protéger l'espace responsable par un code à part : un compte connecté l'ouvre
// alors directement. Réservé à un COMPTE connecté qui a ouvert l'espace (avec le code).
// Pour le remettre : definirPin (un compte connecté peut le créer sans activation).
function retirerCodeResponsable(jeton, cle) {
  exigerAdmin_(jeton);
  const a = appelantDeCle_(cleAppelant_(cle, jeton));
  if (!a || !a.compte) return { ok: false, message: "Connectez-vous avec un compte pour retirer le code." };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL"].forEach(function (k) {
      props.deleteProperty(k);
    });
    effacerEssais_(props);
    return { ok: true, message: "Code responsable retiré : un compte connecté ouvre l'espace responsable." };
  } finally {
    lock.releaseLock();
  }
}

// Secours (panneau du Sheet, éditeurs) : plus personne ne peut se connecter (mots de
// passe oubliés, comptes bloqués…). Retire tous les comptes (toutes les sessions
// tombent : nouveau secret) et le code responsable ; l'application revient à la 1re
// installation, avec le code d'activation affiché ici.
function reinitialiserComptesPanneau() {
  exigerEditeur_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    const tout = props.getProperties();
    for (const k in tout)
      if (/^(COMPTE_VUE_|CPT_ESSAIS_)/.test(k) || k === "SESSION_SECRET" || k === "COMPTES")
        props.deleteProperty(k);
    ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL"].forEach(function (k) {
      props.deleteProperty(k);
    });
    effacerEssais_(props);
    return (
      "✅ Comptes et code responsable effacés : l'application revient à la première installation.\n\n" +
      texteActivation_(genererCodeActivation_())
    );
  } finally {
    lock.releaseLock();
  }
}

// Espace responsable, AVANT le code (appui sur ⚙️) : lectures préparées pendant que le
// code est tapé, affichées seulement une fois le code accepté. Réservé aux comptes
// connectés, qui obtiennent déjà tout cela sans code (copie de détection, impression
// libre de toute l'offre). Restent derrière le code : contenu des archives, état des
// robots de nuit (et leur recréation), toutes les actions.
function apercuResponsable(cle) {
  exigerSession_(cle);
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  return {
    mode: modeSecurite_(f),
    dates: lireDates_(),
    annuaireActif: ANNUAIRE_ACTIF,
    modeAnnuaire: getModeAnnuaire(),
    config: getConfig(),
    chiffres: chiffresOffre_(f),
    saisies: listeSaisies_(),
    archives: listeArchives_(),
    comptes: listeComptes_(),
  };
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
  return {
    mode: modeSecurite_(f),
    dates: lireDates_(),
    annuaireActif: ANNUAIRE_ACTIF,
    modeAnnuaire: getModeAnnuaire(),
    config: getConfig(),
    robots: etatRobots_(),
    robotsCrees: robotsCrees.length,
    chiffres: chiffresOffre_(f),
  };
}
