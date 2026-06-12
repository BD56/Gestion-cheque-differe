# 2026-06-12 — Pré-chargement de la vérif N2/N3 (vitesse) — Décision (implémenté)

## ✅ Décision validée avec Bryan
Rendre la vérification au `blur` du N° de pièce **instantanée** (la latence venait de
l'aller-retour Apps Script, pas des données).

## 🔧 Ce qui a été fait
- **Serveur (`Code.gs`) : `chargerCacheVerif()`** renvoie, en un appel au chargement,
  les pièces de **l'offre en cours** (N2) + **l'annuaire** (N3) + mode + modeAnnuaire.
- **Client (`Index.html`)** :
  - au **chargement** de la page → on récupère ce cache (`cacheVerif`) ;
  - au `blur` du N° → vérif **100 % locale** (filtrage en mémoire) → **instantané**,
    plus d'aller-retour ;
  - **rafraîchissement** : au retour sur la page (`visibilitychange`) et **après chaque
    saisie** (normale ou forcée) ;
  - **repli serveur** (`verifierPiece`) si le cache n'est pas encore prêt.

## 🛡️ Garde-fous
- La **validation finale reste serveur/live** (`traiterSaisie`) → autoritaire. Même si
  le cache est légèrement périmé (autre caisse), **aucun doublon ne passe**.
- **Arbitrage assumé (RGPD)** : le pré-chargement met **l'annuaire en mémoire de la
  tablette**. Acceptable pour une tablette en magasin (de confiance) ; à surveiller si
  l'annuaire devient très volumineux (sinon, revenir à une recherche serveur par `blur`).

## 📌 Pour les autres assistants
- Ne pas confondre **cache de vérif** (confort, non autoritaire) et **décision A/B/C**
  (toujours serveur, sur « Saisies »).
- Déployé en prod le 2026-06-12 (même URL, @32).

## Addendum (même jour, @34) — re-synchro au focus du N°
Après la « validation instantanée », le cache n'était plus re-fetché entre deux saisies
(seulement **ajout optimiste local**) → il ne captait pas un changement **externe** (ex.
édition directe dans le Sheet). Ajout d'un **fetch au `focus` du champ N°** : le cache se
**re-synchronise au début de chaque saisie**, l'appel chevauchant la frappe (pas de
latence perçue). Rappel : la sécurité reste garantie par le **recontrôle serveur à
l'écriture**, indépendamment de la fraîcheur du cache.
