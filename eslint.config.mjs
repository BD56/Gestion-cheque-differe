// Contrôle du code (ESLint) : `npm run lint`. Outil de développement, jamais envoyé à Apps Script.
import fs from "node:fs";
import js from "@eslint/js";
import globals from "globals";
import html from "eslint-plugin-html";

// Services Google Apps Script disponibles côté serveur.
const appsScript = Object.fromEntries(
  [
    "CacheService",
    "ContentService",
    "DriveApp",
    "HtmlService",
    "LockService",
    "Logger",
    "MailApp",
    "PropertiesService",
    "ScriptApp",
    "Session",
    "SpreadsheetApp",
    "Utilities",
  ].map((n) => [n, "readonly"]),
);

// Tous les fichiers .gs partagent la même portée globale : une fonction déclarée dans
// un fichier est visible des autres. Pour chaque .gs, on fournit donc à ESLint les noms
// déclarés au premier niveau des AUTRES .gs : `no-undef` signale toujours les fautes de
// frappe, et `no-redeclare` signale un nom déclaré dans deux fichiers (sans ce contrôle,
// Apps Script ne dit rien et c'est la dernière déclaration lue qui l'emporte).
const fichiersGs = fs
  .readdirSync(".")
  .filter((f) => f.endsWith(".gs"))
  .sort();
const declares = Object.fromEntries(
  fichiersGs.map((f) => [
    f,
    [...fs.readFileSync(f, "utf8").matchAll(/^(?:function\s+|(?:var|let|const)\s+)([A-Za-z_$][\w$]*)/gm)].map(
      (m) => m[1],
    ),
  ]),
);
const globalesDesAutres = (f) =>
  Object.fromEntries(
    fichiersGs.filter((g) => g !== f).flatMap((g) => declares[g].map((n) => [n, "readonly"])),
  );

const regles = {
  ...js.configs.recommended.rules,
  // Les fonctions du premier niveau sont des points d'entrée (menu, robots, google.script.run).
  "no-unused-vars": ["warn", { vars: "local", args: "none", caughtErrors: "none" }],
  "no-empty": ["error", { allowEmptyCatch: true }],
  // Style voulu : `var x = {}; try { x = JSON.parse(…) } catch (e) { x = {} }` (valeur sûre d'abord).
  "no-useless-assignment": "off",
  "no-useless-escape": "warn",
};

export default [
  { ignores: ["node_modules/**", "prototype-ocr/**", "tests/rendu_defaut.html"] },
  ...fichiersGs.map((f) => ({
    files: [f],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: { ...appsScript, ...globalesDesAutres(f) },
    },
    rules: regles,
  })),
  {
    // Pages : scripts du navigateur (google.script.run). Index.html contient des
    // injections de modèle (<?!= … ?>) dans ses scripts : contrôlée après son découpage.
    files: ["**/*.html"],
    ignores: ["Index.html"],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "script",
      globals: { ...globals.browser, google: "readonly" },
    },
    rules: regles,
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.browser },
    },
    // Le code passé à page.evaluate() tourne dans la page : ses variables y sont définies.
    rules: { ...regles, "no-unused-vars": "off", "no-undef": "off", "no-regex-spaces": "off" },
  },
];
