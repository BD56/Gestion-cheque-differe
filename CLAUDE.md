# Gestion Chèques Différés

> **Le document de référence (canonique) de ce projet est [`AGENTS.md`](AGENTS.md).**
> Il vaut pour **tous** les assistants (Claude, Mistral Vibe, …) et contient :
> architecture, logique métier, état actuel (OCR dormant), pistes/tâches, et la
> synchronisation. **Lis `AGENTS.md` en priorité.**
>
> Le **style de travail attendu** (général à tous les projets de Bryan) est dans le
> dépôt **`guide-assistant`**.
>
> Pour la mise en production (copier-coller + même URL) : [`DEPLOIEMENT.md`](DEPLOIEMENT.md).
>
> **Reprise de travail (branches `generalisation`, `refonte`, `design` — travail en cours sur `design`)** : lire aussi
> [`MEMOIRE_CLAUDE.md`](MEMOIRE_CLAUDE.md) — état, décisions, points à vérifier, tests.

## L'essentiel en 3 lignes
- App **Google Apps Script** anti-fraude (chèques différés, Carrefour Vannes) ;
  saisie sur tablette, adossée à un Google Sheets. But : **détecter doublons /
  usurpations**.
- **Garde-fou clé :** la feuille **« Saisies » est l'unique source de vérité** ; un
  **faux négatif** (doublon manqué) est le pire échec.
- **Posture :** discuter et faire valider **avant** de coder ; honnêteté/contradiction
  bienvenues ; vérifier au lieu de supposer ; ne jamais casser la prod.
