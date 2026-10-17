// Journal des actions sensibles : onglet masqué « _Journal » du Google Sheets, pour la
// direction (contrôle : qui a supprimé, corrigé, forcé, changé un réglage…). Une ligne
// par action : date et heure (à la seconde), qui (compte, panneau du Sheet ou robot),
// action, détail, empreinte. Jamais de mot de passe, de code ni de session.
// L'application l'écrit seulement : rien pour le modifier ou l'effacer, et une
// modification à la main est signalée (empreintes chaînées, vérifiées chaque nuit).
// Lignes de plus de JOURNAL_RETENTION_MOIS mois effacées chaque nuit (robot de nuit).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Journal_() {
  return "2026.10.17-1359";
}

function feuilleJournal_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let f = ss.getSheetByName(JOURNAL_FEUILLE);
  if (!f) {
    f = ss.insertSheet(JOURNAL_FEUILLE);
    f.appendRow(JOURNAL_ENTETES);
    f.getRange(1, 1, 1, JOURNAL_ENTETES.length).setFontWeight("bold");
    f.getRange("A2:A").setNumberFormat("dd/MM/yyyy HH:mm:ss");
    f.setFrozenRows(1);
    f.hideSheet();
  } else if (f.getRange(1, 5).getValue() === "") {
    // journal d'avant les empreintes (version de test du 16/10) : scellé tel quel
    f.getRange(1, 5).setValue(JOURNAL_ENTETES[4]).setFontWeight("bold");
    rescellerJournal_(f);
  }
  return f;
}

// N'empêche JAMAIS l'action journalisée : une panne du journal est seulement notée.
// sensible : changement de « qui peut faire quoi » (codes, personnes, comptes), montré à
// tous pendant CHANGEMENTS_DUREE_H heures (bandeau des changements récents).
function journaliser_(qui, action, detail, sensible) {
  const ligne = [qui || "?", action, detail === undefined || detail === null ? "" : detail].map(function (v) {
    return String(v).replace(/\r\n?/g, "\n");
  });
  const quand = new Date(Math.floor(Date.now() / 1000) * 1000); // à la seconde : relue telle quelle
  try {
    const f = feuilleJournal_();
    const props = PropertiesService.getDocumentProperties();
    const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const e = empreinteJournal_(
      cleJournal_(),
      props.getProperty("JOURNAL_DERNIERE") || "",
      heureJournal_(quand, tz),
      ligne
    );
    f.appendRow([quand].concat(ligne.map(texte_), [texte_(e)]));
    props.setProperty("JOURNAL_DERNIERE", e);
  } catch (e) {
    Logger.log("Journal : " + e);
  }
  if (sensible)
    try {
      noterChangement_(quand, ligne);
    } catch (e) {
      Logger.log("Changements récents : " + e);
    }
}

// =================================================================
// --- EMPREINTES : une modification à la main se voit ---
//     Chaque ligne porte l'empreinte (HMAC, clé secrète du document) de son contenu ET
//     de l'empreinte de la ligne précédente : modifier, ajouter ou effacer une ligne
//     casse la chaîne. La dernière empreinte est gardée à part (lignes effacées à la
//     fin) ; la purge des 12 mois note les empreintes des lignes effacées (ancres).
//     Limite : un éditeur du Sheet qui programme peut lire la clé et refaire les
//     empreintes ; l'historique des versions de Google garde alors son nom.
// =================================================================
function cleJournal_() {
  const props = PropertiesService.getDocumentProperties();
  let cle = props.getProperty("JOURNAL_CLE");
  if (!cle) {
    cle = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty("JOURNAL_CLE", cle);
  }
  return cle;
}
// Heure murale du fuseau du classeur : identique à l'écriture et à la relecture (même au
// changement d'heure ou si le fuseau du classeur change).
function heureJournal_(v, tz) {
  return v instanceof Date ? Utilities.formatDate(v, tz, "yyyy-MM-dd HH:mm:ss") : String(v);
}
function empreinteJournal_(cle, precedente, heure, ligne) {
  const corps = [precedente, heure, ligne[0], ligne[1], ligne[2]].join("\u001f");
  return Utilities.base64Encode(Utilities.computeHmacSha256Signature(corps, cle)).slice(0, 22);
}
function ancresJournal_(props) {
  try {
    const a = JSON.parse(props.getProperty("JOURNAL_ANCRES") || "[]");
    return a.length ? a : [""];
  } catch (e) {
    return [""];
  }
}
function lignesJournal_(f) {
  const n = f ? f.getLastRow() - 1 : 0;
  return n > 0 ? f.getRange(2, 1, n, 5).getValues() : [];
}

// Chaîne intacte : null. Sinon { ligne, heure } (1re ligne fausse), { fin } (dernières
// lignes effacées) ou { absent } (onglet supprimé).
function verifierJournal_() {
  const props = PropertiesService.getDocumentProperties();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const f = ss.getSheetByName(JOURNAL_FEUILLE);
  const derniere = props.getProperty("JOURNAL_DERNIERE") || "";
  if (!f) return derniere ? { absent: true } : null;
  const cle = props.getProperty("JOURNAL_CLE") || "";
  const tz = ss.getSpreadsheetTimeZone();
  const suite = ancresJournal_(props);
  const v = lignesJournal_(f);
  for (let i = 0; i < v.length; i++) {
    const heure = heureJournal_(v[i][0], tz);
    const ligne = [String(v[i][1]), String(v[i][2]), String(v[i][3])];
    let ok = false;
    for (let k = 1; k <= JOURNAL_TOLERANCE && k <= suite.length && !ok; k++)
      ok = empreinteJournal_(cle, suite[suite.length - k], heure, ligne) === String(v[i][4]);
    if (!ok) return { ligne: i + 2, heure: heure };
    suite.push(String(v[i][4]));
  }
  if (derniere && suite.slice(-JOURNAL_TOLERANCE).indexOf(derniere) === -1) return { fin: true };
  return null;
}

// Recalcule toutes les empreintes (journal d'avant les empreintes, nouvelle copie, ou
// alerte vue par la direction) : le contenu actuel devient la référence.
function rescellerJournal_(f) {
  const props = PropertiesService.getDocumentProperties();
  const cle = cleJournal_();
  const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const ancres = ancresJournal_(props);
  let prec = ancres[ancres.length - 1];
  const v = lignesJournal_(f);
  if (v.length)
    f.getRange(2, 5, v.length, 1).setValues(
      v.map(function (l) {
        prec = empreinteJournal_(cle, prec, heureJournal_(l[0], tz), [
          String(l[1]),
          String(l[2]),
          String(l[3]),
        ]);
        return [texte_(prec)];
      })
    );
  if (prec) props.setProperty("JOURNAL_DERNIERE", prec);
  else props.deleteProperty("JOURNAL_DERNIERE");
}

// Robot de nuit : une rupture est signalée UNE fois, puis reste affichée (espace
// responsable, panneau du Sheet) jusqu'à ce que la direction la marque comme vue.
function verifierJournalNuit_() {
  const props = PropertiesService.getDocumentProperties();
  if (props.getProperty("JOURNAL_ALERTE")) return;
  const r = verifierJournal_();
  if (!r) return;
  const alerte = {
    texte: texteRupture_(r),
    constatee: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"),
  };
  props.setProperty("JOURNAL_ALERTE", JSON.stringify(alerte));
  journaliser_("Robot de nuit", "Journal modifié à la main", alerte.texte);
}
function texteRupture_(r) {
  if (r.absent) return "onglet « " + JOURNAL_FEUILLE + " » supprimé";
  if (r.fin) return "dernières lignes effacées";
  const m = /^(\d{4})-(\d\d)-(\d\d) (\d\d:\d\d)/.exec(r.heure || "");
  return (
    "à partir de la ligne " +
    r.ligne +
    (m ? " (action du " + m[3] + "/" + m[2] + "/" + m[1] + " " + m[4] + ")" : "") +
    " : ligne modifiée, ajoutée, ou ligne précédente effacée"
  );
}
function lireAlerteJournal_() {
  try {
    return JSON.parse(PropertiesService.getDocumentProperties().getProperty("JOURNAL_ALERTE") || "null");
  } catch (e) {
    return null;
  }
}

// Panneau du Sheet (direction) : alerte vue après contrôle (historique des versions du
// Google Sheets). Le journal repart de son contenu actuel ; le geste est journalisé.
function prendreEnCompteAlerteJournal() {
  exigerEditeur_();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const a = lireAlerteJournal_();
    if (!a) return "Aucune alerte du journal.";
    rescellerJournal_(feuilleJournal_());
    PropertiesService.getDocumentProperties().deleteProperty("JOURNAL_ALERTE");
    journaliser_(
      quiPanneau_(),
      "Alerte du journal vue (empreintes recalculées)",
      a.texte + " · constatée le " + a.constatee
    );
    return (
      "✅ Alerte notée comme vue. Le journal repart de son contenu actuel : une nouvelle " +
      "modification à la main sera de nouveau signalée."
    );
  } finally {
    lock.releaseLock();
  }
}

// =================================================================
// --- CHANGEMENTS RÉCENTS (bandeau, CHANGEMENTS_DUREE_H heures) ---
//     Gardés à part du journal : effacer la ligne du journal ne les efface pas.
// =================================================================
function changementsBruts_(props) {
  let l;
  try {
    l = JSON.parse(props.getProperty("CHANGEMENTS_RECENTS") || "[]");
  } catch (e) {
    l = [];
  }
  const limite = Date.now() - CHANGEMENTS_DUREE_H * 3600000;
  return l.filter(function (c) {
    return c.t > limite;
  });
}
function noterChangement_(quand, ligne) {
  const props = PropertiesService.getDocumentProperties();
  const l = changementsBruts_(props);
  l.push({ t: quand.getTime(), qui: ligne[0], action: ligne[1], detail: ligne[2] });
  props.setProperty("CHANGEMENTS_RECENTS", JSON.stringify(l.slice(-20)));
}
// Les plus récents d'abord : { lignes: [texte…], autres: nombre non affiché }
function changementsRecents_() {
  const l = changementsBruts_(PropertiesService.getDocumentProperties()).reverse();
  return {
    lignes: l.slice(0, CHANGEMENTS_AFFICHES).map(function (c) {
      const quand = Utilities.formatDate(new Date(c.t), fuseau_(), "dd/MM HH:mm").split(" ");
      return (
        c.action +
        (c.detail ? " : " + c.detail : "") +
        " — le " +
        quand[0] +
        " à " +
        quand[1].replace(":", " h ") +
        " par " +
        c.qui
      );
    }),
    autres: Math.max(0, l.length - CHANGEMENTS_AFFICHES),
  };
}

// Panneau du Sheet : alerte du journal et changements récents
function getSurveillancePanneau() {
  exigerEditeur_();
  return { alerteJournal: lireAlerteJournal_(), changements: changementsRecents_() };
}

// --- Qui ? ---
function quiPanneau_() {
  let email = "";
  try {
    email = Session.getActiveUser().getEmail();
  } catch (e) {
    email = "";
  }
  return "Panneau du Sheet" + (email ? " (" + email + ")" : "");
}
// Appel de la page avec sa session (saisie, ajout forcé)
function quiSession_(cle) {
  const c = compteDeSession_(cle);
  return c ? c.identifiant : quiPanneau_();
}
// Appel de l'espace responsable (jeton { j, c }) ou du panneau du Sheet (sans jeton).
// Codes personnels : « compte · personne » (la personne qui a tapé SON code).
function quiJeton_(jeton) {
  const a = appelantDeCle_(cleAppelant_(undefined, jeton));
  const p = personneDuJeton_(jeton);
  return (a ? a.nom : quiPanneau_()) + (p ? " · " + p.nom : "");
}

// --- Mise en forme du détail ---
function jourLisible_(iso) {
  return iso ? iso.split("-").reverse().join("/") : "—";
}
// Ligne de « Saisies » telle qu'affichée : NOM Prénom · pièce · montant · saisie le …
function ligneLisible_(v) {
  return [
    v[IDX.NOM] + " " + v[IDX.PRENOM],
    "pièce " + v[IDX.PIECE],
    v[IDX.MONTANT] || "sans montant",
    "saisie le " + v[IDX.DATE],
  ].join(" · ");
}

// Lignes de plus de JOURNAL_RETENTION_MOIS mois : effacées (robot de nuit). Les lignes
// sont ajoutées dans l'ordre : les plus anciennes sont en haut.
function purgerJournal_() {
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(JOURNAL_FEUILLE);
  if (!f || f.getLastRow() < 2) return 0;
  const limite = new Date();
  limite.setMonth(limite.getMonth() - JOURNAL_RETENTION_MOIS);
  const dates = f.getRange(2, 1, f.getLastRow() - 1, 1).getValues();
  let n = 0;
  while (n < dates.length && dates[n][0] instanceof Date && dates[n][0] < limite) n++;
  if (n > 0) {
    // empreintes des lignes effacées : la ligne suivante s'y enchaîne (ancres)
    const props = PropertiesService.getDocumentProperties();
    const effacees = f
      .getRange(2, 5, n, 1)
      .getValues()
      .map(function (l) {
        return String(l[0]);
      });
    props.setProperty(
      "JOURNAL_ANCRES",
      JSON.stringify(ancresJournal_(props).concat(effacees).slice(-JOURNAL_TOLERANCE))
    );
    f.deleteRows(2, n);
  }
  return n;
}
