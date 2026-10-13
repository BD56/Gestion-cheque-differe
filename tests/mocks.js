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
    HtmlService: {
      createHtmlOutputFromFile: () => ({
        setTitle() {
          return this;
        },
        setWidth() {
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
      getUuid: () => crypto.randomUUID(),
      formatDate: opts.formatDate || require("./fmt").fmt,
    },
  });
  if (!opts.tabletteReelle) env.ctx.exigerTablette_ = function () {};
  // Code d'activation (normalement affiché dans le Google Sheets)
  env.activation = () => env.ctx.genererCodeActivation_();
  // Crée le code responsable comme à la 1re installation et renvoie la réponse
  env.creerCode = (pin) => env.ctx.definirPin(pin, null, null, env.activation());
  return env;
}
module.exports = { makeEnv };
