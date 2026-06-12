# 2026-06-07 — Niveau 2 : vérification immédiate du N° de pièce — Décision (implémenté)

## ✅ Décision validée avec Bryan
Pré-avertissement **non bloquant** : dès que la saisie du **N° de pièce** est
terminée, prévenir si ce numéro est **déjà enregistré sur l'offre en cours**.

## 🔧 Ce qui a été fait
**Serveur — `Code.gs` : `verifierPiece(piece)`** (lecture seule)
- Cherche le N° (normalisé : majuscules, sans espaces/tirets) dans « Saisies ».
- Renvoie `{ trouve, mode, matches[] }` (matches = date, nom, prénom, montant, ligne).
- **Ne bloque rien, ne réécrit rien, ne décide rien.**

**Client — `Index.html`**
- Déclencheur : **`blur` du champ N°** (= saisie terminée, focus passe à Nom), **si non vide**.
- **Rien trouvé → rien ne se passe.**
- **Doublon trouvé → modale `#modalDoublonPiece`** : « ⚠️ N° déjà enregistré sur cette
  offre » + la/les ligne(s) doublon. Bouton **OK** → focus revient sur **Nom**.
- En mode **BLOQUANT** : ajoute « (sera refusé à la validation) ».

## 🛡️ Garde-fous
- **Lecture seule**, **non autoritaire** : la décision A/B/C reste à `traiterSaisie`
  (validation). La feuille « Saisies » reste l'**unique source de vérité**.
- **Aucune donnée nouvelle, aucun RGPD supplémentaire** : la modale affiche la même
  info que la modale de validation déjà existante, même finalité anti-fraude.

## 📌 Pour les autres assistants
- C'est la **brique** que réutilisera le **Niveau 3** (auto-complétion inter-offres) :
  même appel au `blur`, on y ajoutera la lecture de l'annuaire `_Annuaire`.
- Déployé en prod le 2026-06-07 (même URL, déploiement mis à jour).
