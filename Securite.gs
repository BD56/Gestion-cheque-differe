// Sécurité : compte du magasin (identifiant + mot de passe, un seul) et ses sessions, code
// responsable (OBLIGATOIRE : commun ou personnels), code d'activation, jetons de l'espace
// responsable.

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Securite_() {
  return "2026.10.16-1512";
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
  return {
    pinDefini: codeExige_(),
    codePersonnel: lirePersonnes_().length > 0,
    comptes: lireComptes_().length > 0,
  };
}

// L'espace responsable est-il protégé ? Code commun (ADMIN_PIN_HASH) ou codes personnels
// (Personnes.gs) — jamais les deux à la fois.
function codeExige_() {
  return (
    !!PropertiesService.getDocumentProperties().getProperty("ADMIN_PIN_HASH") || lirePersonnes_().length > 0
  );
}

// Le jeton est LIÉ au compte qui l'a obtenu (« C:<id> ») : il ne sert à rien sans sa
// session. La page l'envoie avec : { j: jeton, c: session }. (« E » = jeton sans
// compte : panneau du Sheet.)
// Session de l'appelant : passée à part, ou reprise du jeton { j, c } (appels de
// l'espace responsable, qui ajoutent le jeton en dernier argument).
function cleAppelant_(cle, jeton) {
  return cle || (jeton && typeof jeton === "object" ? jeton.c : null);
}

// Génération des jetons responsables : réinitialiser ou changer le code (ou les comptes)
// la fait avancer, ce qui annule tous les jetons ouverts avant (espaces refermés).
function generationAdmin_() {
  return PropertiesService.getDocumentProperties().getProperty("ADMIN_GENERATION") || "0";
}
function nouvelleGenerationAdmin_() {
  PropertiesService.getDocumentProperties().setProperty(
    "ADMIN_GENERATION",
    String(Number(generationAdmin_()) + 1)
  );
}

// personne : codes personnels — le jeton porte aussi la personne (journal) et dure moins
// longtemps (ADMIN_SESSION_PERSONNEL_SEC).
function creerJetonAdmin_(appelant, personne) {
  const jeton = Utilities.getUuid();
  CacheService.getScriptCache().put(
    "ADM_" + jeton,
    (appelant ? appelant.lien : "E") + "|" + generationAdmin_() + "|" + (personne ? personne.id : ""),
    personne ? ADMIN_SESSION_PERSONNEL_SEC : ADMIN_SESSION_SEC
  );
  return jeton;
}
// Personne (codes personnels) qui a ouvert l'espace avec ce jeton : { id, nom } ou null.
function personneDuJeton_(jeton) {
  const j = jeton && typeof jeton === "object" ? jeton.j : jeton;
  if (!j || typeof j !== "string") return null;
  const valeur = CacheService.getScriptCache().get("ADM_" + j);
  const id = valeur ? valeur.split("|")[2] : "";
  return id
    ? lirePersonnes_().filter(function (p) {
        return p.id === id;
      })[0] || null
    : null;
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
  const valeur = cache.get("ADM_" + j);
  if (!valeur) return false;
  const morceaux = valeur.split("|");
  if (morceaux[1] !== generationAdmin_()) return false; // code changé / réinitialisé depuis
  const lien = morceaux[0];
  if (lien !== "E") {
    const a = appelantDeCle_(cle);
    if (!a || lien !== a.lien) return false;
  }
  const idPersonne = morceaux[2] || "";
  if (
    idPersonne &&
    !lirePersonnes_().some(function (p) {
      return p.id === idPersonne;
    })
  )
    return false; // personne retirée depuis
  // prolonge (10 min d'inactivité ; 3 min avec un code personnel)
  cache.put("ADM_" + j, valeur, idPersonne ? ADMIN_SESSION_PERSONNEL_SEC : ADMIN_SESSION_SEC);
  return true;
}

// L'utilisateur courant est-il propriétaire/éditeur du classeur ? (panneau du Sheet)
// ⚠️ Dans la web app (« exécuter en tant que moi »), Google donne l'e-mail du visiteur
// quand c'est le PROPRIÉTAIRE (ou un compte du même domaine Workspace) : ce n'est donc
// PAS une preuve que l'appel vient du panneau. Le passe-droit des éditeurs ne vaut que
// pour un appel SANS session / jeton (le panneau ne les envoie jamais ; la page,
// toujours) : voir exigerSession_ et exigerAdmin_.
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
  if (jetonValide_(jeton) || (jeton === undefined && estEditeurDuClasseur_())) return;
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
// personne (codes personnels) : son code à elle, et SON compteur d'essais (quel que soit
// le compte ou l'appareil).
// À appeler sous verrou. Renvoie { ok:true } ou { ok:false, message }.
function verifierPin_(props, pin, groupe, personne) {
  const hash = personne ? personne.hash : props.getProperty("ADMIN_PIN_HASH");
  const selCode = personne ? personne.sel : props.getProperty("ADMIN_PIN_SEL");
  if (!hash) return { ok: false, message: "Aucun code défini : créez-le d'abord." };
  const cleEtat = "PIN_ESSAIS_" + (personne ? "P_" + personne.id : groupe || "EDITEUR");
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
  if (empreintePin_(selCode, (pin || "").toString()) === hash) {
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
// Le code est OBLIGATOIRE (décision de Bryan, 16/10 : un seul compte pour tous les
// appareils, tablettes des hôtesses comprises) : sans code (1re installation inachevée,
// code réinitialisé dans le Sheet), l'espace ne s'ouvre pas — { codeACreer: true } : la
// page fait d'abord choisir le code (definirPin / passerCodesPersonnels).
// Codes personnels : idPersonne = qui tape le code.
function ouvrirSessionAdmin(pin, cle, idPersonne) {
  exigerSession_(cle);
  const a = appelantDeCle_(cle);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    if (!codeExige_())
      return { ok: false, codeACreer: true, message: "Choisissez d'abord le code responsable." };
    const personnes = lirePersonnes_();
    if (personnes.length) {
      const p = personnes.filter(function (x) {
        return x.id === idPersonne;
      })[0];
      if (!p) return { ok: false, message: "Choisissez votre nom." };
      const vp = verifierPin_(props, pin, null, p);
      return vp.ok ? { ok: true, jeton: creerJetonAdmin_(a, p), personne: p.nom } : vp;
    }
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
    "Sur un appareil de la caisse centrale, ouvrez l'application : à la première installation, elle demande ce " +
    "code, puis de créer le compte du magasin (identifiant et mot de passe, le même pour tous les appareils) " +
    "et de choisir le code responsable. Ne le communiquez qu'à elle."
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

// Code COMMUN : création (aucun code : compte connecté — 1re installation, ou après
// « Réinitialiser le code » dans le Sheet — ou panneau du Sheet) ou changement (session
// responsable requise). Depuis les codes personnels : retour au code commun (les codes
// personnels sont retirés).
function definirPin(nouveauPin, jeton, cle) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    const creation = !codeExige_();
    const depuisPersonnels = lirePersonnes_().length > 0;
    if (!creation) exigerAdmin_(jeton);
    const qui = quiJeton_(jeton);
    nouveauPin = (nouveauPin || "").toString();
    if (!ADMIN_PIN_REGEX.test(nouveauPin))
      return { ok: false, message: "Le code doit contenir exactement 6 chiffres." };
    const appelant = appelantDeCle_(cleAppelant_(cle, jeton));
    const panneau = jeton === undefined && cle === undefined && estEditeurDuClasseur_();
    if (creation && !panneau && !(appelant && appelant.compte))
      return { ok: false, message: "Connectez-vous avec un compte pour créer le code." };
    const sel = Utilities.getUuid();
    props.setProperties({ ADMIN_PIN_SEL: sel, ADMIN_PIN_HASH: empreintePin_(sel, nouveauPin) });
    if (depuisPersonnels) ecrirePersonnes_([]);
    effacerEssais_(props);
    // code changé : les autres espaces ouverts se referment ; l'appelant reçoit un jeton neuf
    if (!creation) nouvelleGenerationAdmin_();
    journaliser_(
      creation ? (appelant ? appelant.nom : quiPanneau_()) : qui,
      creation
        ? "Code responsable créé"
        : depuisPersonnels
          ? "Retour au code commun (codes personnels retirés)"
          : "Code responsable changé",
      "",
      true
    );
    return { ok: true, jeton: creerJetonAdmin_(appelant) };
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
  nouvelleGenerationAdmin_(); // espaces ouverts refermés (ils rouvriront sans code)
  journaliser_(quiPanneau_(), "Code responsable réinitialisé", "", true);
  ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL", "ADMIN_ECHECS", "ADMIN_BLOQUE_JUSQUA", "ADMIN_DERNIER_ECHEC"].forEach(
    function (k) {
      props.deleteProperty(k);
    }
  );
  ecrirePersonnes_([]); // codes personnels aussi
  effacerEssais_(props);
  if (lireComptes_().length > 0)
    return (
      "✅ Code responsable effacé. À la prochaine ouverture de l'espace responsable (⚙️), " +
      "l'application fera choisir un nouveau code (commun ou personnels) avant d'entrer : " +
      "faites-le tout de suite sur un appareil de la caisse centrale."
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
  if (cle === undefined && estEditeurDuClasseur_()) return; // panneau du Sheet (sans session)
  throw new Error(
    "CONNEXION_REQUISE : session terminée (3 h du matin), mot de passe changé ou compte retiré."
  );
}

// Vérification périodique de la page (toutes les 5 min) : la session vaut-elle encore ?
function verifierSession(cle) {
  exigerSession_(cle);
  return true;
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
//     UN SEUL compte : celui du magasin, avec lequel la caisse centrale connecte tous
//     les appareils (décision de Bryan, 16/10 : la traçabilité par personne vient des
//     codes personnels de l'espace responsable). Une liste est gardée : un Sheet d'une
//     version précédente peut en avoir plusieurs (à réduire : retirerCompte). Se
//     connecter donne une SESSION valable jusqu'à 3 h du matin, que la page envoie à
//     chaque appel (le gestionnaire de mots de passe du navigateur retient le mot de
//     passe : utile sous Safari, qui oublie le stockage de la page quand on le quitte).
//     - Mot de passe jamais stocké : empreinte salée, répétée MDP_TOURS fois.
//     - Session = « S1.<compte>.<version>.<fin>.<signature> » : rien n'est stocké par
//       session ; la signature (HMAC, secret du document) empêche de la fabriquer.
//       Changer le mot de passe (version + 1) ou retirer le compte la rend caduque.
//     - Mots de passe faux : pause de 10 s après chacun ; à partir du 10e, connexion
//       bloquée 5, 10, puis 15 min (jamais plus) ; les appareils déjà connectés
//       continuent (le blocage ne vise que les nouvelles connexions).
//     - Le compte : créé à la 1re installation avec le code d'activation du Google
//       Sheets. Jamais d'inscription libre, jamais d'autre compte.
//     - Secours : le panneau du Sheet retire le compte (retour à la 1re installation,
//       nouveau code d'activation).
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

// Mot de passe du compte, avec pause et blocage progressif. À appeler sous verrou.
function verifierMdp_(props, compte, mdp) {
  const cleEtat = "CPT_ESSAIS_" + compte.id;
  let etat = {};
  try {
    etat = JSON.parse(props.getProperty(cleEtat) || "{}");
  } catch (e) {
    etat = {};
  }
  const maintenant = Date.now();
  if (etat.dernier && maintenant - etat.dernier > CPT_OUBLI_H * 3600000) etat = {}; // erreurs anciennes oubliées
  if ((etat.bloque || 0) > maintenant)
    return {
      ok: false,
      message:
        "Trop d'essais : connexion bloquée. Réessayez dans " +
        Math.ceil((etat.bloque - maintenant) / 60000) +
        " min (les appareils déjà connectés continuent).",
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
  if (echecs >= CPT_ESSAIS_LIBRES) {
    const blocages = etat.blocages || 0;
    const minutes = CPT_BLOCAGES_MIN[Math.min(blocages, CPT_BLOCAGES_MIN.length - 1)];
    props.setProperty(
      cleEtat,
      JSON.stringify({
        echecs: echecs,
        dernier: maintenant,
        bloque: maintenant + minutes * 60000,
        blocages: blocages + 1,
      })
    );
    journaliser_(
      "Écran de connexion",
      "Connexion bloquée " + minutes + " min (" + echecs + " mots de passe faux)",
      compte.identifiant,
      true
    );
    return {
      ok: false,
      message: "Mot de passe incorrect. Trop d'essais : connexion bloquée " + minutes + " min.",
    };
  }
  props.setProperty(cleEtat, JSON.stringify({ echecs: echecs, dernier: maintenant, bloque: 0 }));
  return {
    ok: false,
    message:
      "Mot de passe incorrect (" +
      (CPT_ESSAIS_LIBRES - echecs) +
      " essai(s) avant un blocage). Patientez 10 s.",
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
// Il ne donne RIEN d'autre : un code responsable resté d'avant reste exigé (le changer
// demande ce code ; oublié : le panneau du Sheet le réinitialise).
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
    journaliser_(identifiant, "Premier compte créé (code d'activation)", identifiant, true);
    return reponseConnexion_(compte);
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
    journaliser_(quiJeton_(jeton), "Mot de passe changé", compte.identifiant);
    const r = { ok: true, message: "Mot de passe de « " + compte.identifiant + " » changé." };
    if (appelant && appelant.compte && appelant.id === id) r.session = creerSession_(compte);
    return r;
  } finally {
    lock.releaseLock();
  }
}

// Retire un compte (ses sessions ne servent plus) : Sheet d'une version précédente qui en
// a plusieurs (un seul désormais). Le dernier reste : sans lui, plus personne ne pourrait
// se connecter (secours : panneau du Sheet).
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
    const retire = liste.filter(function (c) {
      return c.id === id;
    })[0];
    ecrireComptes_(reste);
    journaliser_(quiJeton_(jeton), "Compte retiré", retire.identifiant, true);
    const props = PropertiesService.getDocumentProperties();
    ["COMPTE_VUE_", "CPT_ESSAIS_", "PIN_ESSAIS_C_"].forEach(function (k) {
      props.deleteProperty(k + id);
    });
    return { ok: true, message: "Compte retiré." };
  } finally {
    lock.releaseLock();
  }
}

// Secours (panneau du Sheet, éditeurs) : plus personne ne peut se connecter (mot de
// passe oublié…). Retire le compte (toutes les sessions tombent : nouveau secret) et le
// code responsable ; l'application revient à la 1re installation, avec le code
// d'activation affiché ici.
function reinitialiserComptesPanneau() {
  exigerEditeur_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getDocumentProperties();
    nouvelleGenerationAdmin_(); // espaces ouverts refermés
    journaliser_(
      quiPanneau_(),
      "Compte réinitialisé (retour à la première installation)",
      lireComptes_()
        .map(function (c) {
          return c.identifiant;
        })
        .join(", ") + " retiré(s)",
      true
    );
    const tout = props.getProperties();
    for (const k in tout)
      if (/^(COMPTE_VUE_|CPT_ESSAIS_)/.test(k) || k === "SESSION_SECRET" || k === "COMPTES")
        props.deleteProperty(k);
    ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL"].forEach(function (k) {
      props.deleteProperty(k);
    });
    ecrirePersonnes_([]);
    effacerEssais_(props);
    return (
      "✅ Compte et code responsable effacés : l'application revient à la première installation.\n\n" +
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
    changements: changementsRecents_(),
    alerteJournal: lireAlerteJournal_(),
  };
}
