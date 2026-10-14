// Installation : feuilles, robots de nuit, copie du modèle, menu « Installer ».

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Installation_() {
  return "2026.10.14-0200";
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
  let rapport = [];
  if (nettoyerSiCopie_())
    rapport.push("Nouvelle copie détectée : code responsable, dates et réglages hérités effacés.");
  rapport = rapport.concat(installerFeuilles_(), installerDeclencheurs_());
  let problemes = [];
  try {
    problemes = verifierInstallation_();
  } catch (e) {
    rapport.push("Contrôle des fichiers impossible : " + e.message);
  }
  if (problemes.length) {
    rapport.unshift("⚠️ INSTALLATION INCOMPLÈTE (l'application est bloquée) :\n- " + problemes.join("\n- "));
  }
  if (rapport.length === 0) rapport.push("Rien à faire : tout est déjà en place.");
  rapport.push("Version " + version_Installation_() + ".");
  Logger.log(rapport.join("\n"));
  return rapport.join("\n");
}

// Crée les robots de nuit manquants. Renvoie la liste de ce qui a été fait.
function installerDeclencheurs_() {
  const faits = [];
  const existants = ScriptApp.getProjectTriggers().map(function (t) {
    return t.getHandlerFunction();
  });
  if (existants.indexOf("verificationClotureNocturne") === -1) {
    ScriptApp.newTrigger("verificationClotureNocturne").timeBased().everyDays(1).atHour(1).create();
    faits.push(
      "Déclencheur créé : clôture automatique et suppression des archives de plus de 3 ans (chaque nuit vers 1h)."
    );
  }
  if (ANNUAIRE_ACTIF && existants.indexOf("purgerAnnuaire") === -1) {
    ScriptApp.newTrigger("purgerAnnuaire").timeBased().everyDays(1).atHour(3).create();
    faits.push("Déclencheur créé : purge de l'annuaire (chaque nuit vers 3h).");
  }
  return faits;
}

// État des robots de nuit (affiché dans l'espace responsable).
function etatRobots_() {
  const noms = ScriptApp.getProjectTriggers().map(function (t) {
    return t.getHandlerFunction();
  });
  const props = PropertiesService.getDocumentProperties();
  return {
    cloture: noms.indexOf("verificationClotureNocturne") !== -1,
    purge: !ANNUAIRE_ACTIF || noms.indexOf("purgerAnnuaire") !== -1,
    derniereNuit: props.getProperty("DERNIERE_NUIT") || "",
    derniereNuitMs: Number(props.getProperty("DERNIERE_NUIT_MS") || 0),
  };
}

// Depuis le menu du Sheet : installe puis affiche le compte rendu + la suite
// (et le code d'activation si le code responsable n'existe pas encore).
function installerDepuisMenu() {
  const ui = SpreadsheetApp.getUi(); // échoue hors du Google Sheets : rien n'est fait
  let rapport = installer();
  const props = PropertiesService.getDocumentProperties();
  if (!props.getProperty("ADMIN_PIN_HASH")) rapport += "\n\n" + texteActivation_(genererCodeActivation_());
  ui.alert(
    "🧰 Installation",
    rapport +
      "\n\nSi l'application n'est pas encore en ligne : Extensions → Apps Script → " +
      "Déployer → Nouveau déploiement → Application Web (voir INSTALLATION.md).",
    ui.ButtonSet.OK
  );
}

// Menu du Sheet « 🔑 Code d'activation » : pour créer le code responsable depuis
// l'application (1re installation, ou après « Réinitialiser le code »).
function afficherCodeActivation() {
  const ui = SpreadsheetApp.getUi();
  exigerEditeur_();
  if (PropertiesService.getDocumentProperties().getProperty("ADMIN_PIN_HASH")) {
    ui.alert(
      "🔑 Code d'activation",
      "Un code responsable existe déjà : il sert à autoriser les tablettes.\n\n" +
        "Code oublié ? Panneau ⚙️ (à droite) → « Réinitialiser le code responsable » : un code d'activation sera alors affiché.",
      ui.ButtonSet.OK
    );
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
  const props = PropertiesService.getDocumentProperties();
  const id = SpreadsheetApp.getActiveSpreadsheet().getId();
  const marque = props.getProperty("ID_CLASSEUR");
  if (marque === id) return false;
  if (marque) props.deleteAllProperties();
  props.setProperty("ID_CLASSEUR", id);
  return !!marque;
}

// Copie pas encore installée ? (lecture seule, utilisable dans onOpen)
function estCopieNonInstallee_() {
  try {
    const marque = PropertiesService.getDocumentProperties().getProperty("ID_CLASSEUR");
    return !!marque && marque !== SpreadsheetApp.getActiveSpreadsheet().getId();
  } catch (e) {
    return false;
  }
}

// Crée les feuilles manquantes. Renvoie la liste de ce qui a été fait.
function installerFeuilles_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const faits = [];
  if (!ss.getSheetByName(FEUILLE_SAISIES)) {
    const f = ss.insertSheet(FEUILLE_SAISIES, 0);
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
// --- CONTRÔLE DE L'INSTALLATION ---
//     Après une mise à jour par copier-coller, un fichier oublié ou resté à
//     l'ancienne version ferait tourner l'application à moitié (ex. ancienne
//     détection des doublons). Chaque fichier porte le même numéro de version
//     (outils/version.js) : on vérifie qu'ils sont tous là et identiques.
//     Référence : le numéro de ce fichier-ci (Installation.gs).
// =================================================================
// Renvoie la liste des problèmes (vide = installation complète).
function verifierInstallation_() {
  const attendue = version_Installation_();
  const problemes = [];
  FICHIERS_SERVEUR.forEach(function (nom) {
    const f = globalThis["version_" + nom + "_"];
    if (typeof f !== "function") problemes.push(nom + ".gs : absent (ou sans numéro de version)");
    else if (f() !== attendue) problemes.push(nom + ".gs : version " + f() + " au lieu de " + attendue);
  });
  FICHIERS_PAGE.forEach(function (nom) {
    let contenu;
    try {
      contenu = HtmlService.createHtmlOutputFromFile(nom).getContent();
    } catch (e) {
      // Index.html sert de témoin : s'il est illisible, c'est le contrôle qui est en panne
      // (pas 12 fichiers absents) -> erreur, et l'application s'ouvre quand même.
      if (nom === "Index") throw e;
      problemes.push(nom + ".html : absent");
      return;
    }
    // Marque en attribut data-version="…" (les commentaires <!-- --> sont retirés par Apps Script)
    const m = /data-version=(?:"|'|&quot;)?([\w.-]+)/.exec(contenu);
    // Index.html sert de témoin : sans marque lisible chez lui, c'est le contrôle qui ne
    // fonctionne pas sur cette installation -> erreur, et l'application s'ouvre quand même.
    if (!m && nom === "Index") throw new Error("marque de version illisible dans Index.html");
    if (!m) problemes.push(nom + ".html : sans numéro de version (ancienne version)");
    else if (m[1] !== attendue) problemes.push(nom + ".html : version " + m[1] + " au lieu de " + attendue);
  });
  return problemes;
}

// Pour le démarrage : une panne du contrôle lui-même ne bloque pas la caisse.
function problemesInstallation_() {
  try {
    return verifierInstallation_();
  } catch (e) {
    Logger.log("Contrôle de l'installation impossible : " + e);
    return [];
  }
}

// Page affichée sur la tablette à la place de l'application.
function pageInstallationIncomplete_(problemes) {
  const esc = function (t) {
    return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  const html =
    '<div style="font-family: sans-serif; max-width: 520px; margin: 40px auto; padding: 0 16px;">' +
    "<h2>⚠️ Installation incomplète</h2>" +
    "<p>L'application n'a pas été entièrement mise à jour : elle ne peut pas être utilisée " +
    "dans cet état (les contrôles de doublons pourraient être faux).</p>" +
    "<ul><li>" +
    problemes.map(esc).join("</li><li>") +
    "</li></ul>" +
    "<p>Prévenez le responsable : il doit recopier les fichiers indiqués (ou refaire " +
    "« clasp push »), puis lancer « 🚀 APPLICATION → 🧰 Installer / vérifier ».</p></div>";
  return HtmlService.createHtmlOutput(html)
    .setTitle("Installation incomplète")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
