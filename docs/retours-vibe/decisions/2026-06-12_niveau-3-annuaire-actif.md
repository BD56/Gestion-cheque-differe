# 2026-06-12 — Niveau 3 : annuaire inter-offres — Décision (implémenté + ACTIVÉ)

## ✅ Décision validée avec Bryan
Auto-complétion du **Nom/Prénom** à partir du **N° de pièce**, pour les clients déjà
venus lors d'**offres précédentes**. Activé en prod (l'app n'était pas en service au
moment de la mise en place — moment propre).

## 🔧 Ce qui a été fait
**Serveur (`Code.gs`)** — feuille cachée **`_Annuaire`** (Pièce, Nom, Prénom, DerniereVue) :
- `majAnnuaire_` : upsert après chaque saisie réussie (met à jour Nom/Prénom + date).
- `chercherAnnuaire_` : lecture (utilisée par `verifierPiece` **si la pièce n'est PAS sur
  l'offre en cours**).
- `reconstruireAnnuaire()` : (re)construit depuis « Saisies » + toutes les `Archives_*`.
- `purgerAnnuaire()` : supprime les entrées **inactives depuis 3 ans** (à mettre sur trigger).
- `getModeAnnuaire` / `basculerModeAnnuaire` : réglage **B/C** dans `PropertiesService`.
- **Kill-switch** : `ANNUAIRE_ACTIF` (true = actif). `getInfosPanneau` renvoie l'état + le mode.

**Client (`Index.html`)** :
- Au `blur` du N° : si connu d'une offre passée → **option C** (pré-remplissage doux +
  indice discret, défaut) ou **option B** (modale « Utiliser / Ignorer »).
- Réglage B/C dans le Panneau ⚙️ (bouton visible seulement si l'annuaire est actif).
- Mention légale « Historique inter-offres » (conservation 3 ans) + section d'aide.

## 🛡️ Garde-fous
- **Store NON autoritaire** : ne bloque/ne décide rien. La détection A/B/C reste sur
  « Saisies » (source de vérité). Règle métier : profiter à **chaque** offre est autorisé.
- **RGPD** : données déjà détenues (index dérivé des archives), invisible pour le client,
  **purge glissante 3 ans**, mention légale ajoutée. Conservation comptée **depuis la
  dernière utilisation**.
- Don't auto-remplir si conflit de noms : non implémenté (latest gagne) — la vérif
  document + validation A/B/C couvrent ce cas.

## 📌 Pour les autres assistants
- **Données chiffrées** : ~27 % de clients récurrents (≈ 1 saisie sur 3 concernée).
- **Désactiver** = `ANNUAIRE_ACTIF = false` (coupe tout).
- Après une activation : **lancer `reconstruireAnnuaire()` une fois** + trigger sur `purgerAnnuaire`.
- Déployé en prod le 2026-06-12 (même URL, @31).
