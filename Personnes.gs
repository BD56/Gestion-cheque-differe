// Codes responsables PERSONNELS (au lieu d'un code commun) : chaque membre de la caisse
// centrale ouvre l'espace responsable avec SON code, quel que soit le compte connecté
// (comptes partagés par poste). Le journal nomme alors la personne (« compte ·
// personne »). Propriété « RESPONSABLES » : { id, nom, sel, hash, creeLe } — jamais le
// code en clair. Essais faux comptés PAR PERSONNE (PIN_ESSAIS_P_<id>).
//  - Une personne est ajoutée depuis l'espace (ouvert) : nom saisi par le responsable,
//    code tapé PAR LA PERSONNE elle-même, devant lui (il ne le connaît pas).
//  - Code oublié : un autre responsable la retire et la rajoute ; plus personne :
//    panneau du Sheet → « Réinitialiser le code responsable ».

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Personnes_() {
  return "2026.10.16-1147";
}

// Erreur passagère de Google : remontée telle quelle (jamais lue comme « aucune personne »,
// ce qui ouvrirait l'espace sans code).
function lirePersonnes_() {
  const brut = PropertiesService.getDocumentProperties().getProperty("RESPONSABLES");
  try {
    return JSON.parse(brut || "[]");
  } catch (e) {
    return [];
  }
}
function ecrirePersonnes_(liste) {
  const props = PropertiesService.getDocumentProperties();
  if (liste.length) props.setProperty("RESPONSABLES", JSON.stringify(liste));
  else props.deleteProperty("RESPONSABLES");
}

function controlerPersonne_(liste, nom, code) {
  if (_normId_(nom) === "") return "Saisissez le nom de la personne (ex. Marie).";
  if (!ADMIN_PIN_REGEX.test(code)) return "Le code doit contenir exactement 6 chiffres.";
  const pris = liste.filter(function (p) {
    return _normId_(p.nom) === _normId_(nom);
  })[0];
  if (pris) return "« " + pris.nom + " » existe déjà.";
  if (liste.length >= PERSONNES_MAX) return PERSONNES_MAX + " personnes au plus.";
  return "";
}
function nouvellePersonne_(nom, code) {
  const sel = Utilities.getUuid();
  return {
    id: Utilities.getUuid().replace(/-/g, "").slice(0, 10),
    nom: nom,
    sel: sel,
    hash: empreintePin_(sel, code),
    creeLe: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"),
  };
}

// Écran « Qui êtes-vous ? » (compte connecté) : noms seulement.
function personnesResponsables(cle) {
  exigerSession_(cle);
  return lirePersonnes_().map(function (p) {
    return { id: p.id, nom: p.nom };
  });
}

function listerPersonnes(jeton) {
  exigerAdmin_(jeton);
  return lirePersonnes_().map(function (p) {
    return { id: p.id, nom: p.nom, creeLe: p.creeLe };
  });
}

// Passer aux codes personnels (depuis « aucun code » ou le code commun) : la personne qui
// le fait crée aussitôt SON code (sinon plus personne n'entrerait). Le code commun est
// retiré. Sans code : compte connecté (comme la création du code commun).
function passerCodesPersonnels(nom, code, jeton, cle) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const protege = codeExige_();
    if (protege) exigerAdmin_(jeton);
    if (lirePersonnes_().length) return { ok: false, message: "Les codes personnels sont déjà en place." };
    const appelant = appelantDeCle_(cleAppelant_(cle, jeton));
    const panneau = jeton === undefined && cle === undefined && estEditeurDuClasseur_();
    if (!protege && !panneau && !(appelant && appelant.compte))
      return { ok: false, message: "Connectez-vous avec un compte." };
    nom = (nom || "").toString().trim().slice(0, 40);
    code = (code || "").toString();
    const erreur = controlerPersonne_([], nom, code);
    if (erreur) return { ok: false, message: erreur };
    const qui = protege ? quiJeton_(jeton) : appelant ? appelant.nom : quiPanneau_();
    const p = nouvellePersonne_(nom, code);
    const props = PropertiesService.getDocumentProperties();
    ecrirePersonnes_([p]);
    ["ADMIN_PIN_HASH", "ADMIN_PIN_SEL"].forEach(function (k) {
      props.deleteProperty(k);
    });
    effacerEssais_(props);
    if (protege) nouvelleGenerationAdmin_(); // espaces ouverts avec l'ancien code : refermés
    journaliser_(qui, "Codes personnels activés", "première personne : " + nom, true);
    return { ok: true, jeton: creerJetonAdmin_(appelant, p) };
  } finally {
    lock.releaseLock();
  }
}

// Ajout (espace ouvert) : le code est tapé par la personne elle-même.
function ajouterPersonne(nom, code, jeton) {
  exigerAdmin_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const liste = lirePersonnes_();
    if (!liste.length) return { ok: false, message: "Passez d'abord aux codes personnels." };
    nom = (nom || "").toString().trim().slice(0, 40);
    code = (code || "").toString();
    const erreur = controlerPersonne_(liste, nom, code);
    if (erreur) return { ok: false, message: erreur };
    liste.push(nouvellePersonne_(nom, code));
    ecrirePersonnes_(liste);
    journaliser_(quiJeton_(jeton), "Personne ajoutée (code personnel)", nom, true);
    return { ok: true, message: "« " + nom + " » peut ouvrir l'espace responsable avec son code." };
  } finally {
    lock.releaseLock();
  }
}

// Retrait (départ, code oublié) : jamais la dernière personne (sinon l'espace s'ouvrirait
// sans code : pour cela, « Ne plus demander de code »). Ses espaces ouverts se referment.
function retirerPersonne(id, jeton) {
  exigerAdmin_(jeton);
  const qui = quiJeton_(jeton);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const liste = lirePersonnes_();
    const p = liste.filter(function (x) {
      return x.id === id;
    })[0];
    if (!p) return { ok: false, message: "Cette personne n'existe plus." };
    if (liste.length === 1)
      return {
        ok: false,
        message: "Impossible de retirer la dernière personne : choisissez « Ne plus demander de code ».",
      };
    ecrirePersonnes_(
      liste.filter(function (x) {
        return x.id !== id;
      })
    );
    PropertiesService.getDocumentProperties().deleteProperty("PIN_ESSAIS_P_" + id);
    journaliser_(qui, "Personne retirée (code personnel)", p.nom, true);
    return { ok: true, message: "« " + p.nom + " » retiré(e)." };
  } finally {
    lock.releaseLock();
  }
}

// Changer SON code (la personne qui a ouvert l'espace avec son code).
function changerMonCode(code, jeton) {
  exigerAdmin_(jeton);
  const moi = personneDuJeton_(jeton);
  if (!moi) return { ok: false, message: "Ouvrez l'espace avec votre code personnel." };
  code = (code || "").toString();
  if (!ADMIN_PIN_REGEX.test(code))
    return { ok: false, message: "Le code doit contenir exactement 6 chiffres." };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const qui = quiJeton_(jeton);
    const liste = lirePersonnes_();
    liste.forEach(function (p) {
      if (p.id === moi.id) {
        p.sel = Utilities.getUuid();
        p.hash = empreintePin_(p.sel, code);
      }
    });
    ecrirePersonnes_(liste);
    PropertiesService.getDocumentProperties().deleteProperty("PIN_ESSAIS_P_" + moi.id);
    journaliser_(qui, "Code personnel changé", moi.nom);
    return { ok: true, message: "Votre code est changé." };
  } finally {
    lock.releaseLock();
  }
}
