# Lambda Function: Save Search Results

## Description
Cette fonction Lambda enregistre les résultats de recherche immobilière (vente + location) dans S3, avec un accès restreint par utilisateur.

## Fonctionnalités
- ✅ Validation du payload (username, timestamp, data)
- ✅ Validation du format email pour le username
- ✅ Sauvegarde dans S3 avec structure organisée par utilisateur
- ✅ Tags S3 pour restriction d'accès
- ✅ Métadonnées enrichies
- ✅ Gestion d'erreurs complète
- ✅ Support CORS

## Structure S3
```
s3://bucket-test-new-app/
└── users/
    └── {username}/
        └── searches/
            ├── 2025-10-17_16-30-00.json
            ├── 2025-10-18_10-15-30.json
            └── ...
```

## Payload attendu

### Requête
```http
POST /save-search
Content-Type: application/json
Authorization: Bearer {idToken}

{
    "username": "user@example.com",
    "timestamp": "2025-10-17T16:30:00.000Z",
    "data": {
        "vente": [
            {
                "titre": "Appartement T3",
                "prix": "180000",
                "localisation": "Perpignan 66000",
                "url": "https://...",
                ...
            }
        ],
        "location": [
            {
                "titre": "Studio meublé",
                "prix": "550 € / mois",
                "localisation": "Perpignan 66000",
                "url": "https://...",
                ...
            }
        ],
        "stats": {
            "totalVente": 35,
            "totalLocation": 28,
            "totalCombine": 63
        }
    }
}
```

### Réponse (Succès)
```json
{
    "success": true,
    "message": "Recherche enregistrée avec succès",
    "file": {
        "bucket": "bucket-test-new-app",
        "key": "users/user@example.com/searches/2025-10-17_16-30-00.json",
        "url": "s3://bucket-test-new-app/users/user@example.com/searches/2025-10-17_16-30-00.json",
        "size": 12345
    },
    "summary": {
        "total_vente": 35,
        "total_location": 28,
        "total_combined": 63
    }
}
```

### Réponse (Erreur)
```json
{
    "success": false,
    "message": "Format de username invalide (email attendu)"
}
```

## Variables d'environnement

| Variable | Description | Valeur par défaut |
|----------|-------------|-------------------|
| `BUCKET_NAME` | Nom du bucket S3 | `bucket-test-new-app` |

## Permissions IAM requises

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectTagging"
            ],
            "Resource": [
                "arn:aws:s3:::bucket-test-new-app/users/*"
            ]
        }
    ]
}
```

## Déploiement

### 1. Créer un package de déploiement
```bash
cd lambda/functions/saveSearch
pip install -r requirements.txt -t .
zip -r function.zip .
```

### 2. Créer la Lambda dans AWS
```bash
aws lambda create-function \
  --function-name saveSearch \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler save_search.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables={BUCKET_NAME=bucket-test-new-app}
```

### 3. Configurer l'API Gateway
- Méthode: `POST /save-search`
- Intégration: Lambda Proxy
- CORS: Activé
- Autorisation: Cognito User Pool (optionnel)

## Test local

```bash
python save_search.py
```

Le script contient un exemple de test à la fin du fichier.

## Logs CloudWatch

Les logs incluent :
- 📦 Payload reçu
- 👤 Username
- 📊 Nombre d'annonces (vente/location)
- 📄 Nom de fichier généré
- ✅ URL S3 du fichier sauvegardé
- ❌ Erreurs détaillées

## Sécurité

### Tags S3
Chaque fichier est tagué avec :
- `owner={username}` : Email du propriétaire
- `type=search-results` : Type de données

### Politique S3 recommandée
Utilisez une politique S3 pour restreindre l'accès aux fichiers par utilisateur :

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::bucket-test-new-app/users/${aws:userid}/*",
            "Condition": {
                "StringEquals": {
                    "s3:ExistingObjectTag/owner": "${aws:userid}"
                }
            }
        }
    ]
}
```

## Codes d'erreur HTTP

| Code | Description |
|------|-------------|
| 200 | Succès |
| 400 | Payload invalide |
| 500 | Erreur interne |

## Support

Pour toute question ou problème, consultez les logs CloudWatch de la fonction Lambda.
