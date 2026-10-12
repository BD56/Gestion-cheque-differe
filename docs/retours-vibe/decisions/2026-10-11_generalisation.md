# 2026-10-11 — Généralisation (autres structures / autres offres) — Décision (implémenté, branche `generalisation`)

## ✅ Décisions validées avec Bryan
| Sujet | Décision |
|-------|----------|
| Portée | Les 3 lectures : autre structure, autre offre, installation simple |
| Où se règle l'appli | **Tout passe par l'application** ; le Google Sheets n'est qu'un stockage |
| Réglages | Modifiables dans l'appli ; défauts = Carrefour Vannes (rien ne change sans réglage) |
| Devise | Euro (fixe) |
| Conservation annuaire | 3 ans (fixe) |
| Sécurité | **Code PIN responsable** vérifié côté serveur |
| Corrections | Correction **et** suppression dans l'appli |
| Google Sheets | Laissé tel quel (panneau + `onEdit`) en **secours** |
| Libellé colonne F | « Notes ou Infos » |
| Distribution | **Option A : classeur modèle vierge à copier** (lien `/copy`), menu « Installer » ; seule étape manuelle restante : le déploiement web |

## 🔧 Ce qui a été fait (6 commits)
1. Réglages de la structure + textes réglables (`getConfig`, template `doGet`).
2. Impression calculée depuis « Saisies » (plus besoin d'`A_IMPRIMER` / `OFFRE_COMPLETE`).
3. Espace responsable : code PIN, jeton, réglages, mode, dates, clôture.
4. Archives consultables / imprimables.
5. Correction / suppression de saisies (recontrôle A/B/C serveur).
6. `installer()` idempotent + `INSTALLATION.md` + docs.
7. Modèle à copier : menu « 🧰 Installer », détection de copie (`ID_CLASSEUR`) qui
   efface les réglages hérités, guide modèle + mise à jour du modèle.

## 🛡️ Garde-fous
- « Saisies » reste l'**unique source de vérité** ; `traiterSaisie` / `forcerSaisie` /
  `onEdit` **non modifiés**.
- Une **correction** est recontrôlée A/B/C contre toutes les autres lignes (BLOQUANT :
  A/B refusés ; sinon confirmation explicite puis marquage rouge, comme `onEdit`).
- Correction/suppression refusée si la ligne a changé depuis l'affichage.
- La **clôture** passe sous verrou (aucune saisie perdue entre copie et vidage).
- Code PIN jamais stocké en clair ; blocage après 5 essais.
- Une copie (du modèle ou d'un autre classeur) **n'hérite jamais** du code responsable,
  des dates ni des réglages : effacés à l'installation / 1re ouverture.

## 🔀 Options de distribution discutées
- **A. Modèle à copier** ✅ retenue : simple, données chez chaque structure. Mises à jour
  à reporter dans chaque copie (OK pour quelques structures).
- **B. Appli centrale** ❌ pour l'instant : Bryan deviendrait sous-traitant RGPD de
  toutes les structures ; refonte lourde. À rouvrir si beaucoup de structures.
- **C. Sortir de Google** ❌ : autre projet (hébergement, coûts, données d'identité).

## ⚠️ À savoir
- Après collage du nouveau `Code.gs` : **menu 🚀 APPLICATION → 🧰 Installer** (ou `installer()` depuis l'éditeur)
  (nouvelles autorisations : déclencheurs, e-mail de l'utilisateur pour le panneau).
- **Créer le code responsable** juste après le déploiement.
- Testé hors ligne (faux Apps Script + Chromium) ; **à valider sur une copie du Sheet**
  avant la prod.
- **Corrigé (validé avec Bryan)** : `forcerSaisie` faisait confiance à la tablette (ni
  mode, ni recontrôle, note/couleurs envoyées par le client) → un appel direct ou un
  cache périmé pouvait forcer un cas A/B en BLOQUANT, voire sans marquage. Désormais
  le serveur refait la détection, refuse A/B en BLOQUANT et calcule lui-même le cas.
- **Analyse globale + contre-analyse (validées avec Bryan)** : 23 points relevés, tous
  reproduits. Corrigés en priorité (graves, existaient déjà en prod) :
  1. N° de pièce converti en nombre par Sheets (0 initial perdu — **confirmé par Bryan sur
     une copie**) → écriture en texte + comparaison sans 0 initiaux ;
  2. doublon immédiat invisible sur la tablette (saisie effacée de la copie locale) ;
  3. message de refus coupé par un ancien minuteur → fenêtre d'alerte ;
  4. saisies acceptées après la fin de l'offre (tablette restée ouverte) → contrôle serveur.
  Puis (validés avec Bryan) : #7 accents, #8 annuaire et usurpation, #9 marquages
  recalculés, #11 panneau (clôture -> BLOQUANT), #16 injection HTML, #17 montant,
  #23 pré-remplissage depuis un doublon de l'offre retiré (revient sur 8bae95e).
  Puis mineurs #13 (nom d'archive unique), #14 (pas d'archive vide), #15 (dates
  contrôlées), #19 (reconstruireAnnuaire réservée aux éditeurs), #20 (saisie incomplète
  refusée côté serveur), #22 (purge sous verrou).
  Puis (décisions de Bryan) :
  - **#5** : le manager de caisse détient le Sheet (idéalement compte Google du magasin)
    et ne transmet que le lien de l'appli ; ce compte n'est jamais connecté sur une
    tablette de caisse (règle documentée dans INSTALLATION.md).
  - **#6** : **tablettes autorisées (appairage)** par le code responsable ; accès du
    déploiement « Tout le monde » (plus besoin de compte Google sur la tablette).
  - **Code responsable : 6 chiffres**, pause serveur de **10 s** après un code faux
    (idée de Bryan, compteur global : on ne peut pas reconnaître l'appareil), blocage
    15 min après 5 erreurs, sans blocage progressif (évite de bloquer le vrai
    responsable).
  - **#10** : `onEdit` contrôle chaque ligne d'un collage.
  Clos : #12 (remplacé par la fenêtre d'alerte). Accepté : #18 (taille de l'annuaire
  téléchargé, ~170 Ko après 3 ans, à revoir si besoin).
- Constat (non corrigé, panneau laissé tel quel) : dans `Panneau.html`, après une
  clôture, `changerMode()` est appelé → le mode repasse en **BLOQUANT** au lieu de
  rester SIGNALER.
