# Mettre en ligne

C'est l'étape la plus technique, mais elle ne se fait **qu'une fois**. Elle donne
l'**adresse de l'application**, celle que vous ouvrirez sur les tablettes. Suivez
chaque clic.

Dans **votre copie** du Google Sheets, sur l'ordinateur :

1. Menu **Extensions → Apps Script**. Un nouvel onglet s'ouvre : c'est le programme
   de l'application. **Ne modifiez rien** dedans.
2. En haut à droite, cliquez sur le bouton bleu **Déployer**, puis sur **Nouveau
   déploiement**.
3. À gauche, à côté de « Sélectionner le type », cliquez sur la **roue dentée ⚙️**,
   puis sur **Application Web**.
4. **Description** : écrivez « Application » (au choix, sans importance).
5. **Exécuter en tant que** : choisissez **Moi** (l'adresse du compte du magasin
   s'affiche à côté).
6. **Qui a accès** : choisissez **Tout le monde**.
   *Pourquoi « Tout le monde » ? Pour que les tablettes n'aient pas besoin de compte
   Google. L'application reste fermée : sans le compte du magasin (identifiant et mot
   de passe), elle n'affiche rien.*
7. Cliquez sur **Déployer**. Si Google redemande une autorisation, faites comme au
   chapitre « Installer ».
8. Google affiche « Nouveau déploiement ». Sous **Application Web**, l'**URL** finit
   par `/exec` : cliquez sur **Copier**, puis sur **OK**.
9. Envoyez-vous cette adresse (e-mail au magasin, note) : c'est **l'adresse de
   l'application**.

> 📷 **Capture** : le bouton « Déployer » ouvert (« Nouveau déploiement »).
> 📷 **Capture** : le choix du type (roue dentée → « Application Web »).
> 📷 **Capture** : le formulaire rempli (Moi / Tout le monde).
> 📷 **Capture** : l'écran final avec l'URL et le bouton « Copier » (adresse masquée).

> ⚠️ **À ne pas faire plus tard** : ne refaites **jamais** un « Nouveau
> déploiement » : il créerait une **autre adresse**, et les tablettes ne
> l'auraient pas. Les mises à jour passent par **Gérer les déploiements** (voir le
> guide technique).

> **Si ça ne marche pas**
> - *« Impossible d'ouvrir le fichier pour le moment »* en ouvrant Apps Script :
>   plusieurs comptes Google sont ouverts dans ce navigateur. Utilisez une **fenêtre
>   de navigation privée**, connectée seulement au compte du magasin.
> - *« Tout le monde » n'est pas proposé* (seulement « Tout le monde dans … ») : le
>   compte du magasin dépend d'une organisation dont l'administrateur limite ce choix.
>   Demandez-lui de l'autoriser, ou utilisez un compte Google ordinaire (Gmail).
> - *Adresse perdue* : **Déployer → Gérer les déploiements** l'affiche de nouveau
>   (ne créez pas de nouveau déploiement).
