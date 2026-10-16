// Bandeau « Changements récents des accès » et alerte « journal modifié à la main » :
// espace responsable (vue d'ensemble, alerte en tête) et panneau du Google Sheets
// (alerte marquée comme vue par la direction, second appui).
// Usage : node tests/test_ui_surveillance.js <dépôt> [dossier des captures]
const assert = require("assert");
const fs = require("fs");
const { ouvrir, J } = require("./navigateur");
(async () => {
  const captures = process.argv[3];
  const { env, page, browser, erreursPage } = await ouvrir(process.argv[2]);
  const c = env.ctx,
    P = env.props._store;
  const vis = (s) => page.isVisible(s),
    attendre = (p, ms) => p.waitForTimeout(ms || 300);
  try {
    // --- Espace responsable : le 1er compte (créé à l'ouverture) figure au bandeau ---
    await page.click('button[title="Panneau de contrôle"]');
    await attendre(page);
    assert.ok(await vis("#changementsRecents"));
    let li = await page.$$eval("#listeChangements li", (l) => l.map((x) => x.textContent));
    assert.strictEqual(li.length, 1);
    assert.match(
      li[0],
      /^Premier compte créé \(code d'activation\) : Caisse test — le \d\d\/\d\d à \d\d h \d\d par Caisse test$/
    );
    assert.match(await page.textContent("#noteChangements"), /pendant 2 jours/);
    assert.ok(!(await vis("#alerteAdmin")), "pas d'alerte : journal intact");

    // Changements faits ailleurs (autre poste) : le plus récent en premier
    const ja = { j: J(c.ouvrirSessionAdmin("", env.session)).jeton, c: env.session };
    c.creerCompte("Caisse 2", "motdepasse2", ja);
    c.basculerModeWebApp(ja); // pas un changement d'accès
    // Journal retouché à la main, vu par le robot de nuit
    env.sheets._Journal.cells[1][3] = "Caisse 9";
    env.activeEmail = env.owner;
    c.verificationClotureNocturne();
    env.activeEmail = "";
    await page.evaluate(() => ouvrirEnsemble());
    await attendre(page);
    li = await page.$$eval("#listeChangements li", (l) => l.map((x) => x.textContent));
    assert.strictEqual(li.length, 2);
    assert.match(li[0], /^Compte créé : Caisse 2 — /);
    assert.ok(await vis("#alerteAdmin"));
    assert.match(
      await page.textContent("#alerteAdmin"),
      /Journal des actions modifié à la main dans le Google Sheets \(à partir de la ligne 2 .*constaté le .*marquer comme vu dans le panneau du Sheet/
    );
    if (captures) await page.screenshot({ path: captures + "/espace-responsable.png", fullPage: true });
    // l'alerte reste en tête des autres écrans de l'espace
    await page.click('[data-ecran-lien="reglages"]');
    assert.ok(await vis("#alerteAdmin"));
    assert.ok(!(await vis("#changementsRecents")), "bandeau : vue d'ensemble seulement");

    // --- Panneau du Google Sheets (éditeur du classeur) ---
    env.activeEmail = "editeur@example.com";
    const panneau = await browser.newPage({ viewport: { width: 300, height: 900 } });
    panneau.on("pageerror", (e) => erreursPage.push("panneau : " + e.message));
    await panneau.exposeFunction("__serveur", (nom, argsJson) => {
      try {
        if (typeof c[nom] !== "function" || /_$/.test(nom)) throw new Error("fonction inconnue : " + nom);
        return JSON.stringify({ val: J(c[nom].apply(null, JSON.parse(argsJson))) });
      } catch (e) {
        return JSON.stringify({ err: e.message });
      }
    });
    const runner = `
      function runner(ok, ko) {
        return new Proxy({}, { get: function (_, nom) {
          if (nom === 'withSuccessHandler') return function (h) { return runner(h, ko); };
          if (nom === 'withFailureHandler') return function (h) { return runner(ok, h); };
          return function () {
            window.__serveur(nom, JSON.stringify([].slice.call(arguments))).then(function (r) {
              var o = JSON.parse(r);
              if (o.err) { if (ko) ko(new Error(o.err)); } else if (ok) ok(o.val);
            });
          };
        }});
      }
      window.google = { script: { run: runner(null, null) } };`;
    const html = fs
      .readFileSync(process.argv[2] + "/Panneau.html", "utf8")
      .replace("<head>", "<head><script>" + runner + "</script>");
    await panneau.setContent(html, { waitUntil: "load" });
    await attendre(panneau, 400);
    assert.ok(await panneau.isVisible("#boiteAlerteJournal"));
    assert.match(
      await panneau.textContent("#txtAlerteJournal"),
      /^Constaté par le robot de nuit le .* : à partir de la ligne 2/
    );
    assert.ok(await panneau.isVisible("#boiteChangements"));
    assert.strictEqual(await panneau.$$eval("#listeChangementsPanneau li", (l) => l.length), 2);
    if (captures) await panneau.screenshot({ path: captures + "/panneau-sheet.png", fullPage: true });
    // marquer comme vue : second appui
    await panneau.click("#btnAlerteJournal");
    assert.strictEqual((await panneau.textContent("#btnAlerteJournal")).trim(), "Confirmer : alerte vue");
    assert.ok(P.JOURNAL_ALERTE, "rien au premier appui");
    await panneau.click("#btnAlerteJournal");
    await attendre(panneau, 400);
    assert.ok(!P.JOURNAL_ALERTE);
    assert.match(await panneau.textContent("#msgPanneau"), /Alerte notée comme vue/);
    assert.ok(!(await panneau.isVisible("#boiteAlerteJournal")));
    assert.strictEqual(c.verifierJournal_(), null, "journal rescellé");
    // un geste du panneau sur les accès apparaît aussitôt au bandeau
    await panneau.click("#btnReinitPin");
    await panneau.click("#btnReinitPin");
    await attendre(panneau, 400);
    const lp = await panneau.$$eval("#listeChangementsPanneau li", (l) => l.map((x) => x.textContent));
    assert.match(
      lp[0],
      /^Code responsable réinitialisé — le .* par Panneau du Sheet \(editeur@example\.com\)$/
    );
    env.activeEmail = "";
    // l'espace responsable n'affiche plus l'alerte
    await page.evaluate(() => ouvrirEnsemble());
    await attendre(page);
    assert.ok(!(await vis("#alerteAdmin")));
    assert.deepStrictEqual(erreursPage, []);
    console.log("test_ui_surveillance : OK");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
