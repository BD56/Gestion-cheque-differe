# Installation pour une nouvelle structure

> Procédure pour installer l'application chez une **autre structure** (autre
> magasin, autre offre). Pour **mettre à jour** une installation existante (ex.
> Carrefour Vannes), voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).
>
> ⚖️ Rappel (mentions légales) : tout déploiement par un tiers nécessite
> l'**accord écrit préalable de l'auteur** (DESJARDINS Bryan).

Durée : ~15 minutes. Il faut un **compte Google** pour la structure (c'est lui qui
« possède » les données et sous lequel l'application tourne).

## Étape 1 — Créer le classeur et coller le code
1. Avec le compte Google de la structure, créer un **Google Sheets vierge**
   (ex. « Gestion Chèques — Magasin X »).
2. Menu **Extensions → Apps Script**.
3. Dans l'éditeur, créer **3 fichiers** et y coller le contenu **intégral** du
   dépôt (bouton *Raw* sur GitHub) :

   | Fichier GitHub | Dans l'éditeur Apps Script |
   |---|---|
   | `Code.gs` | le fichier `Code.gs` déjà présent (remplacer tout) |
   | `Index.html` | **+ → HTML**, nommé `Index` |
   | `Panneau.html` | **+ → HTML**, nommé `Panneau` |

4. Manifeste : **Paramètres du projet (⚙️) → cocher « Afficher le fichier manifeste
   appsscript.json »**, puis remplacer son contenu par celui de `appsscript.json`.
5. **Enregistrer** (Cmd/Ctrl+S).

## Étape 2 — Lancer l'installation (une seule fois)
1. En haut de l'éditeur, choisir la fonction **`installer`** puis **Exécuter**.
2. Google demande des **autorisations** : les accepter (compte de la structure).
   *(« Google n'a pas validé cette application » → Paramètres avancés → Accéder au
   projet : c'est normal pour un script personnel.)*
3. Le journal affiche ce qui a été créé :
   - la feuille **« Saisies »** (+ « _Annuaire », masquée) ;
   - le **déclencheur de nuit** (clôture automatique de l'offre) ;
   - le **déclencheur de purge** de l'annuaire (conservation 3 ans).

   On peut relancer `installer` sans risque : il ne crée que ce qui manque et
   n'écrase jamais rien.

## Étape 3 — Déployer l'application web
1. **Déployer → Nouveau déploiement** → type **Application Web**.
2. **Exécuter en tant que : Moi** — **Qui a accès : Tous les utilisateurs disposant
   d'un compte Google**.
3. **Déployer** → copier l'**URL** (`…/exec`). C'est l'adresse à ouvrir sur la tablette.
4. Pour les mises à jour suivantes, **toujours modifier ce déploiement** (même URL),
   voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).

## Étape 4 — Premier réglage (sur la tablette)
1. Ouvrir l'URL sur la tablette (connectée à un compte Google).
2. **⚙️ → Espace responsable** : l'application demande de **créer le code
   responsable** (4 à 8 chiffres). À ne communiquer qu'aux responsables.
3. **🏷️ Réglages de la structure** :
   - **Nom de la structure, avec l'article** (ex. « l'Hypermarché X », « la société Y ») :
     il apparaît dans les mentions légales (« L'auteur concède à … »).
   - **Nom de l'offre** (sous le titre), **titre de l'onglet**.
   - **Libellé du montant** et **montant obligatoire ou non** (devise : euro).
   - **Libellé / précision du champ Notes**.
4. **📅 Opération en cours** : saisir les dates de début et de fin de l'offre.
   Le formulaire de saisie s'ouvre pendant ces dates.

C'est tout : **tout se fait ensuite dans l'application** (saisie, impression,
corrections, archives, clôture). Le Google Sheets ne sert que de stockage.

## Bon à savoir
- **Code responsable oublié** : ouvrir le Google Sheets → panneau ⚙️ (à droite) →
  **Réinitialiser le code responsable** (réservé aux personnes ayant accès au fichier).
- Les boutons « Voir jour / Toute l'offre » du **panneau du Sheet** utilisent des
  onglets `A_IMPRIMER` / `OFFRE_COMPLETE` propres à l'installation d'origine : une
  nouvelle structure n'en a pas besoin (l'impression se fait dans l'application).
- **Ne pas modifier** le Google Sheets à la main : passer par l'application
  (⚙️ → Espace responsable → Corriger / supprimer). Si quelqu'un le fait quand même,
  la détection de doublon (`onEdit`) reste active en filet de sécurité.
