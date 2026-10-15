// Faux services Apps Script communs aux tests
const crypto = require("crypto");
const { loadCode, makeProps } = require("./harness");
function makeEnv(opts = {}) {
  const props = makeProps(opts.props);
  const cacheStore = {};
  const now = Date.now();
  const env = {
    props,
    cacheStore,
    activeEmail: opts.activeEmail || "",
    owner: "proprio@example.com",
    editors: ["editeur@example.com"],
    sheets: opts.sheets || {},
    triggers: opts.triggers || [],
    idClasseur: opts.idClasseur || "ID-CLASSEUR",
    toasts: [],
    alertes: [],
    menus: [],
    sidebars: 0,
  };
  const ss = require("./fakesheet").makeSpreadsheet(env);
  env.ctx = loadCode(opts.repo, {
    PropertiesService: { getDocumentProperties: () => props },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (cacheStore[k] && cacheStore[k].exp > Date.now() ? cacheStore[k].v : null),
        put: (k, v, ttl) => {
          cacheStore[k] = { v, exp: Date.now() + ttl * 1000 };
        },
        remove: (k) => {
          delete cacheStore[k];
        },
      }),
    },
    LockService: {
      getScriptLock: () => ({
        waitLock() {},
        tryLock() {
          return true;
        },
        releaseLock() {},
      }),
    },
    ScriptApp: {
      getProjectTriggers: () =>
        env.triggers.map((h) => ({ getHandlerFunction: () => h, getUniqueId: () => "uid-" + h })),
      newTrigger: (h) => {
        const b = {
          timeBased: () => b,
          everyDays: () => b,
          atHour: () => b,
          create: () => {
            env.triggers.push(h);
          },
        };
        return b;
      },
    },
    Logger: { log() {} },
    Session: {
      getActiveUser: () => ({ getEmail: () => env.activeEmail }),
      getScriptTimeZone: () => "Europe/Paris",
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      flush() {},
      getUi: () => ({
        createMenu: (t) => {
          const m = {
            addItem: (l, f) => {
              env.menus.push(f);
              return m;
            },
            addToUi: () => m,
          };
          return m;
        },
        alert: (titre, msg) => {
          env.alertes.push(titre + " | " + msg);
        },
        ButtonSet: { OK: "OK" },
        showSidebar: () => {
          env.sidebars++;
        },
      }),
    },
    // Fichiers .html du dépôt, comme dans le projet Apps Script (fichier absent -> erreur)
    HtmlService: {
      createHtmlOutputFromFile: (nom) => {
        const chemin = require("path").join(opts.repo, nom + ".html");
        if (!require("fs").existsSync(chemin))
          throw new Error("Aucun fichier HTML nommé " + nom + " n'a été trouvé.");
        const contenu = require("fs").readFileSync(chemin, "utf8");
        return {
          getContent: () => contenu,
          setTitle() {
            return this;
          },
          setWidth() {
            return this;
          },
        };
      },
      createHtmlOutput: (html) => ({
        contenu: html,
        titre: "",
        setTitle(t) {
          this.titre = t;
          return this;
        },
        addMetaTag() {
          return this;
        },
      }),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      computeDigest: (alg, s) =>
        [...crypto.createHash("sha256").update(s, "utf8").digest()].map((b) => (b > 127 ? b - 256 : b)),
      base64Encode: (arr) => Buffer.from(arr.map((b) => b & 255)).toString("base64"),
      computeHmacSha256Signature: (valeur, cle) =>
        [...crypto.createHmac("sha256", cle).update(valeur, "utf8").digest()].map((b) =>
          b > 127 ? b - 256 : b
        ),
      getUuid: () => crypto.randomUUID(),
      formatDate: opts.formatDate || require("./fmt").fmt,
    },
  });
  // Par défaut, le contrôle de la session est neutralisé (sessionReelle : vrai contrôle)
  if (!opts.sessionReelle) env.ctx.exigerSession_ = function () {};
  // Code d'activation (normalement affiché dans le Google Sheets)
  env.activation = () => env.ctx.genererCodeActivation_();
  // Compte « Caisse test » (créé au besoin, comme à la 1re installation) : sa session
  env.session = null;
  env.connecter = () => {
    if (env.session && env.ctx.compteDeSession_(env.session)) return env.session;
    const r =
      env.ctx.lireComptes_().length === 0
        ? env.ctx.premierCompte(env.activation(), "Caisse test", "motdepasse-test")
        : env.ctx.connexion("Caisse test", "motdepasse-test");
    if (!r.ok) throw new Error("Compte de test : " + r.message);
    env.session = r.session;
    return env.session;
  };
  // Crée le code responsable (par le compte connecté). Le jeton est lié à ce compte : il
  // est renvoyé avec sa session, { j, c }, comme la page l'envoie (j seul : pour la page).
  env.creerCode = (pin) => {
    const r = env.ctx.definirPin(pin, null, env.connecter());
    return r.ok ? Object.assign({}, r, { jeton: { j: r.jeton, c: env.session } }) : r;
  };
  return env;
}
module.exports = { makeEnv };
