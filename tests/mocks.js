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
    dialogues: [], // fenêtres (showModalDialog) : { titre, contenu }
    // Autorisations Google accordées (null : toutes) ; demandes d'écran Google (requireScopes)
    autorisations: null,
    demandesAutorisation: [],
    urlService: null, // adresse du déploiement « Application Web » (null : pas en ligne)
  };
  const accordee = (s) => env.autorisations === null || env.autorisations.indexOf(s) !== -1;
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
      AuthMode: { FULL: "FULL" },
      AuthorizationStatus: { REQUIRED: "REQUIRED", NOT_REQUIRED: "NOT_REQUIRED" },
      getAuthorizationInfo: (mode, scopes) => ({
        getAuthorizationStatus: () => (scopes.every(accordee) ? "NOT_REQUIRED" : "REQUIRED"),
        getAuthorizedScopes: () => scopes.filter(accordee),
      }),
      // Le vrai affiche l'écran de Google et arrête l'exécution
      requireScopes: (mode, scopes) => {
        env.demandesAutorisation.push(scopes);
        throw new Error("ÉCRAN DE GOOGLE (exécution arrêtée)");
      },
      getService: () => ({ getUrl: () => env.urlService }),
      getScriptId: () => "ID-SCRIPT",
      getProjectTriggers: () =>
        env.triggers.map((h) => ({ getHandlerFunction: () => h, getUniqueId: () => "uid-" + h })),
      deleteTrigger: (t) => {
        env.triggers.splice(env.triggers.indexOf(t.getHandlerFunction()), 1);
      },
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
      getActiveUser: () => ({
        getEmail: () => {
          if (!accordee("https://www.googleapis.com/auth/userinfo.email"))
            throw new Error("Vous n'êtes pas autorisé à appeler Session.getActiveUser.");
          return env.activeEmail;
        },
      }),
      getScriptTimeZone: () => "Europe/Paris",
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      ProtectionType: { SHEET: "SHEET", RANGE: "RANGE" },
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
          return env.reponseUi || "OK";
        },
        ButtonSet: { OK: "OK", YES_NO: "YES_NO" },
        Button: { OK: "OK", YES: "YES", NO: "NO" },
        showSidebar: () => {
          env.sidebars++;
        },
        showModalDialog: (html, titre) => {
          env.dialogues.push({ titre, contenu: html.getContent() });
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
      // Modèle (Assistant.html) : <?= ?> et <?!= include_() ?> rendus comme par Apps Script
      createTemplateFromFile: (nom) => {
        const fs = require("fs");
        const modele = {
          evaluate() {
            const vars = Object.assign({ include_: (n) => env.ctx.include_(n) }, modele);
            const contenu = require("./harness").renderTemplate(
              fs.readFileSync(require("path").join(opts.repo, nom + ".html"), "utf8"),
              vars
            );
            return {
              getContent: () => contenu,
              setWidth() {
                return this;
              },
              setHeight() {
                return this;
              },
              setTitle() {
                return this;
              },
              addMetaTag() {
                return this;
              },
            };
          },
        };
        return modele;
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
      base64Decode: (s) => [...Buffer.from(s, "base64")].map((b) => (b > 127 ? b - 256 : b)),
      newBlob: (octets, type, nom) => ({ octets, type, nom }),
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
