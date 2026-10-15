// Captures d'écran des principaux écrans de la tablette (refonte graphique : avant / après).
// Faux serveur et données fictives, comme les tests (tests/navigateur.js).
//
//   NODE_PATH=$(npm root -g) node outils/captures.js <dossier>
//
// Écrit <dossier>/<écran>-<format>.png pour chaque format (paysage, portrait, téléphone).
const fs = require("fs");
const path = require("path");
const { ouvrir } = require("../tests/navigateur");
const { FakeSheet } = require("../tests/fakesheet");

const dossier = process.argv[2];
if (!dossier) {
  console.log("Usage : node outils/captures.js <dossier>");
  process.exit(1);
}
fs.mkdirSync(dossier, { recursive: true });
const repo = path.join(__dirname, "..");
const FORMATS = {
  paysage: { width: 1180, height: 820 },
  portrait: { width: 820, height: 1180 },
  telephone: { width: 420, height: 900 },
};

function feuille() {
  const s = new FakeSheet("Saisies", [
    ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    [new Date(), "MARTIN", "SOPHIE", "123456789012", "150 €", ""],
    [new Date(), "DURAND", "PAUL", "880412345678", "89,90 €", ""],
  ]);
  s.getRange("Z1").setValue("SIGNALER");
  return { Saisies: s };
}

async function ecrans(format) {
  const { env, page, browser, erreursPage } = await ouvrir(repo, { sheets: feuille() });
  const prendre = async (nom) => {
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(dossier, nom + "-" + format + ".png"), fullPage: true });
  };
  const fermer = (id) =>
    page.$eval("#" + id, (el) => {
      el.style.display = "none";
    });
  try {
    await page.setViewportSize(FORMATS[format]);
    await prendre("1-saisie");
    await page.click('button[title="Aide et consignes"]');
    await prendre("2-aide");
    await page.click('#modalAide .tuile:has-text("Les alertes")');
    await prendre("3-aide-alertes");
    await fermer("modalAide");
    await page.click('button[title="Panneau de contrôle"]');
    await prendre("4-parametres");
    await fermer("modalParametres");
    await page.fill("#piece", "123456789012");
    await page.press("#piece", "Tab");
    await prendre("5-piece-deja-vue");
    await page.fill("#nom", "MARTIN");
    await page.fill("#prenom", "SOPHIE");
    await page.fill("#montant", "40");
    await page.click("#btnValider");
    await prendre("6-alerte-A");
    await page.click("#actionSignaler >> text=Ne pas enregistrer");
    await page.fill("#piece", "555");
    await page.fill("#nom", "LEROY");
    await page.fill("#prenom", "ANNE");
    await page.fill("#montant", "20");
    await page.click("#btnValider");
    await prendre("7-enregistre");
    await page.click("#languette");
    await prendre("8-journal");
    // Espace responsable : verrouillé (code + impression libre), puis déverrouillé
    await page.click('button[title="Panneau de contrôle"]');
    await prendre("9-responsable-code");
    const jeton = env.creerCode("258025").jeton;
    // dans la page : variables de ScriptResponsable.html
    await page.evaluate("jetonAdmin = " + JSON.stringify(jeton.j) + "; afficherZoneAdmin();");
    await prendre("10-responsable-ensemble");
    await page.click('[data-ecran-lien="saisies"]');
    await prendre("11-responsable-saisies");
    await page.click('[data-ecran-lien="operation"]');
    await prendre("12-responsable-operation");
    await page.click('[data-ecran-lien="securite"]');
    await prendre("13-responsable-securite");
    if (erreursPage.length) console.log(format + " : erreurs de la page : " + erreursPage.join(" | "));
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const f of Object.keys(FORMATS)) await ecrans(f);
  console.log("Captures dans " + dossier);
})().catch((e) => {
  console.log("ÉCHEC " + e.message);
  process.exit(1);
});
