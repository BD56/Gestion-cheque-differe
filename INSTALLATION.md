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
   *(Ça crée aussi les robots de nuit et affiche un code d'activation : sans effet sur
   un modèle vide, à ignorer. Les copies n'héritent ni des robots ni du code.)*
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

### Qui fait quoi (règle de sécurité, à respecter)
- Le **manager de caisse** installe et **détient** le Google Sheets et l'application.
  De préférence sur un **compte Google du magasin** (ex. une adresse « caisse
  centrale ») plutôt que sur son compte personnel : les données clients restent au
  magasin si le manager change de poste.
- L'**équipe de caisse** ne reçoit **que le lien de l'application** (adresse en
  `…/exec`), **jamais** le lien du Google Sheets.
- Le manager **ne se connecte jamais avec ce compte Google sur une tablette de
  caisse** : sinon, depuis la tablette, on pourrait ouvrir le Sheet et se passer de
  l'application.
- **Qui peut modifier le Google Sheets peut tout faire** (et le propriétaire, celui qui
  a créé la copie, n'est arrêté par aucune protection) : ne donner ce droit qu'à la
  direction / au manager, **jamais** à l'équipe de la caisse centrale. Garde-fous posés
  par « Installer » : un **avertissement** avant toute modification à la main de
  « Saisies » (fausse manipulation) ; le **journal des actions** (onglet masqué
  `_Journal`) est à **empreintes** : une ligne modifiée ou effacée à la main est
  signalée chaque nuit dans l'espace responsable et le panneau du Sheet, jusqu'à ce
  que la direction la marque comme vue (après avoir regardé Fichier → Historique des
  versions, qui nomme l'auteur).
- L'application se protège par des **comptes** (identifiant + mot de passe) : ceux de
  la (des) **caisse(s) centrale(s)**, qui a la confiance de la direction. Les
  caissiers n'ont pas de compte : la caisse centrale connecte leur appareil quand il
  le faut. Les appareils **n'ont besoin d'aucun compte Google**.

Avec le **compte Google qui détiendra les données** (voir ci-dessus) :

1. Ouvrir le **lien `/copy`** → **Créer une copie** (renommer, ex. « Gestion Chèques —
   Magasin X »). Le code est copié avec le classeur.
2. Dans la copie : menu **🚀 APPLICATION → 🧰 Installer / vérifier l'installation** →
   accepter les autorisations. Ça crée ce qui manque (feuilles, **clôture automatique
   de nuit**, **purge de l'annuaire** ; les archives sont supprimées 3 ans après la
   clôture de l'offre) et efface tout réglage hérité du modèle.
   Le compte rendu affiche un **code d'activation** (8 chiffres, valable 24 h) : le
   noter pour l'étape 4. *(Expiré ? Menu 🚀 APPLICATION → 🔑 Code d'activation, tant
   qu'aucun compte n'existe.)*
   *(Si le menu n'apparaît pas : recharger la page.)*
3. **Mettre l'application en ligne** : *Extensions → Apps Script → **Déployer** →
   **Nouveau déploiement*** → type **Application Web** :
   - **Exécuter en tant que : Moi**
   - **Qui a accès : Tout le monde** *(sans compte Google : ce sont les comptes de
     l'application, étape 4, qui protègent l'accès)*

   → **Déployer** → copier l'**URL** (`…/exec`) : c'est l'adresse de la tablette.
   *(C'est la seule étape que Google ne permet pas d'automatiser simplement.)*
4. **Sur l'appareil de la caisse centrale**, ouvrir l'URL : l'écran **« Première
   installation »** s'affiche.
   - saisir le **code d'activation** (étape 2), puis créer le **compte de la caisse
     centrale** : identifiant (ex. « Caisse centrale 1 ») et mot de passe (8 caractères
     au moins, deux fois) → **Créer le compte**. Accepter que le navigateur enregistre
     le mot de passe. Sans le code d'activation, personne ne peut créer ce compte, même
     avec le lien ;
   - l'application demande ensuite s'il faut **protéger l'espace responsable par un
     code à part** (6 chiffres) : sans code, tout compte connecté l'ouvre. Si un code
     existe déjà (Sheet déjà en service), elle le signale : il reste demandé (le
     changer : Code & comptes, avec ce code ; inconnu : panneau du Sheet →
     « Réinitialiser le code responsable ») ;
   - **chaque autre appareil** : ouvrir le même lien et se connecter (identifiant +
     mot de passe). D'autres comptes se créent dans **⚙️ → Code & comptes** ;
   - sans connexion, l'application ne montre **rien**, même avec le lien. La connexion
     se termine chaque nuit à 3 h.
5. Puis **⚙️ → Espace responsable** :
   - tuile **🏷️ Réglages** : nom de la structure **avec l'article**
     (« l'Hypermarché X », « la société Y » — lu « L'auteur concède à … »), nom de
     l'offre, titre de l'onglet, libellé et caractère obligatoire du montant (euro),
     libellé et précision du champ Notes, **passages autorisés par client et par offre**
     (1 par défaut = un seul chèque par client ; jusqu'à 10) ;
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
- **Départ d'un membre de la caisse centrale, appareil perdu ou volé** : ⚙️ → Code &
  comptes → **Mot de passe** (changer celui du compte : ses connexions ouvertes sont
  terminées) ou **Retirer** le compte. Changer aussi le code responsable s'il existe.
- **Mot de passe** : 8 caractères au moins. Après une erreur il faut patienter 10 s ;
  5 erreurs bloquent CE compte 15 min (les autres comptes ne sont pas touchés).
- **Code responsable** (facultatif) : 6 chiffres, mêmes protections ; le choisir, le
  changer ou le retirer dans ⚙️ → Code & comptes.
- **Codes personnels** (au lieu d'un code commun, pour savoir QUI a fait quoi) : ⚙️ →
  Code & comptes → « Codes personnels ». Chaque membre de la caisse centrale choisit
  son nom puis tape SON code, quel que soit le compte connecté ; le journal note son
  nom. Ajouter quelqu'un : son nom, puis la personne tape elle-même son code devant
  vous. Départ ou code oublié : la retirer (et la rajouter).
- **Plus aucun accès** (mots de passe oubliés) : ouvrir le Google Sheets → panneau ⚙️
  (à droite) → **Réinitialiser les comptes** (réservé aux personnes ayant accès au
  fichier) : tous les comptes et le code sont retirés, un **code d'activation**
  s'affiche et l'application revient à la « Première installation ». **Réinitialiser
  le code responsable** n'efface que le code (code oublié).
- **Journal des actions** : onglet masqué « _Journal » du Google Sheets (clic droit sur
  la barre des onglets → afficher). Qui a supprimé, corrigé, forcé une saisie, changé un
  réglage, les dates, le mode, les comptes ou le code — avec la date à la seconde.
  Gardé 12 mois. Ne pas le modifier : il sert de contrôle.
- **Mode SIGNALER / BLOQUANT** : il est **conservé** d'une offre à l'autre (la clôture
  ne le change pas).
- **Navigateur** : la connexion est gardée par le navigateur jusqu'à 3 h du matin.
  Safari (Mac) et tous les navigateurs d'iPad / iPhone l'oublient quand on les ferme :
  il faut se reconnecter, le gestionnaire de mots de passe remplit les champs. Ouvrir
  toujours l'adresse `…/exec` (favori, écran d'accueil), jamais une adresse
  `…googleusercontent.com` proposée par l'historique.
- **Ne pas modifier** le Google Sheets à la main : passer par l'application
  (⚙️ → Espace responsable → tuile 📋 Saisies). Si quelqu'un le fait quand même,
  la détection de doublon (`onEdit`) reste active en filet de sécurité.
- Les boutons « Voir jour / Toute l'offre » du **panneau du Sheet** utilisent des
  onglets `A_IMPRIMER` / `OFFRE_COMPLETE` propres à l'installation d'origine : une
  nouvelle structure n'en a pas besoin (l'impression se fait dans l'application).
