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

## 🔧 Ce qui a été fait (6 commits)
1. Réglages de la structure + textes réglables (`getConfig`, template `doGet`).
2. Impression calculée depuis « Saisies » (plus besoin d'`A_IMPRIMER` / `OFFRE_COMPLETE`).
3. Espace responsable : code PIN, jeton, réglages, mode, dates, clôture.
4. Archives consultables / imprimables.
5. Correction / suppression de saisies (recontrôle A/B/C serveur).
6. `installer()` idempotent + `INSTALLATION.md` + docs.

## 🛡️ Garde-fous
- « Saisies » reste l'**unique source de vérité** ; `traiterSaisie` / `forcerSaisie` /
  `onEdit` **non modifiés**.
- Une **correction** est recontrôlée A/B/C contre toutes les autres lignes (BLOQUANT :
  A/B refusés ; sinon confirmation explicite puis marquage rouge, comme `onEdit`).
- Correction/suppression refusée si la ligne a changé depuis l'affichage.
- La **clôture** passe sous verrou (aucune saisie perdue entre copie et vidage).
- Code PIN jamais stocké en clair ; blocage après 5 essais.

## ⚠️ À savoir
- Après collage du nouveau `Code.gs` : **lancer `installer()`** depuis l'éditeur
  (nouvelles autorisations : déclencheurs, e-mail de l'utilisateur pour le panneau).
- **Créer le code responsable** juste après le déploiement.
- Testé hors ligne (faux Apps Script + Chromium) ; **à valider sur une copie du Sheet**
  avant la prod.
- Constat (non corrigé, panneau laissé tel quel) : dans `Panneau.html`, après une
  clôture, `changerMode()` est appelé → le mode repasse en **BLOQUANT** au lieu de
  rester SIGNALER.
