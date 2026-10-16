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
- Le **manager de caisse** installe et **détient** le Google Sheets et l'application,
  **avec un compte Google du MAGASIN** (ex. « direction.magasinX@… »), **pas** avec
  son compte personnel : les données clients restent au magasin quand le manager
  change de poste ou part à la retraite (voir « Changement de manager » plus bas).
  Ce compte est celui de la direction / du manager, **pas** celui de l'équipe de la
  caisse centrale.
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
- L'application se protège par **un seul compte du magasin** (identifiant + mot de
  passe), le même sur tous les appareils : la **caisse centrale**, qui a la confiance
  de la direction, connecte chaque appareil. Puis par un **code responsable
  obligatoire** pour l'espace responsable : **code commun** ou **codes personnels**
  (un par personne : le journal note qui a fait quoi). Les appareils **n'ont besoin
  d'aucun compte Google**.

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
   - saisir le **code d'activation** (étape 2), puis créer le **compte du magasin** :
     identifiant (ex. « Caisse centrale ») et mot de passe (8 caractères au moins,
     deux fois) → **Créer le compte**. Accepter que le navigateur enregistre le mot de
     passe. Sans le code d'activation, personne ne peut créer ce compte, même avec le
     lien ;
   - l'application fait ensuite **choisir le code responsable** (obligatoire, aucun
     choix par défaut) : **un code commun** (6 chiffres, connu de l'équipe) ou **des
     codes personnels** (votre nom + votre code ; les autres personnes s'ajoutent
     ensuite dans ⚙️ → Code & compte). Si un code existe déjà (Sheet déjà en service),
     elle le signale : il reste demandé (le changer : Code & compte, avec ce code ;
     inconnu : panneau du Sheet → « Réinitialiser le code responsable ») ;
   - **chaque autre appareil** (tablettes des hôtesses comprises) : ouvrir le même lien
     et se connecter avec **le même compte** (identifiant + mot de passe) ;
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

## Changement de manager (départ, mutation, retraite)

> **Le mieux, de loin : un compte Google du magasin.** Le Google Sheets et
> l'application appartiennent alors au magasin, pas à une personne : au départ du
> manager, **rien à transférer, rien à redéployer**, l'adresse des tablettes ne change
> pas. Un transfert depuis un compte personnel, lui, comporte des étapes techniques
> qu'il est facile d'oublier, et un risque de **tout perdre**.

### Cas 1 (recommandé) : le Sheet est sur un compte Google du magasin
À la création du compte (une seule fois) :
- adresse au nom du magasin ou de la fonction (ex. « direction.magasinX@… »), jamais
  au nom d'une personne ;
- **téléphone et adresse de récupération du magasin** (pas ceux du manager) ;
- si la validation en deux étapes est activée : téléphone du magasin, et **codes de
  secours imprimés** rangés au coffre avec le mot de passe.

Au départ du manager :
1. Remettre le mot de passe (et les codes de secours) au successeur.
2. Le successeur **change aussitôt le mot de passe**, vérifie le téléphone et
   l'adresse de récupération, et contrôle la liste des personnes qui peuvent
   modifier le Sheet (bouton **Partager**) : direction / manager seulement.

C'est tout : même propriétaire, même application, même robot de nuit, même adresse
`/exec` sur les tablettes, journal et empreintes intacts.

### Cas 2 : le Sheet est sur le compte PERSONNEL du manager
⚠️ **À faire AVANT son départ** : si le compte propriétaire est supprimé, le Sheet
(saisies, archives, journal) est supprimé avec lui.

**Avant de partir — l'ancien manager** (dans le Google Sheets) :
1. Menu **🚀 APPLICATION → 🔁 Passer la main** → **Oui**. Ses robots de nuit sont
   supprimés et la fenêtre rappelle la suite.
2. Bouton **Partager** (en haut à droite) → ajouter le successeur comme **Éditeur**
   s'il n'y est pas → sur sa ligne, **Transférer la propriété**.

**En arrivant — le successeur** :
3. Accepter l'**e-mail de Google** (« … souhaite vous transférer la propriété »).
4. Ouvrir le Google Sheets → menu **🚀 APPLICATION → 🧰 Installer** → accepter les
   autorisations. Ses robots de nuit sont créés.
5. Si c'est l'ancien manager qui avait mis l'application en ligne : *Extensions →
   Apps Script → Déployer → Gérer les déploiements* → crayon → *Version* : **Nouvelle
   version** → **Déployer** (même geste qu'une mise à jour ; l'adresse des tablettes
   ne change pas).
6. **Partager** → retirer l'ancien manager.

Le lendemain, ouvrir l'espace responsable (⚙️) : aucun message « robot de nuit » ne
doit apparaître. Rien d'autre à faire : les données, les comptes et mots de passe de
l'application, les codes responsables, le journal et les réglages suivent le Sheet.

**Oublis** : « Passer la main » oublié → sans danger (voir l'annexe) ; étape 4 oubliée
→ l'espace responsable recrée les robots à sa prochaine ouverture ; étape 5 oubliée →
**l'application s'arrêtera** quand l'ancien compte perdra l'accès (à faire alors).

#### Annexe technique (pour en savoir plus)
- **Ce que Google permet** (aide Google Drive, « Transférer la propriété ») : d'un
  compte personnel vers un autre compte personnel, avec **acceptation** du nouveau
  propriétaire (e-mail, ou recherche `pendingowner:me` dans Drive ; l'ancien reste
  propriétaire tant que ce n'est pas accepté) ; d'un compte personnel vers un compte
  professionnel ou scolaire : **non** ; entre comptes d'une même organisation Google
  Workspace : oui (ou par l'administrateur, avant de supprimer le compte) ; vers une
  autre organisation : **non**. Transfert impossible ⇒ le successeur crée une
  **nouvelle installation** à partir du modèle.
- **Ce qui ne suit pas le transfert** : les **robots de nuit** (déclencheurs)
  appartiennent au compte qui les a créés ; **seul ce compte peut les supprimer**
  (d'où « Passer la main », à faire tant qu'il a accès). Oubliés, ils continuent de
  tourner sous l'ancien compte : le robot passe alors deux fois par nuit, **sans
  danger** (le second passage ne trouve plus rien à clôturer ni à purger ; journal
  vérifié et purgé sous verrou). Une fois l'accès retiré, ils échouent chaque nuit
  (sans effet sur les données ; Google envoie des e-mails d'erreur à l'ancien compte)
  et disparaissent avec la suppression de ce compte. Pour les supprimer quand même :
  redonner l'accès quelques minutes à l'ancien compte, qui les supprime (Apps Script
  → Déclencheurs, icône réveil → ⋮ → Supprimer le déclencheur).
- **Le compte sous lequel tourne l'application** : avec « Exécuter en tant que :
  Moi », c'est celui de **la personne qui l'a déployée**, pas forcément le
  propriétaire. Les déploiements et l'adresse `…/exec` restent après le transfert
  (constaté le 16/10/2026). Pour savoir sous quel compte elle tourne : faire une
  saisie, puis dans le Sheet clic droit sur la cellule → **Afficher l'historique des
  modifications**.
- **Plusieurs comptes Google dans le même navigateur** : *Extensions → Apps Script*
  peut s'ouvrir avec le mauvais compte (« Impossible d'ouvrir le fichier pour le
  moment »). Utiliser une **fenêtre de navigation privée** connectée au seul bon
  compte.

## Bon à savoir
- **Départ du manager** (propriétaire du Sheet) : voir « Changement de manager »
  ci-dessus.
- **Départ d'un membre de la caisse centrale, appareil perdu ou volé** : ⚙️ → Code &
  compte → **Mot de passe** du compte du magasin : tous les appareils sont déconnectés,
  les reconnecter avec le nouveau. Codes personnels : retirer la personne qui part ;
  code commun : le changer.
- **Mot de passe** : 8 caractères au moins. Après une erreur il faut patienter 10 s ;
  à partir de 10 erreurs, la connexion est bloquée 5, puis 10, puis 15 min (jamais
  plus) ; les appareils déjà connectés continuent. Un blocage apparaît dans les
  « Changements récents » de l'espace responsable.
- **Code responsable** (obligatoire) : 6 chiffres, pause de 10 s après une erreur,
  blocage 15 min après 5 ; le changer dans ⚙️ → Code & compte.
- **Codes personnels** (au lieu d'un code commun, pour savoir QUI a fait quoi) : ⚙️ →
  Code & compte → « Codes personnels ». Chaque membre de la caisse centrale choisit
  son nom puis tape SON code, sur n'importe quel appareil ; le journal note son nom.
  Ajouter quelqu'un : son nom, puis la personne tape elle-même son code devant vous.
  Départ ou code oublié : la retirer (et la rajouter).
- **Plus aucun accès** : ouvrir le Google Sheets → panneau ⚙️ (à droite), réservé aux
  personnes ayant accès au fichier. **Réinitialiser le code responsable** (code
  oublié) : un nouveau code est choisi à la prochaine ouverture de l'espace
  responsable — le faire tout de suite sur un appareil de la caisse centrale.
  **Réinitialiser le compte** (mot de passe oublié) : le compte et le code sont
  retirés, un **code d'activation** s'affiche et l'application revient à la
  « Première installation ».
- **Journal des actions** : onglet masqué « _Journal » du Google Sheets (clic droit sur
  la barre des onglets → afficher). Qui a supprimé, corrigé, forcé une saisie, changé un
  réglage, les dates, le mode, le compte ou le code — avec la date à la seconde.
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
