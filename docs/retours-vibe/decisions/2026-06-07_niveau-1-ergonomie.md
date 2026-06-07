# 2026-06-07 — Niveau 1 (Ergonomie de saisie) — Décision

## ✅ Décision validée avec Bryan
| Amélioration | Décision | Justification | Statut |
|--------------|----------|---------------|--------|
| MAJUSCULES instantanées (côté client) | **Abandonnée** | Déjà gérée côté serveur (`toUpperCase()` + nettoyage dans `Code.gs`). Avantages marginaux (feedback visuel) ne justifient pas l'effort. | ❌ Non implémentée |
| Clavier numérique | **Abandonnée** | Problèmes de compatibilité (navigateurs/tablettes). Solution alternative : clavier physique ou virtuel optimisé. | ❌ Non implémentée |
| `Entrée` → champ suivant | **À implémenter (futur)** | Gain de temps pour les caissières (navigation fluide). Risque/coût technique quasi nul. | ⏳ En attente |

---

## 🔍 Contexte
- **Problème initial** : Améliorer l'ergonomie de la saisie sur tablette (piste proposée dans `AGENTS.md`).
- **Vérification** :
  - Le code existant (`Code.gs`, lignes 23-25, 40-42, etc.) normalise **toutes les entrées** (majuscules, `trim()`, suppression espaces/tirets) **avant comparaison**.
  - **→ Aucun risque de faux négatif** lié à la casse.
- **Priorisation** :
  - `Entrée` → champ suivant : **meilleur rapport utilité/effort**.
  - Les autres : **redondantes ou trop limitées**.

---

## 📌 Pour les autres assistants
- **Ne pas réimplémenter** les MAJUSCULES côté client ou le clavier numérique **sans re-valider avec Bryan**.
- **Si implémentation de `Entrée` → champ suivant** :
  - Cibler les champs : **Nom, Prénom, N° Pièce, Montant** (pas *Notes*).
  - Tester sur **tablette + navigateur utilisé en caisse** (ex. Chrome Android).
