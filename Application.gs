// Point d'entrée de l'application (doGet), démarrage de la tablette, copie
// locale (cache), impression, et petits outils communs à tous les fichiers.

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_Application_() {
  return "2026.10.16-0853";
}

// Fuseau horaire de référence (réglage du projet Apps Script : Europe/Paris par défaut).
// Un seul fuseau pour les dates d'offre, les noms d'archives, l'impression, le robot.
function fuseau_() {
  try {
    return Session.getScriptTimeZone() || "Europe/Paris";
  } catch (e) {
    return "Europe/Paris";
  }
}

// Mode de sécurité de « Saisies »!Z1 (tolère « Bloquant », espaces…).
function modeSecurite_(feuille) {
  const v = feuille ? (feuille.getRange(CELLULE_MODE).getValue() || "").toString().trim().toUpperCase() : "";
  return v === "BLOQUANT" ? "BLOQUANT" : "SIGNALER";
}

// Avant de rendre le verrou : écritures envoyées au tableur (la saisie suivante les lit).
function libererVerrou_(lock) {
  try {
    SpreadsheetApp.flush();
  } catch (e) {}
  lock.releaseLock();
}

function doGet(e) {
  // Fichier manquant ou resté à l'ancienne version : on n'ouvre pas une application à moitié
  const problemes = problemesInstallation_();
  if (problemes.length) return pageInstallationIncomplete_(problemes);
  nettoyerSiCopie_(); // copie du modèle (ou d'un autre classeur) : repart sans code/dates/réglages hérités
  // Nouvelle structure : crée « Saisies » si elle n'existe pas encore (rien n'est écrasé)
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FEUILLE_SAISIES)) installerFeuilles_();
  const cfg = getConfig();
  const page = HtmlService.createTemplateFromFile("Index");
  page.cfg = cfg;
  // Dates de l'offre glissées dans la page : la tablette affiche tout de suite le bon
  // écran (saisie ou « aucune opération »), sans attendre un appel au serveur.
  page.dates = lireDates_();
  // Adresse /exec : le formulaire de connexion y est réellement envoyé (doPost), seule
  // façon pour que le gestionnaire de mots de passe de Safari propose de l'enregistrer.
  let url = "";
  try {
    url = ScriptApp.getService().getUrl() || "";
  } catch (e) {
    url = "";
  }
  page.urlAppli = url;
  return page
    .evaluate()
    .setTitle(cfg.TITRE_APP)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

// Reçoit l'envoi du formulaire de connexion (cadre caché de la page) : ne fait RIEN et ne
// lit rien (identifiant et mot de passe sont vérifiés par connexion()). Il n'existe que
// pour que le navigateur voie un vrai envoi et propose d'enregistrer le mot de passe.
function doPost() {
  return HtmlService.createHtmlOutput("");
}

// Morceaux de la page (Style.html, Script*.html), insérés tels quels dans Index.html
// par <?!= include_('Nom') ?>. Ils ne contiennent aucune balise de modèle (<? ?>).
function include_(nom) {
  return HtmlService.createHtmlOutputFromFile(nom).getContent();
}

// Valeur texte à écrire dans le Sheet telle quelle : l'apostrophe initiale
// (invisible) empêche Google Sheets de la convertir (nombre -> 0 perdu, date,
// formule « = »). Les valeurs vides ou non textuelles sont écrites telles quelles.
function texte_(v) {
  return typeof v === "string" && v !== "" ? "'" + v : v;
}

// Montant : laissé tel quel (Sheets le lit comme un nombre), sauf s'il pourrait être
// pris pour une formule (= + - @) -> écrit en texte.
function montantSur_(m) {
  return typeof m === "string" && /^\s*[=+\-@]/.test(m) ? "'" + m : m;
}

// Données pré-chargées au démarrage pour la vérif IMMÉDIATE (locale) au blur :
// pièces de l'offre en cours (N2) + annuaire (N3). Rafraîchi au retour sur la page
// et après chaque saisie. NE remplace PAS la validation finale (toujours serveur).
// sansAnnuaire : la tablette garde l'annuaire qu'elle a déjà (lourd, et inutile à
// recharger pendant l'offre : il ne sert qu'aux clients des offres passées) ; elle
// le redemande au démarrage puis une fois par heure. annuaire = null dans la réponse.
function chargerCacheVerif(cle, sansAnnuaire) {
  exigerSession_(cle);
  return cacheVerif_(sansAnnuaire === true);
}

function cacheVerif_(sansAnnuaire) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const feuille = ss.getSheetByName(FEUILLE_SAISIES);
  const mode = modeSecurite_(feuille);

  const offre = [];
  if (feuille) {
    const donnees = feuille.getDataRange().getValues();
    for (let i = 1; i < donnees.length; i++) {
      const pn = _normPiece_(donnees[i][IDX.PIECE]);
      // lignes sans N° gardées si elles ont un nom (un homonyme reste détectable)
      if (pn === "" && _normId_(donnees[i][IDX.NOM]) === "") continue;
      offre.push({
        pieceNorm: pn,
        ligne: i + 1,
        date:
          donnees[i][IDX.DATE] instanceof Date
            ? Utilities.formatDate(donnees[i][IDX.DATE], fuseau_(), "dd/MM/yyyy HH:mm")
            : donnees[i][IDX.DATE]
              ? donnees[i][IDX.DATE].toString()
              : "",
        nom: donnees[i][IDX.NOM] ? donnees[i][IDX.NOM].toString() : "",
        prenom: donnees[i][IDX.PRENOM] ? donnees[i][IDX.PRENOM].toString() : "",
        piece: donnees[i][IDX.PIECE] ? donnees[i][IDX.PIECE].toString() : "",
        montant: donnees[i][IDX.MONTANT] ? donnees[i][IDX.MONTANT].toString() : "",
        notes: donnees[i][IDX.NOTES] ? donnees[i][IDX.NOTES].toString() : "",
      });
    }
  }

  let annuaire = {};
  if (sansAnnuaire) annuaire = null;
  else if (ANNUAIRE_ACTIF) {
    const fa = _feuilleAnnuaire_();
    const ad = fa.getDataRange().getValues();
    for (let j = 1; j < ad.length; j++) {
      const p = _normPiece_(ad[j][0]);
      if (p !== "")
        annuaire[p] = {
          nom: ad[j][1] ? ad[j][1].toString() : "",
          prenom: ad[j][2] ? ad[j][2].toString() : "",
        };
    }
  }

  // Réglages joints : un réglage changé sur une autre tablette (passages autorisés,
  // montant obligatoire…) est appliqué ici dès le rechargement suivant.
  return {
    mode: mode,
    offre: offre,
    annuaire: annuaire,
    annuaireActif: ANNUAIRE_ACTIF,
    modeAnnuaire: getModeAnnuaire(),
    config: getConfig(),
  };
}

// Démarrage de la tablette : UN seul appel (au lieu de trois) pour le mode, les
// dates et le cache de vérification. Le cache (toute l'offre + l'annuaire) n'est
// envoyé que si l'offre est en cours : hors période, la saisie est impossible.
function demarrage(cle) {
  exigerSession_(cle);
  return {
    infos: infosPanneau_(),
    dates: lireDates_(),
    config: getConfig(),
    cache: controlerPeriode_() ? null : cacheVerif_(),
  };
}

// --- PANNEAU ET IMPRESSION ---
function getInfosPanneau(cle) {
  exigerSession_(cle);
  return infosPanneau_();
}

function infosPanneau_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const f = ss.getSheetByName(FEUILLE_SAISIES);
  const mode = modeSecurite_(f);
  return { success: true, mode: mode, annuaireActif: ANNUAIRE_ACTIF, modeAnnuaire: getModeAnnuaire() };
}

// Impression calculée directement depuis « Saisies » (colonnes A-F). Ne dépend
// plus des onglets A_IMPRIMER / OFFRE_COMPLETE (conservés tels quels pour le
// panneau du Sheet, en secours) et ne les modifie plus.
//  - 'jour'  : lignes dont la date tombe le jour choisi ("aujourdhui" ou
//              "yyyy-MM-dd"), date en jj/mm/aaaa — comme A_IMPRIMER.
//  - 'offre' : toutes les lignes non vides, date + heure — comme OFFRE_COMPLETE.
// Renvoie [] s'il n'y a aucune ligne à imprimer.
// Avec un code responsable, l'offre entière et les jours passés (export de nombreux
// clients sur papier) sont réservés à l'espace responsable (jeton) ; la journée du jour
// reste possible avec la seule connexion (journal). Sans code : connexion seule.
function genererDonneesImpression(type, dateChoisieStr, cle, jeton) {
  exigerSession_(cle);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone(); // même référence que INT()/TODAY() dans A_IMPRIMER
  const aujourdhui = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const reserve = type !== "jour" || (dateChoisieStr !== "aujourdhui" && dateChoisieStr !== aujourdhui);
  if (reserve && PropertiesService.getDocumentProperties().getProperty("ADMIN_PIN_HASH")) exigerAdmin_(jeton);
  const feuille = ss.getSheetByName(FEUILLE_SAISIES);
  if (!feuille) return [];
  let jour = null;
  if (type === "jour") {
    jour =
      dateChoisieStr === "aujourdhui" ? Utilities.formatDate(new Date(), tz, "yyyy-MM-dd") : dateChoisieStr;
  }
  return tableauImpression_(feuille, jour, tz);
}

// En-tête + lignes A-F affichées d'une feuille au format « Saisies ».
// jour (yyyy-MM-dd) : ne garde que ce jour-là, date en jj/mm/aaaa ;
// jour null : toutes les lignes non vides, telles qu'affichées.
function tableauImpression_(feuille, jour, tz) {
  const derniere = feuille.getLastRow();
  if (derniere < 2) return [];
  const cfg = getConfig();
  const entete = ENTETES_SAISIES.slice(0, IDX.MONTANT).concat([cfg.LIBELLE_MONTANT, cfg.LIBELLE_NOTES]);
  const plage = feuille.getRange(2, 1, derniere - 1, NB_COLONNES);
  const valeurs = plage.getValues();
  const affichage = plage.getDisplayValues();

  const lignes = [];
  for (let i = 0; i < valeurs.length; i++) {
    if (jour) {
      const d = valeurs[i][IDX.DATE];
      if (!(d instanceof Date) || Utilities.formatDate(d, tz, "yyyy-MM-dd") !== jour) continue;
      const ligne = affichage[i].slice();
      ligne[IDX.DATE] = Utilities.formatDate(d, tz, "dd/MM/yyyy");
      lignes.push(ligne);
    } else {
      if (affichage[i].join("") === "") continue;
      lignes.push(affichage[i]);
    }
  }
  return lignes.length ? [entete].concat(lignes) : [];
}
