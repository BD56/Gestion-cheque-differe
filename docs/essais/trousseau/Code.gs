// Essai « trousseau » (gestionnaire de mots de passe) — projet Apps Script À PART, sans
// lien avec l'application. Question : le gestionnaire de mots de passe du navigateur
// (trousseau de Safari, Chrome…) peut-il garder la clé d'un appareil depuis une page
// Apps Script (cadre googleusercontent.com) et la proposer quand le navigateur a oublié
// le stockage de la page (Safari quitté avec Cmd+Q) ? Mode d'emploi : README.md.

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Page")
    .setTitle("Essai trousseau")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Envoi réel du formulaire vers un cadre caché (autre méthode d'enregistrement).
function doPost() {
  return HtmlService.createHtmlOutput("<p>Formulaire reçu.</p>").setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}

function adresseEssai() {
  return ScriptApp.getService().getUrl();
}

// Fausse clé courte (ex. 3f9a-07c2-b1d4) : facile à retaper à la main si besoin.
// Une nouvelle clé remplace la précédente (comme « Remplacer » dans l'application).
function creerCleEssai(nom) {
  const hex = Utilities.getUuid().replace(/-/g, "").slice(0, 12);
  const cle = hex.match(/.{4}/g).join("-");
  const props = PropertiesService.getScriptProperties();
  props.setProperty("CLE_ESSAI", cle);
  props.setProperty("NOM_ESSAI", String(nom || "").trim() || "Essai");
  return cle;
}

// Comme l'application : seule la clé compte ; le nom sert à l'afficher.
function connexionEssai(cle) {
  const props = PropertiesService.getScriptProperties();
  const attendue = props.getProperty("CLE_ESSAI");
  if (!attendue) return { ok: false, raison: "aucune" };
  if (String(cle || "").trim() !== attendue) return { ok: false, raison: "differente" };
  return { ok: true, nom: props.getProperty("NOM_ESSAI") || "Essai Mac" };
}
