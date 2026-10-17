# Annexe : les données

## Ce qui est enregistré, et où
Tout est rangé dans **votre** Google Sheets, sur le compte Google du magasin :

| Quoi | Où | Combien de temps |
|---|---|---|
| Saisies de l'offre en cours (pièce, nom, prénom, montant, notes) | onglet **Saisies** | jusqu'à la clôture de l'offre |
| Saisies des offres clôturées | onglets « Archives_… » | **3 ans** après la clôture, puis supprimées par le robot de nuit |
| Anciens clients (pièce → nom et prénom, pour pré-remplir) | onglet masqué `_Annuaire` | **3 ans** après le dernier passage |
| Journal des actions (qui a supprimé, corrigé, forcé, réglé…) | onglet masqué `_Journal` | **12 mois** |

## Qui peut voir les données
- Dans l'**application** : seulement les appareils connectés au compte du magasin.
  L'espace responsable demande en plus le code responsable.
- Dans le **Google Sheets** : seulement les personnes que vous avez ajoutées avec le
  bouton **Partager**. Gardez cette liste courte : direction / manager.
- L'auteur de l'application n'y a **pas** accès.

## Vos obligations (RGPD)
Le magasin est **responsable du traitement** des données : information des clients,
durée de conservation, accès. L'auteur ne fournit que l'outil. Les durées ci-dessus
sont appliquées automatiquement par le robot de nuit.

## Les protections en place
- **Compte du magasin** et **code responsable** : jamais enregistrés en clair.
  Erreurs répétées : attente, puis blocage de quelques minutes.
- **Connexion limitée** : elle se termine chaque nuit à 3 h.
- **Avertissement** avant toute modification à la main de l'onglet **Saisies**
  (contre les fausses manipulations).
- **Journal à empreintes** : une ligne du journal modifiée ou effacée à la main est
  repérée la nuit et signalée dans l'espace responsable et dans le panneau du Google
  Sheets, jusqu'à ce que la direction la marque comme vue. (Pour savoir qui l'a
  modifiée : Google Sheets → **Fichier → Historique des versions**.)
- **Changements récents des accès** : en bas de la vue d'ensemble de l'espace
  responsable, les changements de mot de passe, de code ou de personnes des 2
  derniers jours.
