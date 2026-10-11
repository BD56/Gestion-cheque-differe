# Installation pour une nouvelle structure (modèle à copier)

> Pour **mettre à jour** une installation existante (ex. Carrefour Vannes) ou le
> modèle lui-même, voir [`DEPLOIEMENT.md`](DEPLOIEMENT.md).
>
> ⚖️ Rappel (mentions légales) : tout déploiement par un tiers nécessite
> l'**accord écrit préalable de l'auteur** (DESJARDINS Bryan). Le code est visible
> dans la copie de la structure (c'est le fonctionnement de Google Apps Script).

Principe : un **classeur modèle vierge** contient déjà tout le code. Une nouvelle
structure le **copie**, clique sur **Installer**, **déploie**, et c'est prêt.
Aucun copier-coller de code.

---

## A. Créer le modèle (Bryan, UNE SEULE FOIS)
1. Sur ton compte Google, créer un **Google Sheets vierge** nommé par exemple
   **« MODÈLE — Gestion Chèques Différés (ne pas utiliser) »**.
2. **Extensions → Apps Script**, puis créer les fichiers et y coller le contenu
   **intégral** du dépôt (bouton *Raw* sur GitHub) :

   | Fichier GitHub | Dans l'éditeur Apps Script |
   |---|---|
   | `Code.gs` | le fichier `Code.gs` déjà présent (remplacer tout) |
   | `Index.html` | **+ → HTML**, nommé `Index` |
   | `Panneau.html` | **+ → HTML**, nommé `Panneau` |
   | `appsscript.json` | ⚙️ Paramètres du projet → cocher « Afficher le fichier manifeste », puis remplacer son contenu |

3. **Enregistrer**, revenir au classeur et **le recharger** (F5).
4. Menu **🚀 APPLICATION → 🧰 Installer / vérifier l'installation** → accepter les
   autorisations. *(« Google n'a pas validé cette application » → Paramètres avancés
   → Accéder au projet : normal pour un script personnel.)*
   Ça crée la feuille « Saisies » et **marque** le modèle (voir « Sécurité » plus bas).
5. **Partager** le modèle : *Partager → Accès général → « Tous les utilisateurs
   disposant du lien » → Lecteur*.
6. Le **lien à donner aux structures** : celui du modèle, en remplaçant la fin
   `/edit…` par **`/copy`** :
   ```
   https://docs.google.com/spreadsheets/d/<ID-DU-MODÈLE>/copy
   ```
   Ce lien ne change jamais.

### ⛔ Règles pour le modèle
- Il reste **vierge pour toujours** : **ne pas le déployer**, ne pas ouvrir son
  application, ne rien y saisir (ni code responsable, ni dates, ni réglages).
- Pour faire des essais : **faire une copie** et tester sur la copie.
- À chaque nouvelle version du code : **mettre à jour le modèle** (voir
  [`DEPLOIEMENT.md`](DEPLOIEMENT.md)). Les copies déjà faites ne sont **pas** mises à
  jour automatiquement.

---

## B. Installer pour une nouvelle structure (~5 minutes)
Avec le **compte Google de la structure** (c'est lui qui possède les données) :

1. Ouvrir le **lien `/copy`** → **Créer une copie** (renommer, ex. « Gestion Chèques —
   Magasin X »). Le code est copié avec le classeur.
2. Dans la copie : menu **🚀 APPLICATION → 🧰 Installer / vérifier l'installation** →
   accepter les autorisations. Ça crée ce qui manque (feuilles, **clôture automatique
   de nuit**, **purge de l'annuaire**) et efface tout réglage hérité du modèle.
   *(Si le menu n'apparaît pas : recharger la page.)*
3. **Mettre l'application en ligne** : *Extensions → Apps Script → **Déployer** →
   **Nouveau déploiement*** → type **Application Web** :
   - **Exécuter en tant que : Moi**
   - **Qui a accès : Tous les utilisateurs disposant d'un compte Google**

   → **Déployer** → copier l'**URL** (`…/exec`) : c'est l'adresse de la tablette.
   *(C'est la seule étape que Google ne permet pas d'automatiser simplement.)*
4. **Sur la tablette**, ouvrir l'URL puis **⚙️ → Espace responsable** :
   - **créer le code responsable** (4 à 8 chiffres, réservé aux responsables) ;
   - tuile **🏷️ Réglages** : nom de la structure **avec l'article**
     (« l'Hypermarché X », « la société Y » — lu « L'auteur concède à … »), nom de
     l'offre, titre de l'onglet, libellé et caractère obligatoire du montant (euro),
     libellé et précision du champ Notes ;
   - tuile **📅 Opération** : dates de début et de fin de l'offre.

C'est tout : **tout se fait ensuite dans l'application** (saisie, impression,
corrections, archives, clôture). Le Google Sheets ne sert que de stockage.

---

## Sécurité : pourquoi « Installer » efface les réglages d'une copie
Les réglages (code responsable, dates, réglages de la structure) sont stockés dans
le classeur et **marqués avec son identifiant**. Si Google les recopie lors d'une
copie, l'application le détecte (identifiant différent) et **les efface** : une
nouvelle structure ne peut pas hériter du code responsable ou des réglages de
quelqu'un d'autre. Les **données** (feuilles) ne sont jamais effacées.
Ce nettoyage a lieu à l'installation ou à la première ouverture de l'application
— jamais sur un classeur déjà installé.

## Bon à savoir
- **Code responsable oublié** : ouvrir le Google Sheets → panneau ⚙️ (à droite) →
  **Réinitialiser le code responsable** (réservé aux personnes ayant accès au fichier).
- **Ne pas modifier** le Google Sheets à la main : passer par l'application
  (⚙️ → Espace responsable → tuile 📋 Saisies). Si quelqu'un le fait quand même,
  la détection de doublon (`onEdit`) reste active en filet de sécurité.
- Les boutons « Voir jour / Toute l'offre » du **panneau du Sheet** utilisent des
  onglets `A_IMPRIMER` / `OFFRE_COMPLETE` propres à l'installation d'origine : une
  nouvelle structure n'en a pas besoin (l'impression se fait dans l'application).
