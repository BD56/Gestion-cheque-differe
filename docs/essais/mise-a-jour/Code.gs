// Essai « mise à jour en un clic » — projet Apps Script À PART (deux Google Sheets
// d'essai), sans lien avec l'application ni avec des données de clients.
// Question : une copie (le « MAGASIN ») peut-elle remplacer son propre code par celui
// d'un projet « SOURCE » (le futur MODÈLE), créer une version, mettre à jour son
// déploiement (même adresse /exec) et revenir en arrière, en un clic depuis le menu du
// Sheet ? Avec l'API Apps Script (script.googleapis.com). Mode d'emploi : README.md.

// Numéro de cette version du code. Il doit être IDENTIQUE à data-version dans Page.html
// (contrôle : tous les fichiers de la source sont de la même version).
const VERSION = "1";

// Identifiant du projet SOURCE (éditeur Apps Script du Sheet SOURCE → ⚙️ Paramètres du
// projet → ID du script). Hérité tel quel par la copie (MAGASIN) : c'est ainsi qu'elle
// sait où chercher les mises à jour.
const SOURCE_ID = "COLLER_ICI_L_ID_DU_PROJET_SOURCE";

const API = "https://script.googleapis.com/v1/projects/";

function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu("🧪 Essai MAJ");
  if (ScriptApp.getScriptId() === SOURCE_ID) {
    menu.addItem("ℹ️ Je suis la SOURCE (version " + VERSION + ")", "infoSource");
  } else {
    menu
      .addItem("🔄 Vérifier / mettre à jour", "verifierEtMettreAJour")
      .addItem("↩️ Revenir à la version précédente", "revenirEnArriere")
      .addItem("📋 Résultat de l'essai", "voirResultat");
  }
  menu.addToUi();
}

// Page web : affiche la version du serveur ET celle de la page (les deux fichiers ont-ils
// été remplacés ?) et un compteur gardé dans les propriétés (survit-il à la mise à jour ?).
function doGet() {
  const props = PropertiesService.getDocumentProperties();
  const n = Number(props.getProperty("COMPTEUR") || 0) + 1;
  props.setProperty("COMPTEUR", String(n));
  const t = HtmlService.createTemplateFromFile("Page");
  t.versionServeur = VERSION;
  t.compteur = n;
  return t
    .evaluate()
    .setTitle("Essai mise à jour")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function infoSource() {
  SpreadsheetApp.getUi().alert(
    "SOURCE",
    "Ce Sheet joue le MODÈLE (version " +
      VERSION +
      "). Pour publier une nouvelle version : changer VERSION dans Code.gs ET data-version " +
      "dans Page.html (même numéro), enregistrer. Les copies la verront avec « Vérifier ».",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// --- Appel de l'API Apps Script avec le jeton du compte (portées : appsscript.json) ---
function api_(methode, chemin, corps) {
  const options = {
    method: methode,
    headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  if (corps) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(corps);
  }
  const r = UrlFetchApp.fetch(API + chemin, options);
  const code = r.getResponseCode();
  const texte = r.getContentText();
  if (code >= 300) throw new Error(explication_(code, texte, methode, chemin));
  return texte ? JSON.parse(texte) : {};
}
function explication_(code, texte, methode, chemin) {
  if (code === 403 && /Apps Script API|has not (been )?(used|enabled)|disabled/i.test(texte))
    return (
      "L'API Apps Script n'est pas activée pour ce compte : ouvrir " +
      "https://script.google.com/home/usersettings → « API Google Apps Script » : Activé, " +
      "puis réessayer (quelques minutes peuvent être nécessaires). [" +
      code +
      "]"
    );
  if (code === 404 && chemin.indexOf(SOURCE_ID) === 0)
    return "Projet SOURCE introuvable ou non partagé avec ce compte (SOURCE_ID correct ?). [404]";
  return "Erreur " + code + " (" + methode.toUpperCase() + " " + chemin + ") : " + texte.slice(0, 600);
}

// Version annoncée par un jeu de fichiers ; refus si Code et Page ne concordent pas.
function versionDesFichiers_(fichiers) {
  const code = fichiers.filter((f) => f.name === "Code" && f.type === "SERVER_JS")[0];
  const page = fichiers.filter((f) => f.name === "Page" && f.type === "HTML")[0];
  const v1 = code && /const VERSION = "([^"]+)"/.exec(code.source);
  const v2 = page && /data-version="([^"]+)"/.exec(page.source);
  if (!v1 || !v2) throw new Error("Source incomplète : fichier Code ou Page absent, ou numéro introuvable.");
  if (v1[1] !== v2[1])
    throw new Error(
      "Source incohérente : Code.gs dit " + v1[1] + ", Page.html dit " + v2[1] + ". Rien n'a été changé."
    );
  return v1[1];
}

// Déploiements « Application Web » à version fixe (pas le déploiement de test « Head »).
function deploiementsWeb_(id) {
  const r = api_("get", id + "/deployments");
  return (r.deployments || [])
    .filter(function (d) {
      return (
        d.deploymentConfig &&
        d.deploymentConfig.versionNumber &&
        (d.entryPoints || []).some(function (e) {
          return e.entryPointType === "WEB_APP";
        })
      );
    })
    .map(function (d) {
      const web = d.entryPoints.filter((e) => e.entryPointType === "WEB_APP")[0];
      return {
        deploymentId: d.deploymentId,
        versionNumber: d.deploymentConfig.versionNumber,
        url: web.webApp ? web.webApp.url : "",
      };
    });
}

function fichiersPourEcrire_(fichiers) {
  return fichiers.map(function (f) {
    return { name: f.name, type: f.type, source: f.source };
  });
}

function mettreDeploiementsA_(id, deploiements, versionNumber, description) {
  deploiements.forEach(function (d) {
    api_("put", id + "/deployments/" + d.deploymentId, {
      deploymentConfig: {
        scriptId: id,
        versionNumber: versionNumber,
        manifestFileName: "appsscript",
        description: description,
      },
    });
  });
}

// --- Le clic : vérifier, puis remplacer le code, créer une version, redéployer ---
function verifierEtMettreAJour() {
  const ui = SpreadsheetApp.getUi();
  const id = ScriptApp.getScriptId();
  const t0 = Date.now();
  const source = api_("get", SOURCE_ID + "/content");
  const dispo = versionDesFichiers_(source.files || []);
  if (dispo === VERSION) {
    ui.alert("Essai MAJ", "Déjà à jour (version " + VERSION + ").", ui.ButtonSet.OK);
    return;
  }
  const ok = ui.alert(
    "Essai MAJ",
    "Version " + dispo + " disponible (vous avez la " + VERSION + "). Mettre à jour maintenant ?",
    ui.ButtonSet.YES_NO
  );
  if (ok !== ui.Button.YES) return;
  const t1 = Date.now();
  const deploiements = deploiementsWeb_(id);
  if (!deploiements.length)
    throw new Error("Aucun déploiement « Application Web » : faire d'abord Déployer → Nouveau déploiement.");
  const etapes = [];
  // 1. Code remplacé (TOUS les fichiers, manifeste compris)
  api_("put", id + "/content", { files: fichiersPourEcrire_(source.files) });
  etapes.push("1. Code remplacé (" + source.files.length + " fichiers).");
  // 2. Version figée
  const v = api_("post", id + "/versions", { description: "Mise à jour " + VERSION + " → " + dispo });
  etapes.push("2. Version " + v.versionNumber + " créée.");
  // 3. Déploiement(s) mis à jour : même adresse
  mettreDeploiementsA_(id, deploiements, v.versionNumber, "Version " + dispo);
  etapes.push("3. " + deploiements.length + " déploiement(s) mis à jour.");
  const apres = deploiementsWeb_(id);
  const memeAdresse = deploiements.every(function (d) {
    return apres.some(function (a) {
      return a.deploymentId === d.deploymentId && a.url === d.url && a.versionNumber === v.versionNumber;
    });
  });
  etapes.push(memeAdresse ? "   Adresse /exec inchangée ✅" : "   ⚠️ Adresse ou version inattendue : voir « Résultat ».");
  // 4. Le NOUVEAU code lancé tout seul (comme « Installer » après une mise à jour)
  ScriptApp.newTrigger("apresMiseAJour")
    .timeBased()
    .after(60 * 1000)
    .create();
  etapes.push("4. Le nouveau code se lancera seul dans 1 à 2 min (« Résultat » pour vérifier).");
  const props = PropertiesService.getDocumentProperties();
  props.setProperty("PRECEDENTE", JSON.stringify({ versionNumber: deploiements[0].versionNumber, version: VERSION }));
  props.deleteProperty("RESULTAT");
  ui.alert(
    "Essai MAJ",
    "✅ Mise à jour " +
      VERSION +
      " → " +
      dispo +
      " faite en " +
      Math.round((Date.now() - t1) / 100) / 10 +
      " s (lecture de la source : " +
      Math.round((t1 - t0) / 100) / 10 +
      " s).\n\n" +
      etapes.join("\n") +
      "\n\nRechargez la page /exec : elle doit afficher la version " +
      dispo +
      ".",
    ui.ButtonSet.OK
  );
}

// Lancé par le déclencheur ponctuel : prouve que le NOUVEAU code tourne sans intervention.
function apresMiseAJour() {
  PropertiesService.getDocumentProperties().setProperty(
    "RESULTAT",
    "Code lancé seul après la mise à jour : version " +
      VERSION +
      ", le " +
      Utilities.formatDate(new Date(), "Europe/Paris", "dd/MM/yyyy HH:mm:ss")
  );
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "apresMiseAJour") ScriptApp.deleteTrigger(t);
  });
}

// --- Retour arrière : l'ancienne version (gardée par Google) redevient le code et le
// déploiement ---
function revenirEnArriere() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  const p = JSON.parse(props.getProperty("PRECEDENTE") || "null");
  if (!p) {
    ui.alert("Essai MAJ", "Aucune mise à jour à annuler.", ui.ButtonSet.OK);
    return;
  }
  const ok = ui.alert(
    "Essai MAJ",
    "Revenir à la version " + p.version + " (version Google n° " + p.versionNumber + ") ?",
    ui.ButtonSet.YES_NO
  );
  if (ok !== ui.Button.YES) return;
  const id = ScriptApp.getScriptId();
  const t0 = Date.now();
  const ancien = api_("get", id + "/content?versionNumber=" + p.versionNumber);
  api_("put", id + "/content", { files: fichiersPourEcrire_(ancien.files || []) });
  mettreDeploiementsA_(id, deploiementsWeb_(id), p.versionNumber, "Retour à la version " + p.version);
  props.deleteProperty("PRECEDENTE");
  ui.alert(
    "Essai MAJ",
    "↩️ Retour à la version " +
      p.version +
      " fait en " +
      Math.round((Date.now() - t0) / 100) / 10 +
      " s. Rechargez la page /exec : elle doit afficher la version " +
      p.version +
      ".",
    ui.ButtonSet.OK
  );
}

function voirResultat() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getDocumentProperties();
  let deploiements;
  try {
    deploiements = deploiementsWeb_(ScriptApp.getScriptId())
      .map(function (d) {
        return "- version Google n° " + d.versionNumber + " : " + d.url;
      })
      .join("\n");
  } catch (e) {
    deploiements = "(illisible : " + e.message + ")";
  }
  ui.alert(
    "Résultat de l'essai",
    "Code actuel (menu) : version " +
      VERSION +
      "\n" +
      (props.getProperty("RESULTAT") || "Pas encore de lancement automatique après une mise à jour.") +
      "\nCompteur de la page (doit continuer, pas repartir à 1) : " +
      (props.getProperty("COMPTEUR") || "0") +
      "\nDéploiements :\n" +
      deploiements,
    ui.ButtonSet.OK
  );
}
