// Audit d'affichage : chaque écran / état de la tablette, à plusieurs tailles d'écran.
// Signale : défilement horizontal de la page, élément qui sort de l'écran ou de son
// cadre, texte coupé, boutons / champs qui se chevauchent, cible tactile trop petite,
// erreurs JavaScript. Écrit une capture par état et un rapport.
//
//   NODE_PATH=$(npm root -g) node outils/audit.js <dossier> [filtre-taille]
/* global document, window, getComputedStyle */ // controler() s'exécute dans la page
const fs = require("fs");
const path = require("path");
const { ouvrir } = require("../tests/navigateur");
const { FakeSheet } = require("../tests/fakesheet");

const dossier = process.argv[2];
if (!dossier) {
  console.log("Usage : node outils/audit.js <dossier> [filtre]");
  process.exit(1);
}
fs.mkdirSync(dossier, { recursive: true });
const repo = path.join(__dirname, "..");
const TAILLES = {
  "ipad-paysage": { width: 1024, height: 768, tactile: true },
  "ipad-hauteur": { width: 768, height: 1024, tactile: true },
  "ipad-air-paysage": { width: 1180, height: 820, tactile: true },
  "android-paysage": { width: 1280, height: 800, tactile: true },
  "android-hauteur": { width: 800, height: 1280, tactile: true },
  "ipad-pro-paysage": { width: 1366, height: 1024, tactile: true },
  telephone: { width: 390, height: 844, tactile: true },
  "petit-telephone": { width: 360, height: 640, tactile: true },
  ordinateur: { width: 1440, height: 900, tactile: false },
  "grand-ecran": { width: 2000, height: 1200, tactile: false },
};
const filtre = process.argv[3] || "";

function feuille() {
  const hier = new Date(Date.now() - 86400000);
  const s = new FakeSheet("Saisies", [
    ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    [
      hier,
      "BERNARD-DELACROIX",
      "MARIE-CHRISTINE",
      "880412345678",
      1250.5,
      "Caisse 12 | ⚠️ Ajout forcé (Cas C)",
    ],
    [new Date(), "MARTIN", "SOPHIE", "123456789012", 150, ""],
    [new Date(), "DURAND", "PAUL", "AB1234567", "89,90 €", "ℹ️ Passage 2/2"],
    [new Date(), "N'GUYEN", "THI", "X9", 20, "Caisse 3 | ⚠️ Ajout forcé (Cas B)"],
  ]);
  s.getRange("Z1").setValue("SIGNALER");
  return { Saisies: s };
}

// Contrôles faits DANS la page sur tout ce qui est visible
function controler() {
  const pb = [];
  const vw = document.documentElement.clientWidth,
    vh = window.innerHeight;
  if (document.documentElement.scrollWidth > vw + 1)
    pb.push("page plus large que l'écran (" + document.documentElement.scrollWidth + " > " + vw + ")");
  const visible = (e) => {
    const r = e.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    for (let x = e; x; x = x.parentElement) {
      const s = getComputedStyle(x);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    }
    return true;
  };
  const nom = (e) =>
    e.tagName.toLowerCase() +
    (e.id ? "#" + e.id : "") +
    (e.className && typeof e.className === "string" ? "." + e.className.trim().split(/\s+/).join(".") : "") +
    (e.textContent ? " « " + e.textContent.trim().replace(/\s+/g, " ").slice(0, 40) + " »" : "");
  // Le calque du dessus (fenêtre, alerte, espace responsable) est seul contrôlé
  const calques = [
    "#ecranTourner",
    "#ecranConnexion",
    "#modalAlerteServeur",
    "#boxConfirmation",
    "#modalParametres",
    "#modalAide",
    "#modalMentions",
    "#modalAnnuaire",
  ]
    .map((s) => document.querySelector(s))
    .filter((e) => e && visible(e));
  const racine = calques[0] || document.querySelector(".app");
  const elements = [...racine.querySelectorAll("*")].filter(visible);
  const interactifs = elements.filter((e) => e.matches("button, input, select, a, .languette"));
  for (const e of elements) {
    const r = e.getBoundingClientRect();
    // hors de l'écran à droite / à gauche (sauf dans un conteneur qui défile)
    let defile = false;
    for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) {
      const s = getComputedStyle(x);
      if (/(auto|scroll)/.test(s.overflowX)) {
        defile = true;
        break;
      }
    }
    if (!defile && (r.right > vw + 1 || r.left < -1)) pb.push("sort de l'écran : " + nom(e));
    // texte coupé (contenu plus large que la boîte, sans défilement prévu)
    const s = getComputedStyle(e);
    if (
      e.children.length === 0 &&
      e.textContent.trim() &&
      e.scrollWidth > e.clientWidth + 2 &&
      !/(auto|scroll)/.test(s.overflowX) &&
      s.textOverflow !== "ellipsis" && // raccourci volontaire « … »
      e.clientWidth > 0 &&
      !e.matches("input, select, option, textarea")
    )
      pb.push("texte coupé ou qui déborde : " + nom(e) + " (" + e.scrollWidth + " > " + e.clientWidth + ")");
    // sort de son parent visible (débordement)
    const p = e.parentElement;
    if (p && !defile) {
      const rp = p.getBoundingClientRect();
      const sp = getComputedStyle(p);
      if (
        sp.overflow === "visible" &&
        rp.width > 0 &&
        (r.right > rp.right + 2 || r.left < rp.left - 2) &&
        !/(absolute|fixed)/.test(s.position) &&
        !e.matches("svg, svg *, use")
      )
        pb.push("déborde de son cadre : " + nom(e) + " dans " + nom(p).slice(0, 60));
    }
  }
  // display écrit par le script qui écrase une grille / un flex de la feuille de style :
  // Chromium centre encore parfois (alignement en bloc), Safari non (bug vu sur Mac)
  for (const e of elements) {
    const enLigne = e.style.display;
    if (!enLigne || enLigne === "none") continue;
    e.style.display = "";
    const feuille = getComputedStyle(e).display;
    e.style.display = enLigne;
    if (/grid|flex/.test(feuille) && !/grid|flex/.test(enLigne))
      pb.push("display « " + enLigne + " » écrase « " + feuille + " » : " + nom(e).slice(0, 60));
  }
  // chevauchements entre éléments interactifs
  for (let i = 0; i < interactifs.length; i++)
    for (let j = i + 1; j < interactifs.length; j++) {
      const a = interactifs[i],
        b = interactifs[j];
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(),
        rb = b.getBoundingClientRect();
      const x = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const y = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (x > 2 && y > 2) pb.push("se chevauchent : " + nom(a).slice(0, 50) + " / " + nom(b).slice(0, 50));
    }
  // cibles tactiles trop petites (boutons visibles dans l'écran)
  for (const e of interactifs) {
    if (!e.matches("button, .languette")) continue;
    const r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) continue;
    if (
      r.height < 36 &&
      !e.matches(".quand-meme, .lien-modifier, .imprimer-jour, .continuer, .retour, .footer-legal a")
    )
      pb.push("bouton peu haut (" + Math.round(r.height) + " px) : " + nom(e).slice(0, 60));
  }
  return [...new Set(pb)];
}

// États à parcourir : [nom, préparation]
const ETATS = [
  ["01-saisie", async () => {}],
  [
    "02-saisie-verdict",
    async (p) => {
      await p.fill("#piece", "123456789012");
      await p.press("#piece", "Tab");
    },
  ],
  [
    "03-alerte-A",
    async (p) => {
      await p.fill("#nom", "MARTIN");
      await p.fill("#prenom", "SOPHIE");
      await p.fill("#montant", "40");
      await p.click("#btnValider");
    },
  ],
  [
    "04-alerte-confirmer",
    async (p) => {
      await p.click("#boxConfirmation >> text=Enregistrer quand même…");
    },
  ],
  [
    "05-alerte-C",
    async (p) => {
      await p.click("#actionSignaler .stop");
      await p.fill("#piece", "999");
      await p.fill("#nom", "MARTIN");
      await p.fill("#prenom", "SOPHIE");
      await p.fill("#montant", "40");
      await p.evaluate(
        "cacheVerif.offre = cacheVerif.offre.filter(o => o.pieceNorm !== '123456789012' || true)"
      );
      await p.click("#btnValider");
    },
  ],
  [
    "06-enregistre",
    async (p) => {
      await p.click("#actionSignaler .stop");
      await p.fill("#piece", "555666777");
      await p.fill("#nom", "LEROY-BEAULIEU DE LA TOUR");
      await p.fill("#prenom", "ANNE-SOPHIE");
      await p.fill("#montant", "12345,67");
      await p.fill("#notes", "Caisse 14 — chèque à encaisser le 30 novembre");
      await p.click("#btnValider");
    },
  ],
  [
    "07-journal",
    async (p) => {
      if (await p.isVisible("#languette")) await p.click("#languette");
    },
  ],
  [
    "08-alerte-serveur",
    async (p) => {
      await p.evaluate(
        "alerterServeur({nom:'MARTIN',prenom:'SOPHIE',piece:'123456789012',montant:'40,00 €',notes:''}, {status:'CONFIRMATION',cas:'A',titre:'🛑 ALERTE FRAUDE',message:'Ce client a déjà été enregistré avec ce numéro de pièce d\\'identité.',details:cacheVerif.offre.slice(0,2).map((o,i)=>Object.assign({type:i?'C':'A'},o))})"
      );
    },
  ],
  [
    "09-alerte-reseau",
    async (p) => {
      await p.evaluate(
        "alerteAfficheeA = 0; fermerAlerteServeur(); alerterServeur({nom:'X',prenom:'Y',piece:'Z1',montant:'5,00 €'}, null)"
      );
    },
  ],
  [
    "10-aide",
    async (p) => {
      await p.evaluate("alerteAfficheeA = 0; fermerAlerteServeur()");
      await p.click('button[title="Aide et consignes"]');
    },
  ],
  [
    "11-aide-alertes",
    async (p) => {
      await p.click('#modalAide .tuile:has-text("Les alertes")');
    },
  ],
  [
    "12-aide-scan",
    async (p) => {
      await p.evaluate("allerAide('scan')");
    },
  ],
  [
    "13-mentions",
    async (p) => {
      await p.click("#modalAide .btn-close-modal");
      await p.click("text=Mentions légales");
    },
  ],
  [
    "14-client-connu",
    async (p) => {
      await p.click("#modalMentions .btn-close-modal");
      await p.evaluate("proposerAnnuaire({nom:'BERNARD-DELACROIX',prenom:'MARIE-CHRISTINE'})");
    },
  ],
  [
    "15-toast",
    async (p) => {
      await p.evaluate(
        "ignorerAnnuaire(); afficherToast('Impression impossible : la connexion avec le serveur a échoué (délai dépassé).', 'error')"
      );
    },
  ],
  [
    "16-responsable-code",
    async (p) => {
      await p.click('button[title="Panneau de contrôle"]');
    },
  ],
  [
    "17-responsable-ensemble",
    async (p, env) => {
      const j = env.creerCode("258025").jeton;
      await p.evaluate("jetonAdmin = " + JSON.stringify(j.j) + "; afficherZoneAdmin()");
    },
  ],
  [
    "18-responsable-saisies",
    async (p) => {
      await p.click('[data-ecran-lien="saisies"]');
    },
  ],
  [
    "19-responsable-correction",
    async (p) => {
      await p.click("#listeSaisies .ligne-saisie >> nth=0 >> text=Corriger");
      await p.fill("#corPiece", "AB1234567");
      await p.click("#vueCorrection >> text=Enregistrer la correction");
    },
  ],
  [
    "20-responsable-operation",
    async (p) => {
      await p.click('[data-ecran-lien="operation"]');
      await p.click("#modalParametres >> text=Clôturer maintenant");
    },
  ],
  [
    "21-responsable-securite",
    async (p) => {
      await p.click('[data-ecran-lien="securite"]');
    },
  ],
  [
    "22-responsable-impression",
    async (p) => {
      await p.click('[data-ecran-lien="impression"]');
    },
  ],
  [
    "23-responsable-archives",
    async (p) => {
      await p.click('[data-ecran-lien="archives"]');
    },
  ],
  [
    "24-responsable-reglages",
    async (p) => {
      await p.click('[data-ecran-lien="reglages"]');
    },
  ],
  [
    "25-responsable-code-comptes",
    async (p, env) => {
      // le compte connecté (« Caisse test ») + un second, au nom long
      const comptes = JSON.parse(env.props.getProperty("COMPTES") || "[]");
      comptes.push({
        id: "c2",
        identifiant: "Caisse centrale 2 — accueil et service client",
        creeLe: "13/10/2026 09:30",
      });
      env.props.setProperty("COMPTES", JSON.stringify(comptes));
      await p.click('[data-ecran-lien="code"]');
      await p.waitForTimeout(200);
      await p.click("#listeComptes > div:first-child button");
    },
  ],
  [
    "26-hors-periode",
    async (p) => {
      await p.click("#modalParametres .btn-close-modal");
      await p.evaluate("appliquerDates({debut:'2099-01-01', fin:'2099-01-03'}, true)");
    },
  ],
  [
    "27-premiere-installation",
    async (p) => {
      await p.evaluate("afficherEcranConnexion()");
    },
  ],
  [
    "28-code-a-part",
    async (p) => {
      await p.evaluate(
        "document.getElementById('formConnexion').style.display='none';" +
          "document.getElementById('titreConnexion').textContent='Compte créé';" +
          "document.getElementById('txtConnexion').textContent='« Caisse centrale 1 » est connecté sur cet appareil.';" +
          "document.getElementById('txtCodeAPart').textContent='Protéger l\\'espace responsable par un code à part (6 chiffres) ? Sans code, tout compte connecté l\\'ouvre directement.';" +
          "document.getElementById('btnCodeAPartNon').textContent='Non, pas de code';" +
          "document.getElementById('blocCodeAPart').style.display='block'; choisirCodeAPart('choisir')"
      );
    },
  ],
  [
    "29-connexion",
    async (p, env) => {
      env.props.setProperty("COMPTES", JSON.stringify([{ id: "c1", identifiant: "Caisse centrale 1" }]));
      await p.evaluate(
        "afficherEcranConnexion('Session terminée : reconnectez-vous. La saisie sera envoyée ensuite.')"
      );
    },
  ],
];

async function auditer(nomTaille) {
  const t = TAILLES[nomTaille];
  const { env, page, browser, erreursPage } = await ouvrir(repo, {
    sheets: feuille(),
    page: { viewport: { width: t.width, height: t.height }, isMobile: t.tactile, hasTouch: t.tactile },
  });
  const lignes = [];
  try {
    // tablette en hauteur : on accepte de continuer en hauteur (l'écran « tourner » est audité à part)
    if (await page.isVisible("#ecranTourner")) {
      await page.screenshot({ path: path.join(dossier, nomTaille + "-00-tourner.png") });
      const pb0 = await page.evaluate(controler);
      if (pb0.length) lignes.push("00-tourner :\n  - " + pb0.join("\n  - "));
      await page.tap("#ecranTourner .continuer");
    }
    for (const [nom, preparer] of ETATS) {
      try {
        await preparer(page, env);
      } catch (e) {
        lignes.push(nom + " : ÉTAPE IMPOSSIBLE " + e.message.split("\n")[0]);
        continue;
      }
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(dossier, nomTaille + "-" + nom + ".png") });
      const pb = await page.evaluate(controler);
      if (pb.length) lignes.push(nom + " :\n  - " + pb.join("\n  - "));
    }
    if (erreursPage.length) lignes.push("ERREURS JS : " + erreursPage.join(" | "));
  } finally {
    await browser.close();
  }
  return lignes;
}

(async () => {
  let rapport = "";
  for (const t of Object.keys(TAILLES).filter((x) => x.includes(filtre))) {
    const l = await auditer(t);
    rapport +=
      "\n=== " +
      t +
      " (" +
      TAILLES[t].width +
      "×" +
      TAILLES[t].height +
      ") : " +
      (l.length ? l.length + " état(s) à revoir" : "rien à signaler") +
      "\n" +
      l.join("\n") +
      "\n";
  }
  fs.writeFileSync(path.join(dossier, "rapport.txt"), rapport);
  console.log(rapport);
})().catch((e) => {
  console.log("ÉCHEC " + e.message);
  process.exit(1);
});
