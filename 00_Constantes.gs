// Constantes : structure de la feuille « Saisies » et réglages fixes.
// Lu en premier (nom en « 00_ ») ; ne contient que des valeurs (et son numéro de version).

// Même numéro dans tous les fichiers : contrôle de l'installation (outils/version.js).
function version_00_Constantes_() {
  return "2026.10.18-0019";
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
const ADMIN_SESSION_PERSONNEL_SEC = 180; // codes personnels : 3 min (le journal nomme la personne)
const PERSONNES_MAX = 30; // codes personnels (voir Personnes.gs)

// Code d'activation (voir Securite.gs) : durée de validité, essais
const ACTIVATION_DUREE_H = 24;
const ACTIVATION_ESSAIS_MAX = 10;

// Compte du magasin (identifiant + mot de passe, UN SEUL pour tous les appareils, voir
// Securite.gs). Mots de passe faux : pause de 10 s après chacun ; à partir du
// CPT_ESSAIS_LIBRES-ième, connexion bloquée 5, puis 10, puis 15 min (jamais plus) ;
// compteur remis à zéro par une connexion réussie ou après CPT_OUBLI_H heures sans erreur.
// Les appareils déjà connectés ne sont jamais bloqués.
const CPT_ESSAIS_LIBRES = 10;
const CPT_BLOCAGES_MIN = [5, 10, 15];
const CPT_OUBLI_H = 24;
const MDP_MIN = 8; // longueur minimale du mot de passe
const MDP_TOURS = 500; // empreinte répétée : ralentit les essais si les propriétés fuitent
const SESSION_HEURE_FIN = 3; // toutes les sessions se terminent à 3 h du matin (fuseau du script)

// Assistant d'installation (voir Assistant.gs) : onglet d'accueil du modèle, retiré à la fin.
const FEUILLE_DEMARRER = "Démarrer";
// Autorisations Google vérifiées (consentement case par case : une case peut rester
// décochée). Sans l'adresse e-mail, le programme ne reconnaît plus le propriétaire ; sans
// les déclencheurs, pas de robot de nuit.
const AUTORISATIONS_VERIFIEES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/script.scriptapp",
];
const MESSAGE_AUTORISATION_INCOMPLETE =
  "Autorisation Google incomplète (une case n'a pas été cochée) : menu 🚀 APPLICATION → " +
  "▶ Assistant d'installation, puis cochez « Tout sélectionner ».";

// Annuaire inter-offres (voir Annuaire.gs). ANNUAIRE_ACTIF = false coupe tout.
const ANNUAIRE_ACTIF = true;
const ANNUAIRE_RETENTION_ANS = 3; // purge après X ans d'inactivité (dernière vue)
const ANNUAIRE_FEUILLE = "_Annuaire";

// Archives supprimées ARCHIVES_RETENTION_ANS ans après leur clôture (RGPD)
const ARCHIVES_RETENTION_ANS = 3;

// Journal des actions sensibles (voir Journal.gs) : onglet masqué, lignes effacées après
// JOURNAL_RETENTION_MOIS mois (il contient des données de clients : saisies supprimées…)
const JOURNAL_FEUILLE = "_Journal";
const JOURNAL_RETENTION_MOIS = 12;
const JOURNAL_ENTETES = ["Date et heure", "Qui", "Action", "Détail", "Empreinte"];
// Empreintes chaînées : une ligne modifiée ou effacée à la main se voit (vérifié par le
// robot de nuit). Tolérance : une ligne peut s'enchaîner à l'une des JOURNAL_TOLERANCE
// lignes précédentes (deux actions journalisées au même instant, sans verrou commun).
const JOURNAL_TOLERANCE = 3;
// Changements de « qui peut faire quoi » (codes, personnes, comptes) : montrés à tous dans
// l'espace responsable et le panneau du Sheet pendant CHANGEMENTS_DUREE_H heures (non
// fermable), CHANGEMENTS_AFFICHES au plus (les autres : voir le journal).
const CHANGEMENTS_DUREE_H = 48;
const CHANGEMENTS_AFFICHES = 5;

// Fichiers de l'application : tous doivent être présents et porter le même numéro de
// version (contrôle au démarrage et dans « Installer », cf. Installation.gs).
const FICHIERS_SERVEUR = [
  "00_Constantes",
  "Annuaire",
  "Application",
  "Archives",
  "Assistant",
  "Detection",
  "Installation",
  "Journal",
  "Personnes",
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
  "ScriptConnexion",
  "Panneau",
  "FenetreAssistant",
  "Qrcode",
];
