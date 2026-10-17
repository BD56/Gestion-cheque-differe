// Archives : clôture d'une offre, liste et consultation, purge après 3 ans.

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Archives_() {
  return "2026.10.18-0103";
}

// =================================================================
// --- ARCHIVES (espace responsable) : offres clôturées « Archives_* » ---
// =================================================================
// "Archives_26-09-2026_23-05" -> clé de tri "202609262305" + libellé lisible
function infosNomArchive_(nom) {
  const m = /^Archives_(\d{2})-(\d{2})-(\d{4})_(\d{2})-(\d{2})/.exec(nom);
  if (!m) return { tri: "", libelle: nom };
  return {
    tri: m[3] + m[2] + m[1] + m[4] + m[5],
    libelle: "Clôturée le " + m[1] + "/" + m[2] + "/" + m[3] + " à " + m[4] + "h" + m[5],
  };
}

// Résumé d'une offre archivée, montré dans la liste (aucune donnée personnelle) : dates
// de l'offre (à défaut : 1re et dernière saisie), nombre de saisies, montant total
// (illisible = 0). Calculé une seule fois et gardé dans les propriétés du document.
function cleResumeArchive_(nom) {
  return "RESUME_" + nom;
}
function calculerResumeArchive_(feuille, dates) {
  const r = { debut: "", fin: "", saisies: 0, total: 0 };
  let premier = "",
    dernier = "";
  const derniere = feuille.getLastRow();
  if (derniere >= 2) {
    feuille
      .getRange(2, 1, derniere - 1, NB_COLONNES)
      .getValues()
      .forEach(function (v) {
        if (v.join("") === "") return;
        r.saisies++;
        r.total += nombreMontant_(v[IDX.MONTANT]);
        const j = jourDeSaisie_(v[IDX.DATE]);
        if (j && (!premier || j < premier)) premier = j;
        if (j > dernier) dernier = j;
      });
  }
  r.total = Math.round(r.total * 100) / 100;
  const avecDates = dates && dates.debut && dates.fin;
  r.debut = avecDates ? dates.debut : premier;
  r.fin = avecDates ? dates.fin : dernier;
  return r;
}
// Date d'une saisie -> "yyyy-MM-dd" (comme les dates de l'offre) ; "" si illisible
function jourDeSaisie_(d) {
  if (d instanceof Date) return isNaN(d.getTime()) ? "" : Utilities.formatDate(d, fuseau_(), "yyyy-MM-dd");
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec((d || "").toString());
  return m ? m[3] + "-" + m[2] + "-" + m[1] : "";
}

// Archives supprimées automatiquement ARCHIVES_RETENTION_ANS ans après leur clôture
// (RGPD : durée de conservation définie). Date lue dans le nom de l'onglet ; un
// onglet au nom non reconnu n'est jamais supprimé. Appelée chaque nuit par
// verificationClotureNocturne. Renvoie les noms supprimés.
function purgerArchives_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const limite = new Date();
    limite.setFullYear(limite.getFullYear() - ARCHIVES_RETENTION_ANS);
    const cleLimite = Utilities.formatDate(limite, fuseau_(), "yyyyMMddHHmm");
    const supprimees = [];
    ss.getSheets().forEach(function (f) {
      const nom = f.getName();
      if (nom.indexOf(PREFIXE_ARCHIVES) !== 0) return;
      const tri = infosNomArchive_(nom).tri;
      if (tri && tri < cleLimite) {
        ss.deleteSheet(f);
        supprimees.push(nom);
      }
    });
    // Résumés sans archive (supprimée ici, ou à la main dans le Sheet) : effacés
    const props = PropertiesService.getDocumentProperties();
    Object.keys(props.getProperties()).forEach(function (k) {
      const nom = k.slice(cleResumeArchive_("").length);
      if (k.indexOf(cleResumeArchive_(PREFIXE_ARCHIVES)) === 0 && !ss.getSheetByName(nom))
        props.deleteProperty(k);
    });
    return supprimees;
  } finally {
    lock.releaseLock();
  }
}

// Liste des archives, la plus récente d'abord.
function listerArchives(jeton) {
  exigerAdmin_(jeton);
  return listeArchives_();
}
// Noms et résumés des archives seulement : le contenu d'une archive demande le code.
// Archive sans résumé (clôturée avant les résumés) : calculé ici une fois, puis gardé.
function listeArchives_() {
  const props = PropertiesService.getDocumentProperties();
  const resumes = props.getProperties();
  const liste = [];
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .forEach(function (f) {
      const nom = f.getName();
      if (nom.indexOf(PREFIXE_ARCHIVES) !== 0) return;
      let r = null;
      try {
        r = JSON.parse(resumes[cleResumeArchive_(nom)] || "null");
      } catch (e) {
        r = null;
      }
      if (!r) {
        r = calculerResumeArchive_(f, null);
        try {
          props.setProperty(cleResumeArchive_(nom), JSON.stringify(r));
        } catch (e) {
          Logger.log("Résumé d'archive non gardé : " + e);
        }
      }
      const infos = infosNomArchive_(nom);
      liste.push({
        nom: nom,
        libelle: infos.libelle,
        tri: infos.tri,
        debut: r.debut,
        fin: r.fin,
        saisies: r.saisies,
        total: r.total,
      });
    });
  liste.sort(function (a, b) {
    return a.tri < b.tri ? 1 : a.tri > b.tri ? -1 : 0;
  });
  return liste.map(function (a) {
    return { nom: a.nom, libelle: a.libelle, debut: a.debut, fin: a.fin, saisies: a.saisies, total: a.total };
  });
}

// Données d'impression d'une archive (même format que l'offre complète).
function donneesArchive(nom, jeton) {
  exigerAdmin_(jeton);
  nom = (nom || "").toString();
  if (nom.indexOf(PREFIXE_ARCHIVES) !== 0) throw new Error("Archive inconnue.");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const f = ss.getSheetByName(nom);
  if (!f) throw new Error("Archive introuvable : " + nom);
  return tableauImpression_(f, null, ss.getSpreadsheetTimeZone());
}

function archiverOffreWebApp(jeton) {
  exigerAdmin_(jeton);
  const message = archiverOffre_();
  journaliser_(quiJeton_(jeton), "Clôture de l'offre", message);
  return message;
}

// Clôture réelle (sans contrôle d'accès : appelée aussi par le robot de nuit).
// Sous verrou : aucune saisie ne peut s'intercaler entre la copie et le vidage.
function archiverOffre_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return archiverOffreSousVerrou_();
  } finally {
    libererVerrou_(lock);
  }
}

function archiverOffreSousVerrou_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuilleSaisies = ss.getSheetByName(FEUILLE_SAISIES);
  if (!feuilleSaisies) {
    enregistrerDates_("", "");
    return "✅ L'offre a été clôturée (feuille « " + FEUILLE_SAISIES + " » absente : rien à archiver).";
  }
  const derniereLigne = feuilleSaisies.getLastRow();
  let message;

  if (derniereLigne > 1) {
    // Nom unique : deux clôtures dans la même minute ne doivent pas échouer
    const base = PREFIXE_ARCHIVES + Utilities.formatDate(new Date(), fuseau_(), "dd-MM-yyyy_HH-mm");
    let nom = base,
      n = 2;
    while (ss.getSheetByName(nom)) nom = base + "_" + n++;
    // Résumé gardé AVANT de créer l'onglet (une liste lue entre-temps ne verra jamais
    // l'archive sans son résumé), avec les dates de l'offre (effacées plus bas).
    // Échec : la clôture continue, le résumé sera calculé à la 1re lecture de la liste.
    try {
      PropertiesService.getDocumentProperties().setProperty(
        cleResumeArchive_(nom),
        JSON.stringify(calculerResumeArchive_(feuilleSaisies, lireDates_()))
      );
    } catch (e) {
      Logger.log("Résumé d'archive : " + e);
    }
    const archive = ss.insertSheet(nom, ss.getNumSheets());
    feuilleSaisies.getDataRange().copyTo(archive.getRange(1, 1));
    archive.setFrozenRows(1);
    feuilleSaisies
      .getRange(2, 1, derniereLigne - 1, NB_COLONNES_LIGNE)
      .clearContent()
      .setBackground(null);
    message = "✅ L'offre a été clôturée et archivée avec succès !";
  } else {
    // Aucune saisie : on clôture sans créer d'archive vide
    message = "✅ L'offre a été clôturée (aucune saisie : pas d'archive créée).";
  }

  // Le mode (SIGNALER / BLOQUANT) est conservé pour l'offre suivante.

  // Dates de l'offre effacées : les tablettes passent sur « aucune opération »
  enregistrerDates_("", "");

  return message;
}
