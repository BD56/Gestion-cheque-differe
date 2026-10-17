// Fenêtre de l'assistant d'installation (Assistant.html, rendue comme par Apps Script) :
// les 4 écrans dans Chromium, google.script.run -> faux serveur ; le QR code dessiné est
// décodé (jsQR) et doit donner l'adresse de l'application.
// Usage : node tests/test_ui_assistant.js <dépôt> [dossier des captures]
const assert = require("assert");
const { chromium } = require("playwright");
const jsQR = require("jsqr");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const repo = process.argv[2];
const captures = process.argv[3];
const J = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));
const ADRESSE = "https://script.google.com/macros/s/AKfycbTEST_magasin-X/exec";

const RUNNER = `
  (function () {
    function runner(ok, ko) {
      return new Proxy({}, { get: function (_, nom) {
        if (nom === 'withSuccessHandler') return function (h) { return runner(h, ko); };
        if (nom === 'withFailureHandler') return function (h) { return runner(ok, h); };
        return function () {
          window.__appels = window.__appels || []; window.__appels.push(nom);
          window.__serveur(nom, JSON.stringify([].slice.call(arguments))).then(function (r) {
            var o = JSON.parse(r);
            if (o.err) { if (ko) ko(new Error(o.err)); } else if (ok) ok(o.val);
          });
        };
      }});
    }
    window.google = { script: { run: runner(null, null), host: { close: function () { window.__ferme = true; } } } };
  })();`;

function nouvelleCopie() {
  const env = makeEnv({
    repo,
    idClasseur: "COPIE",
    activeEmail: "proprio@example.com",
    props: { ID_CLASSEUR: "MODELE" },
    sheets: { Démarrer: new FakeSheet("Démarrer"), "Feuille 1": new FakeSheet("Feuille 1") },
  });
  return env;
}
// Ouvre la fenêtre telle que ouvrirAssistant / ouvrirTablettes la montre
async function fenetre(browser, env, fonction, erreurs) {
  env.ctx[fonction]();
  const contenu = env.dialogues[env.dialogues.length - 1].contenu;
  const page = await browser.newPage({ viewport: { width: 660, height: 640 } });
  page.on("pageerror", (e) => erreurs.push(e.message));
  await page.exposeFunction("__serveur", (nom, args) => {
    try {
      if (typeof env.ctx[nom] !== "function" || /_$/.test(nom)) throw new Error("fonction inconnue : " + nom);
      return JSON.stringify({ val: J(env.ctx[nom].apply(null, JSON.parse(args))) });
    } catch (e) {
      return JSON.stringify({ err: e.message });
    }
  });
  await page.setContent(contenu.replace("<head>", "<head><script>" + RUNNER + "</script>"), {
    waitUntil: "load",
  });
  return page;
}
async function lireQr(page) {
  const img = await page.$eval("#qr", (c) => {
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height);
    return { l: c.width, h: c.height, px: Array.from(d.data) };
  });
  // agrandi ×8 (un point du QR = 8 pixels), comme le verrait un appareil photo
  const k = 8;
  const L = img.l * k;
  const H = img.h * k;
  const px = new Uint8ClampedArray(L * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < L; x++) {
      const s = (Math.floor(y / k) * img.l + Math.floor(x / k)) * 4;
      px.set(img.px.slice(s, s + 4), (y * L + x) * 4);
    }
  const r = jsQR(px, L, H);
  return r && r.data;
}

(async () => {
  const browser = await chromium.launch();
  const erreurs = [];
  const vis = (p, s) => p.isVisible(s);
  try {
    // ---------------- Parcours complet (copie neuve) ----------------
    const env = nouvelleCopie();
    const page = await fenetre(browser, env, "ouvrirAssistant", erreurs);
    // 1. Préparation
    await page.waitForSelector("#prepResultat:not([hidden])");
    assert.ok(!(await vis(page, "#prepAttente")));
    assert.match(await page.textContent("#prepVersion"), /^[\d.-]+$/);
    assert.match(await page.$eval("#prepRapport", (e) => e.textContent), /Nouvelle copie détectée/);
    assert.deepStrictEqual(await page.$$eval("#etapes li", (l) => l.map((x) => x.className)), [
      "encours",
      "",
      "",
      "",
    ]);
    if (captures) await page.screenshot({ path: captures + "/assistant-1.png" });
    await page.click("#btnSuite0");
    // 2. Votre magasin : vide au départ, obligatoire
    await page.waitForSelector("[data-ecran='1']:not([hidden])");
    assert.strictEqual(await page.inputValue("#nomMagasin"), "");
    await page.click("#btnMagasin");
    assert.strictEqual(await page.textContent("#msgMagasin"), "Écrivez le nom du magasin.");
    await page.fill("#nomMagasin", "l'Hypermarché Test");
    await page.press("#nomMagasin", "Enter");
    // 3. Mise en ligne : pas encore déployée
    await page.waitForSelector("[data-ecran='2']:not([hidden])");
    assert.strictEqual(env.ctx.getConfig().NOM_STRUCTURE, "l'Hypermarché Test");
    await page.waitForFunction(() => document.getElementById("lienDeploiement").href.includes("ID-SCRIPT"));
    assert.strictEqual(
      await page.getAttribute("#lienDeploiement", "href"),
      "https://script.google.com/d/ID-SCRIPT/edit"
    );
    assert.strictEqual(await page.getAttribute("#lienDeploiement", "target"), "_blank");
    assert.ok(await vis(page, "#enLigneAttente"));
    assert.ok(await page.isDisabled("#btnSuite2"));
    if (captures) await page.screenshot({ path: captures + "/assistant-3.png", fullPage: true });
    // Retour puis revenir : le nom est gardé
    await page.click("[data-ecran='2'] [data-retour='1']");
    assert.strictEqual(await page.inputValue("#nomMagasin"), "l'Hypermarché Test");
    await page.click("#btnMagasin");
    await page.waitForSelector("[data-ecran='2']:not([hidden])");
    // adresse collée fausse : refusée
    await page.click("#enLigneColler summary");
    await page.fill("#adresseCollee", "https://example.com/exec");
    await page.click("#btnAdresse");
    await page.waitForFunction(() => document.getElementById("msgAdresse").textContent !== "");
    assert.match(await page.textContent("#msgAdresse"), /finit par \/exec/);
    // le manager déploie : l'assistant le voit seul (interrogation toutes les 4 s)
    env.urlService = ADRESSE;
    await page.waitForSelector("#enLigneOk:not([hidden])", { timeout: 6000 });
    assert.strictEqual(await page.textContent("#enLigneAdresse"), ADRESSE);
    assert.ok(!(await vis(page, "#enLigneGuide")) && !(await vis(page, "#lienDeploiement")));
    await page.click("#btnSuite2");
    // 4. Tablettes : QR code lisible = adresse ; lien ; code d'activation à taper
    await page.waitForSelector("#tabZone:not([hidden])");
    assert.strictEqual(await lireQr(page), ADRESSE, "le QR code donne l'adresse de l'application");
    assert.strictEqual(await page.textContent("#tabLien"), ADRESSE);
    const code = await page.textContent("#tabCodeValeur");
    assert.match(code, /^\d{4}-\d{4}$/);
    assert.ok(await vis(page, "#tabAttente"));
    assert.ok(!(await vis(page, "#tabDejaCompte")));
    await page.click("#btnCopier"); // presse-papiers refusé ici : le lien est sélectionné
    if (captures) await page.screenshot({ path: captures + "/assistant-4.png", fullPage: true });
    // la caisse centrale tape le code sur la tablette : l'assistant le voit
    assert.ok(J(env.ctx.premierCompte(code, "Caisse centrale", "motdepasse-test")).ok);
    await page.waitForSelector("#tabOk:not([hidden])", { timeout: 7000 });
    assert.ok(!(await vis(page, "#tabCode")) && !(await vis(page, "#tabAttente")));
    // Fin
    await page.click("#btnSuite3");
    await page.waitForSelector("[data-ecran='4']:not([hidden])");
    await page.click("#btnFin");
    await page.waitForFunction(() => window.__ferme === true);
    assert.ok(!env.sheets["Démarrer"] && !env.sheets["Feuille 1"], "onglets retirés");
    await page.close();

    // ---------------- Menu « 📱 Connecter une tablette » (compte déjà créé) ----------------
    const p2 = await fenetre(browser, env, "ouvrirTablettes", erreurs);
    await p2.waitForSelector("#tabZone:not([hidden])");
    assert.ok(!(await vis(p2, "#etapes")), "pas d'étapes");
    assert.ok(!(await vis(p2, "#btnRetour3")));
    assert.strictEqual((await p2.textContent("#btnSuite3")).trim(), "Fermer");
    assert.ok(await vis(p2, "#tabDejaCompte"));
    assert.ok(!(await vis(p2, "#tabCode")) && !(await vis(p2, "#tabAttente")));
    assert.strictEqual(await lireQr(p2), ADRESSE);
    await p2.click("#btnSuite3");
    await p2.waitForFunction(() => window.__ferme === true);
    await p2.close();

    // ---------------- Pas encore en ligne / préparation refusée ----------------
    const env3 = nouvelleCopie();
    const p3 = await fenetre(browser, env3, "ouvrirTablettes", erreurs);
    await p3.waitForSelector("#tabSansAdresse:not([hidden])");
    assert.ok(!(await vis(p3, "#tabZone")));
    await p3.close();
    const p4 = await fenetre(browser, env3, "ouvrirAssistant", erreurs);
    env3.activeEmail = ""; // accès retiré entre-temps
    await p4.evaluate(() => aller(0));
    await p4.waitForSelector("#prepErreur:not([hidden])");
    assert.match(await p4.textContent("#prepErreur"), /Réservé aux personnes ayant accès/);
    assert.ok(await p4.isDisabled("#btnSuite0"));
    await p4.close();

    assert.deepStrictEqual(erreurs, []);
    console.log("test_ui_assistant : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
