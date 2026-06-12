# 2026-06-12 — Validation instantanée (contrôle local + écriture async) — Décision

## ✅ Décision validée avec Bryan
Au clic « VÉRIFIER ET VALIDER », **dissocier le contrôle de l'écriture** : le contrôle
doublon (A/B/C) se fait **en local** (cache déjà chargé) → réponse **instantanée** ;
l'enregistrement se fait **en arrière-plan**. Contexte : **une seule tablette** saisit
(la concurrence multi-appareils n'existe pas en pratique).

## 🔧 Ce qui a été fait (`Index.html`)
- `analyserDoublonLocal()` : **miroir** de `traiterSaisie` (Cas A/B/C, modes SIGNALER/
  BLOQUANT, messages) calculé sur `cacheVerif.offre`.
- `envoyerSaisie()` : si pas de doublon → message + reset **immédiats**, **cache
  optimiste** (`ajoutOptimisteCache`), puis `traiterSaisie` **en arrière-plan**.
- `forcerAjout()` : idem (instantané + `forcerSaisie` async).
- `chargerCacheVerif` (Code.gs) enrichi : `piece` (brute) + `notes` par ligne.

## 🛡️ Garde-fous (importants)
- **Le serveur reste AUTORITAIRE** : l'écriture passe par `traiterSaisie`, qui
  **reconfirme** le doublon **et** écrit (sous verrou). → **Aucun faux négatif** même
  si le portage local A/B/C avait un bug.
- **Désaccord serveur** (doublon manqué en local) → alerte « saisie NON enregistrée,
  à ressaisir » + `rechargerCacheVerif()`.
- **Échec réseau** de l'écriture → même alerte (pas de perte silencieuse).
- **Cache optimiste** : la saisie suivante est correcte sans attendre l'écriture.

## 💸 Dette assumée
- **Logique A/B/C dupliquée** (client `analyserDoublonLocal` **et** serveur
  `traiterSaisie`). **À garder synchro** si on modifie la détection. Le serveur reste
  la source de vérité.

## 📌 Pour les autres assistants
- Ne pas « simplifier » l'écriture serveur en simple append : c'est `traiterSaisie`
  (avec recontrôle) qui garantit l'absence de faux négatif.
- Déployé en prod le 2026-06-12 (même URL, @33).
