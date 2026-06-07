# 2026-06-07 — `Entrée` → champ suivant — À faire

## 💡 Idée
Implémenter une navigation fluide au clavier dans `Index.html` :
- Appuyer sur `Entrée` dans un champ **passe automatiquement au champ suivant**.

---

## ✅ Pourquoi ?
- **Gain de temps** pour les caissières (~1-2 sec/saisie).
- **Expérience utilisateur** plus intuitive (comportement standard des formulaires).

---

## 📌 Détails techniques (à valider)
- **Champs concernés** : Nom, Prénom, N° Pièce, Montant.
- **Exclusion** : Champ *Notes* (comportement différent).
- **Implémentation** :
  - Écouteur d’événement `keydown` sur chaque champ.
  - Si `key === "Enter"`, appeler `.focus()` sur le champ suivant.

---

## ⚠️ À vérifier avant implémentation
- [ ] Compatibilité avec **tablette + navigateur en caisse**.
- [ ] Pas d’interférence avec la **soumission du formulaire** (bouton "Valider").
- [ ] Comportement cohérent si un champ est **vide**.

---

## 🗂 Liens
- Fichier concerné : [`Index.html`](https://github.com/BD56/Gestion-cheque-differe/blob/main/Index.html)
- Discussion initiale : [AGENTS.md (Niveau 1)](https://github.com/BD56/Gestion-cheque-differe/blob/main/AGENTS.md#pistes-discutées)
