# 2026-06-07 — Saisie : `Entrée` → champ suivant + ordre des champs — Décision (implémenté)

## ✅ Décisions validées avec Bryan
| Sujet | Décision | Statut |
|-------|----------|--------|
| `Entrée` → champ suivant | Implémenté dans `Index.html` | ✅ Fait |
| Ordre des champs : **N° de Pièce en premier** | Implémenté (prépare l'auto-complétion future) | ✅ Fait |

## 🔧 Ce qui a été fait (Index.html)
- **Navigation clavier** : `Entrée` enchaîne **Pièce → Nom → Prénom → Montant**.
  - **Notes** est exclu (comme décidé).
  - Sur **Montant**, `Entrée` met le focus sur le **bouton Valider** — **pas de
    soumission automatique** (`e.preventDefault()`), pour éviter tout envoi accidentel.
- **Ordre des champs** : le formulaire affiche désormais **N° de Pièce, puis Nom,
  Prénom, Montant, Notes**. Le **focus initial** est sur **N° de Pièce**.
- **Aucun impact backend** : l'ordre d'affichage est indépendant des colonnes de la
  feuille « Saisies » (mapping par `id`, pas par position).

## 🎯 Pourquoi « N° de Pièce en premier »
La pièce est l'**identifiant fort**. La saisir en premier prépare le flux futur :
dès que le N° est tapé, l'auto-complétion (Niveau 3, si validée RGPD) pourra
**pré-remplir Nom/Prénom** depuis la mémoire inter-offres.

## 📌 Pour les autres assistants
- **Ne pas revenir** à l'ancien ordre (Nom en premier) sans re-valider avec Bryan.
- Si on implémente l'auto-complétion : après saisie du N° de Pièce, pré-remplir
  Nom/Prénom **en suggestion modifiable** ; la détection A/B/C reste à la validation.
- Déployé en prod le 2026-06-07 (même URL, déploiement mis à jour).
