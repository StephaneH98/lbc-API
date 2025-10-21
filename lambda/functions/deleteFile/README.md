# Lambda Function: deleteFile

## Description
Cette fonction Lambda supprime un fichier de recherche depuis S3.

## Payload attendu

```json
{
    "username": "user@example.com",
    "filename": "2025-10-21_09-15-23-242.json"
}
```

## Paramètres

- **username** (string, requis): Email de l'utilisateur
- **filename** (string, requis): Nom du fichier à supprimer (doit être un fichier .json)

## Réponse succès

```json
{
    "success": true,
    "message": "Fichier 2025-10-21_09-15-23-242.json supprimé avec succès",
    "filename": "2025-10-21_09-15-23-242.json"
}
```

## Réponse erreur

```json
{
    "success": false,
    "message": "Description de l'erreur"
}
```

## Codes de statut HTTP

- **200**: Suppression réussie
- **400**: Paramètres manquants ou invalides
- **404**: Fichier non trouvé
- **500**: Erreur serveur

## Configuration AWS Lambda

### Variables d'environnement
```
BUCKET_NAME=bucket-test-new-app
```

### Permissions IAM requises
```json
{
    "Effect": "Allow",
    "Action": [
        "s3:DeleteObject",
        "s3:HeadObject"
    ],
    "Resource": "arn:aws:s3:::bucket-test-new-app/users/*/searches/*"
}
```

### Configuration recommandée
- **Runtime**: Python 3.11
- **Timeout**: 30 secondes
- **Memory**: 128 MB
- **Handler**: lambda_function.lambda_handler

## Déploiement

1. Créer le package:
```bash
./deploy.sh
```

2. Uploader vers AWS Lambda:
```bash
aws lambda update-function-code \
  --function-name deleteFile \
  --zip-file fileb://function.zip
```

Ou via la console AWS Lambda.

## Sécurité

- Validation du format email pour le username
- Validation du format filename (seuls les fichiers .json sont acceptés)
- Vérification de l'existence du fichier avant suppression
- Protection contre les path traversal attacks
