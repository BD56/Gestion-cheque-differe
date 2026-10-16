// Dates de l'offre et robot de nuit (clôture automatique).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Robots_() {
  return "2026.10.16-1031";
}

// =================================================================
// --- ROBOT DE NUIT : CLÔTURE AUTOMATIQUE ---
// =================================================================

function verificationClotureNocturne(e) {
  exigerDeclencheurOuEditeur_(e);
  // Passage du robot noté : l'espace responsable signale un robot qui ne tourne plus
  const props = PropertiesService.getDocumentProperties();
  props.setProperties({
    DERNIERE_NUIT: Utilities.formatDate(new Date(), fuseau_(), "dd/MM/yyyy HH:mm"),
    DERNIERE_NUIT_MS: String(Date.now()),
  });

  // Archives de plus de 3 ans, journal de plus de 12 mois : supprimés (n'empêche
  // jamais la clôture)
  try {
    purgerArchives_();
  } catch (e) {
    Logger.log("Purge des archives : " + e);
  }
  try {
    purgerJournal_();
  } catch (e) {
    Logger.log("Purge du journal : " + e);
  }

  const dates = lireDates_();

  // S'il n'y a pas de date de fin enregistrée, le robot se rendort
  if (!dates.fin || dates.fin === "") {
    return;
  }

  // Jour d'aujourd'hui dans le fuseau du projet, comparé au texte « aaaa-mm-jj »
  // (pas de new Date("aaaa-mm-jj"), lu en UTC : décalage hors métropole)
  const aujourdhui = Utilities.formatDate(new Date(), fuseau_(), "yyyy-MM-dd");

  // Si la date d'aujourd'hui est STRICTEMENT supérieure à la date de fin
  // Ça veut dire que l'offre s'est terminée hier. On archive !
  if (aujourdhui > dates.fin) {
    // On appelle ta fonction d'archivage existante
    journaliser_("Robot de nuit", "Clôture automatique de l'offre", archiverOffre_());

    // On efface les dates en mémoire pour verrouiller la tablette le matin
    enregistrerDates_("", "");
  }
}

// =================================================================
// --- DATES DE L'OFFRE (propriétés du document) ---
// =================================================================

function getDatesOperation(cle) {
  exigerSession_(cle);
  return lireDates_();
}

function lireDates_() {
  const memoire = PropertiesService.getDocumentProperties();
  return {
    debut: memoire.getProperty("DATE_DEBUT") || "",
    fin: memoire.getProperty("DATE_FIN") || "",
  };
}

function setDatesOperation(dateDebut, dateFin, jeton) {
  exigerAdmin_(jeton);
  dateDebut = (dateDebut || "").toString().trim();
  dateFin = (dateFin || "").toString().trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (dateDebut !== "" || dateFin !== "") {
    if (!iso.test(dateDebut) || !iso.test(dateFin))
      throw new Error(
        "Saisissez la date de début ET la date de fin (ou aucune des deux pour arrêter l'opération)."
      );
    if (dateDebut > dateFin) throw new Error("La date de début doit précéder la date de fin.");
  }
  const avant = lireDates_();
  let message = enregistrerDates_(dateDebut, dateFin);
  journaliser_(
    quiJeton_(jeton),
    "Dates de l'offre",
    (avant.debut ? "du " + jourLisible_(avant.debut) + " au " + jourLisible_(avant.fin) : "aucune") +
      " → " +
      (dateDebut
        ? "du " + jourLisible_(dateDebut) + " au " + jourLisible_(dateFin)
        : "aucune (offre arrêtée)")
  );
  // Offre qui commence plus tard alors que « Saisies » contient encore des lignes :
  // l'ancienne offre n'a pas été clôturée -> elles seraient mélangées avec la nouvelle.
  const f = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES);
  const auj = Utilities.formatDate(new Date(), fuseau_(), "yyyy-MM-dd");
  if (dateDebut > auj && f && f.getLastRow() > 1) {
    message +=
      "\n⚠️ Des saisies sont encore dans la liste : clôturez l'offre précédente avant le " +
      dateDebut.split("-").reverse().join("/") +
      ", sinon elles seront mélangées avec la nouvelle.";
  }
  return message;
}

function enregistrerDates_(dateDebut, dateFin) {
  const memoire = PropertiesService.getDocumentProperties();
  memoire.setProperty("DATE_DEBUT", dateDebut);
  memoire.setProperty("DATE_FIN", dateFin);

  return "Dates enregistrées avec succès !";
}
