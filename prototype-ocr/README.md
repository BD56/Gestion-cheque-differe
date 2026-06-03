# Prototype OCR — bande MRZ

Banc d'essai **isolé** pour valider la lecture de la zone MRZ des pièces
d'identité françaises (passeport, nouvelle CNI, ancienne CNI, titre de séjour)
**avant** toute intégration dans l'application principale.

- Tout se passe **dans le navigateur** : aucune image n'est envoyée à un serveur.
- OCR : **Tesseract.js** (charset restreint à la MRZ + binarisation simple).
- Parsing/validation : librairie **`mrz`** (gère TD1, TD3 et l'ancienne CNI FR,
  avec vérification des *check digits*).
- Ce dossier est exclu du `clasp push` (voir `.claspignore`) : il ne part jamais
  sur Apps Script.

## Comment l'essayer

### Import / photo (marche partout)
Double-clique `index.html` (ou ouvre-le dans un navigateur), onglet
**« Importer / Photo »**, choisis une photo de la pièce → **Analyser**.

### Caméra live
`getUserMedia` exige un **contexte sécurisé** : ça ne marche **pas** en `file://`.
Sers le dossier en local :

```bash
cd prototype-ocr
python3 -m http.server 8000
```

puis ouvre `http://localhost:8000` et utilise l'onglet **« Caméra »**.

## Conseils de prise de vue

- Cadrer surtout le **bas du document** (la MRZ), bien à plat, net, bien éclairé.
- Si la MRZ n'est pas captée, **décocher « Rogner le bas »** et recadrer.
- Le badge ✅ / ⚠️ indique si les *check digits* valident la lecture.

## Limites connues (prototype)

- Précision OCR moyenne avec le modèle `eng` par défaut. Levier d'amélioration
  prévu : traineddata spécifique **MRZ/OCR-B** + recadrage via `mrz-detection`.
- Pas encore de détection automatique de la zone MRZ (recadrage manuel via la case).
