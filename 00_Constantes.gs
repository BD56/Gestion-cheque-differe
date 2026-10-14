// Constantes : structure de la feuille « Saisies » et réglages fixes.
// Lu en premier (nom en « 00_ ») ; ne contient que des valeurs (et son numéro de version).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_00_Constantes_() {
  return "2026.10.14-1015";
}

// =================================================================
// --- STRUCTURE DE LA FEUILLE « Saisies » (source de vérité) ---
//     Les archives (« Archives_… ») ont la même structure : une copie de « Saisies ».
//     Ne pas changer ces valeurs sans adapter les feuilles existantes.
// =================================================================
const FEUILLE_SAISIES = "Saisies";
const CELLULE_MODE = "Z1"; // mode de sécurité : SIGNALER ou BLOQUANT
const ENTETES_SAISIES = ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos"];
// Numéros de colonnes (A = 1), pour getRange(ligne, colonne…)
const COL = { DATE: 1, NOM: 2, PRENOM: 3, PIECE: 4, MONTANT: 5, NOTES: 6 };
// Positions dans une ligne lue par getValues() (A = 0) : toujours COL - 1
const IDX = { DATE: 0, NOM: 1, PRENOM: 2, PIECE: 3, MONTANT: 4, NOTES: 5 };
const NB_COLONNES = 6; // A à F : la ligne complète
const NB_COLONNES_SAISIE = 5; // B à F : ce qui est tapé (tout sauf la date)
const NB_COLONNES_LIGNE = 7; // A à G : largeur vidée / décolorée (G reste vide)
const PREFIXE_ARCHIVES = "Archives_";

// Autres onglets (anciens écrans du Sheet, gardés pour le panneau ⚙️)
const FEUILLE_IMPRESSION = "A_IMPRIMER";
const CELLULE_JOUR_IMPRESSION = "Z1"; // jour choisi (vide = aujourd'hui)
const FEUILLE_OFFRE_COMPLETE = "OFFRE_COMPLETE";

// Code responsable (voir Securite.gs)
const ADMIN_PIN_REGEX = /^\d{6}$/; // exactement 6 chiffres
const ADMIN_ESSAIS_MAX = 5; // 5 codes faux -> blocage
const ADMIN_BLOCAGE_MIN = 15; // durée du blocage (minutes)
const ADMIN_PAUSE_MS = 10000; // pause imposée par le SERVEUR après chaque code faux
const ADMIN_SESSION_SEC = 600; // session responsable : 10 min d'inactivité

// Code d'activation (voir Securite.gs) : durée de validité, essais
const ACTIVATION_DUREE_H = 24;
const ACTIVATION_ESSAIS_MAX = 10;

// Tablettes autorisées (voir Securite.gs)
const TABLETTES_MAX = 20;

// Annuaire inter-offres (voir Annuaire.gs). ANNUAIRE_ACTIF = false coupe tout.
const ANNUAIRE_ACTIF = true;
const ANNUAIRE_RETENTION_ANS = 3; // purge après X ans d'inactivité (dernière vue)
const ANNUAIRE_FEUILLE = "_Annuaire";

// Archives supprimées ARCHIVES_RETENTION_ANS ans après leur clôture (RGPD)
const ARCHIVES_RETENTION_ANS = 3;

// Fichiers de l'application : tous doivent être présents et porter le même numéro de
// version (contrôle au démarrage et dans « Installer », cf. Installation.gs).
const FICHIERS_SERVEUR = [
  "00_Constantes",
  "Annuaire",
  "Application",
  "Archives",
  "Detection",
  "Installation",
  "Reglages",
  "Robots",
  "Saisie",
  "Securite",
  "Sheet",
];
const FICHIERS_PAGE = [
  "Index",
  "Style",
  "Icones",
  "ScriptActions",
  "ScriptAlertes",
  "ScriptFormulaire",
  "ScriptImpression",
  "ScriptJournal",
  "ScriptOcr",
  "ScriptOffre",
  "ScriptResponsable",
  "ScriptSaisie",
  "ScriptTablette",
  "Panneau",
];
