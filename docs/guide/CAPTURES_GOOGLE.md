# Captures d'écran Google à faire (Bryan)

Sur le **Sheet de test**, avec un compte sans donnée réelle. Masquer avant envoi :
adresses e-mail, identifiants de fichiers (`/d/…`), adresse `/exec`, code
d'activation. Format : PNG, fenêtre du navigateur seule (pas tout l'écran).
Nom du fichier = le nom indiqué ci-dessous.

Pour les captures 03 et 04, il faut une **copie neuve** (premier « Installer », premier
« Nouveau déploiement ») : refaire une copie du modèle et la supprimer ensuite.

| N° | Fichier | Chapitre | Ce qu'on doit voir |
|---|---|---|---|
| 1 | `02-copier.png` | Copier le modèle | la fenêtre « Copier le document » (champ Nom, bouton « Créer une copie ») |
| 2 | `03-menu.png` | Installer | le menu 🚀 APPLICATION ouvert (4 entrées) |
| 3 | `03-autorisation-1.png` … `-5.png` | Installer | chaque écran d'autorisation : « Autorisation requise », choix du compte, « Google n'a pas validé cette application » (avec « Paramètres avancés » déplié), cases à cocher s'il y en a, bouton « Autoriser » |
| 4 | `03-compte-rendu.png` | Installer | la fenêtre « 🧰 Installation » avec le code d'activation (code masqué) |
| 5 | `04-extensions.png` | Mettre en ligne | menu Extensions ouvert, « Apps Script » visible |
| 6 | `04-deployer.png` | Mettre en ligne | bouton « Déployer » ouvert, « Nouveau déploiement » visible |
| 7 | `04-type.png` | Mettre en ligne | roue dentée ouverte, « Application Web » visible |
| 8 | `04-formulaire.png` | Mettre en ligne | formulaire rempli : Exécuter en tant que « Moi », Qui a accès « Tout le monde » |
| 9 | `04-url.png` | Mettre en ligne | écran final : URL de l'application Web (masquée) et bouton « Copier » |
| 10 | `04-gerer.png` | Mettre en ligne (et guide technique) | « Gérer les déploiements » avec le crayon |
| 11 | `06-ecran-accueil-ipad.png` | Autres appareils | iPad, Safari, menu Partager avec « Sur l'écran d'accueil » |
| 12 | `06-ecran-accueil-android.png` | Autres appareils | Android, Chrome, menu ⋮ avec « Ajouter à l'écran d'accueil » (si un appareil Android est disponible) |
| 13 | `08-partager.png` | Vérifier | fenêtre « Partager » du Sheet (noms masqués) |
| 14 | `annexe-historique.png` | Annexe | Fichier → Historique des versions |

Les écrans de **l'application** (première installation, choix du code, connexion,
réglages, opération, alerte fraude) sont faits par Claude : `node outils/captures.js`.
