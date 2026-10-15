// Essai « trousseau » (gestionnaire de mots de passe de Safari) — projet Apps Script À PART,
// sans lien avec l'application. Question : Safari peut-il enregistrer une clé dans son
// trousseau depuis une page Apps Script (cadre googleusercontent.com), puis la proposer
// après avoir été quitté (Cmd+Q) ? Mode d'emploi : README.md du même dossier.

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Page")
    .setTitle("Essai trousseau")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Méthode 2 : le formulaire est réellement envoyé (vers un cadre caché de la page).
function doPost() {
  return HtmlService.createHtmlOutput("<p>Formulaire reçu.</p>").setXFrameOptionsMode(
    HtmlService.XFrameOptionsMode.ALLOWALL
  );
}

function adresseEssai() {
  return ScriptApp.getService().getUrl();
}

// Fausse clé courte (ex. 3f9a-07c2-b1d4) : facile à retaper à la main si besoin.
function creerCleEssai() {
  const hex = Utilities.getUuid().replace(/-/g, "").slice(0, 12);
  const cle = hex.match(/.{4}/g).join("-");
  PropertiesService.getScriptProperties().setProperty("CLE_ESSAI", cle);
  return cle;
}

function verifierCleEssai(cle) {
  const attendue = PropertiesService.getScriptProperties().getProperty("CLE_ESSAI");
  if (!attendue) return "aucune";
  return String(cle || "").trim() === attendue ? "ok" : "differente";
}
