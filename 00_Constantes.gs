// Constantes : structure de la feuille « Saisies » et réglages fixes.
// Lu en premier (nom en « 00_ ») ; ne contient que des valeurs, aucun appel.

// =================================================================
// --- STRUCTURE DE LA FEUILLE « Saisies » (source de vérité) ---
//     Les archives (« Archives_… ») ont la même structure : une copie de « Saisies ».
//     Ne pas changer ces valeurs sans adapter les feuilles existantes.
// =================================================================
var FEUILLE_SAISIES = "Saisies";
var CELLULE_MODE = "Z1"; // mode de sécurité : SIGNALER ou BLOQUANT
var ENTETES_SAISIES = ["Date", "Nom", "Prénom", "N° Pièce", "Montant", "Notes ou Infos"];
// Numéros de colonnes (A = 1), pour getRange(ligne, colonne…)
var COL = { DATE: 1, NOM: 2, PRENOM: 3, PIECE: 4, MONTANT: 5, NOTES: 6 };
// Positions dans une ligne lue par getValues() (A = 0) : toujours COL - 1
var IDX = { DATE: 0, NOM: 1, PRENOM: 2, PIECE: 3, MONTANT: 4, NOTES: 5 };
var NB_COLONNES = 6; // A à F : la ligne complète
var NB_COLONNES_SAISIE = 5; // B à F : ce qui est tapé (tout sauf la date)
var NB_COLONNES_LIGNE = 7; // A à G : largeur vidée / décolorée (G reste vide)
var PREFIXE_ARCHIVES = "Archives_";

// Autres onglets (anciens écrans du Sheet, gardés pour le panneau ⚙️)
var FEUILLE_IMPRESSION = "A_IMPRIMER";
var CELLULE_JOUR_IMPRESSION = "Z1"; // jour choisi (vide = aujourd'hui)
var FEUILLE_OFFRE_COMPLETE = "OFFRE_COMPLETE";

// Code responsable (voir Securite.gs)
var ADMIN_PIN_REGEX = /^\d{6}$/; // exactement 6 chiffres
var ADMIN_ESSAIS_MAX = 5; // 5 codes faux -> blocage
var ADMIN_BLOCAGE_MIN = 15; // durée du blocage (minutes)
var ADMIN_PAUSE_MS = 10000; // pause imposée par le SERVEUR après chaque code faux
var ADMIN_SESSION_SEC = 600; // session responsable : 10 min d'inactivité

// Code d'activation (voir Securite.gs) : durée de validité, essais
var ACTIVATION_DUREE_H = 24;
var ACTIVATION_ESSAIS_MAX = 10;

// Tablettes autorisées (voir Securite.gs)
var TABLETTES_MAX = 20;

// Annuaire inter-offres (voir Annuaire.gs). ANNUAIRE_ACTIF = false coupe tout.
var ANNUAIRE_ACTIF = true;
var ANNUAIRE_RETENTION_ANS = 3; // purge après X ans d'inactivité (dernière vue)
var ANNUAIRE_FEUILLE = "_Annuaire";

// Archives supprimées ARCHIVES_RETENTION_ANS ans après leur clôture (RGPD)
var ARCHIVES_RETENTION_ANS = 3;
