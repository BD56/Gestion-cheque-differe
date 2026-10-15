// Outils communs : charge Index.html rendu dans Chromium, google.script.run -> faux serveur Node
const { chromium } = require("playwright");
const fs = require("fs");
const { rendrePage } = require("./harness");
const { makeEnv } = require("./mocks");
const { FakeSheet } = require("./fakesheet");
const J = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x)));

const PROXY = `
(function () {
  var store = window.__SANS_CLE ? {} : { cdSession: 'S1.session-de-test', cdCompte: 'Caisse test' };
  var faux = { getItem: function (k) { return (k in store) ? store[k] : null; }, setItem: function (k, v) { store[k] = String(v); }, removeItem: function (k) { delete store[k]; } };
  try { Object.defineProperty(window, 'localStorage', { value: faux, configurable: true }); } catch (e) {}
  window.__store = store;
})();
(function () {
  function runner(ok, ko) {
    return new Proxy({}, { get: function (_, nom) {
      if (nom === 'withSuccessHandler') return function (h) { return runner(h, ko); };
      if (nom === 'withFailureHandler') return function (h) { return runner(ok, h); };
      return function () {
        var args = Array.prototype.slice.call(arguments);
        window.__appels = window.__appels || []; window.__appels.push(nom);
        window.__serveur(nom, JSON.stringify(args)).then(function (r) {
          var o = JSON.parse(r);
          if (o.err) { if (ko) ko(new Error(o.err)); } else if (ok) ok(o.val);
        });
      };
    }});
  }
  window.google = { script: { run: runner(null, null) } };
  window.print = function () { window.__imprime = document.getElementById('zoneImpression').innerHTML; };
  window.__alertes = []; window.alert = function (m) { window.__alertes.push(String(m)); };
  window.confirm = function () { return window.__confirmer !== false; };
})();`;

async function ouvrir(repo, envOpts) {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const debut = new Date(today.getTime() - 86400000),
    fin = new Date(today.getTime() + 86400000);
  const env = makeEnv(
    Object.assign({ repo, props: { DATE_DEBUT: iso(debut), DATE_FIN: iso(fin) } }, envOpts || {})
  );
  if (!env.sheets.Saisies) {
    env.sheets.Saisies = new FakeSheet("Saisies", [
      ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos", ""],
    ]);
    env.sheets.Saisies.getRange("Z1").setValue("SIGNALER");
  }
  const html = rendrePage(repo, {
    cfg: env.ctx.getConfig(),
    dates: env.ctx.lireDates_(),
    urlAppli: (envOpts && envOpts.urlAppli) || "",
  }).replace(
    "<head>",
    // comme doGet (addMetaTag) : largeur de l'appareil sur tablette / téléphone
    '<head><meta name="viewport" content="width=device-width, initial-scale=1"><script>window.__SANS_CLE=' +
      !!(envOpts && envOpts.sansCle) +
      ";" +
      PROXY +
      "</script>"
  );
  const browser = await chromium.launch();
  const page = await browser.newPage((envOpts && envOpts.page) || {}); // ex. { isMobile, hasTouch, viewport }
  const erreursPage = [];
  page.on("pageerror", (e) => erreursPage.push(e.message));
  await page.exposeFunction("__serveur", (nom, argsJson) => {
    try {
      if (typeof env.ctx[nom] !== "function" || /_$/.test(nom))
        throw new Error("fonction inconnue/privée : " + nom);
      return JSON.stringify({ val: J(env.ctx[nom].apply(null, JSON.parse(argsJson))) });
    } catch (e) {
      return JSON.stringify({ err: e.message });
    }
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(200);
  return { env, page, browser, erreursPage };
}
module.exports = { ouvrir, J };
