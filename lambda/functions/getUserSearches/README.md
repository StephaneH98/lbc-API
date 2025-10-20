# Lambda Function: Get User Searches

## Description
Cette fonction Lambda récupère la liste des recherches enregistrées pour un utilisateur spécifique depuis S3.

## Fonctionnalités
- ✅ Récupération des fichiers par username
- ✅ Métadonnées enrichies (taille, date de modification, nombre d'annonces)
- ✅ Tri par date de modification (plus récent en premier)
- ✅ Support GET avec query parameters
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

## API

### Requête
```http
GET /user-searches?username=user@example.com
Authorization: Bearer {idToken}
```

### Réponse (Succès)
```json
{
    "success": true,
    "username": "user@example.com",
    "count": 3,
    "files": [
        {
            "name": "2025-10-18_10-15-30.json",
            "key": "users/user@example.com/searches/2025-10-18_10-15-30.json",
            "size": 12345,
            "last_modified": "2025-10-18T10:15:30.000Z",
            "ads_count": 63,
            "url": "s3://bucket-test-new-app/users/user@example.com/searches/2025-10-18_10-15-30.json"
        },
        {
            "name": "2025-10-17_16-30-00.json",
            "key": "users/user@example.com/searches/2025-10-17_16-30-00.json",
            "size": 10234,
            "last_modified": "2025-10-17T16:30:00.000Z",
            "ads_count": 45,
            "url": "s3://bucket-test-new-app/users/user@example.com/searches/2025-10-17_16-30-00.json"
        }
    ]
}
```

### Réponse (Aucun fichier)
```json
{
    "success": true,
    "username": "user@example.com",
    "count": 0,
    "files": []
}
```

### Réponse (Erreur)
```json
{
    "success": false,
    "message": "Paramètre \"username\" requis"
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
                "s3:ListBucket",
                "s3:GetObject",
                "s3:HeadObject"
            ],
            "Resource": [
                "arn:aws:s3:::bucket-test-new-app",
                "arn:aws:s3:::bucket-test-new-app/users/*"
            ]
        }
    ]
}
```

## Déploiement

### 1. Créer un package de déploiement

**⚠️ IMPORTANT**: N'installez PAS les dépendances directement dans le dossier de la fonction !

Utilisez le script de déploiement fourni qui installe les dépendances dans un dossier temporaire :

```bash
cd lambda/functions/getUserSearches
chmod +x deploy.sh
./deploy.sh
```

Le script va :
- ✅ Créer un dossier temporaire `build_temp/`
- ✅ Copier les fichiers sources
- ✅ Installer les dépendances dans ce dossier temporaire
- ✅ Créer `function.zip`
- ✅ Nettoyer le dossier temporaire
- ✅ Ne PAS polluer votre dépôt Git

**Alternative manuelle** (si le script ne fonctionne pas):
```bash
cd lambda/functions/getUserSearches

# Créer un dossier temporaire
mkdir build_temp
cp get_user_searches.py build_temp/
cp requirements.txt build_temp/

# Installer les dépendances dans le dossier temporaire
pip install -r requirements.txt -t build_temp/

# Créer le zip
cd build_temp
zip -r ../function.zip .
cd ..

# Nettoyer
rm -rf build_temp
```

### 2. Créer la Lambda dans AWS
```bash
aws lambda create-function \
  --function-name getUserSearches \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler get_user_searches.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment Variables={BUCKET_NAME=bucket-test-new-app}
```

### 3. Configurer l'API Gateway
- Méthode: `GET /user-searches`
- Intégration: Lambda Proxy
- CORS: Activé
- Autorisation: Cognito User Pool (recommandé)
- Query String: `username` (required)

## Test local

```bash
python get_user_searches.py
```

Le script contient un exemple de test à la fin du fichier.

## Logs CloudWatch

Les logs incluent :
- 👤 Username
- 🔍 Préfixe S3 utilisé
- ✅ Fichiers trouvés avec nombre d'annonces
- 📊 Total de fichiers
- ❌ Erreurs détaillées

## Sécurité

### Restriction d'accès recommandée
Il est recommandé de vérifier que l'utilisateur authentifié (via Cognito) ne peut accéder qu'à ses propres fichiers :

```python
# Dans une version sécurisée, ajouter :
cognito_username = event['requestContext']['authorizer']['claims']['email']
if cognito_username != username:
    return {
        'statusCode': 403,
        'body': json.dumps({
            'success': False,
            'message': 'Accès refusé'
        })
    }
```

## Codes d'erreur HTTP

| Code | Description |
|------|-------------|
| 200 | Succès (même si aucun fichier) |
| 400 | Paramètre username manquant |
| 403 | Accès refusé (si validation Cognito activée) |
| 500 | Erreur interne |

## Utilisation depuis le frontend

```javascript
// Récupérer l'email de l'utilisateur connecté
const userEmail = CONFIG.getCurrentUser();

// Appeler l'API
const response = await fetch(
    `${CONFIG.getApiUrl('GET_USER_SEARCHES')}?username=${encodeURIComponent(userEmail)}`,
    {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${CONFIG.getAuthToken()}`
        }
    }
);

const data = await response.json();

if (data.success) {
    console.log(`${data.count} fichier(s) trouvé(s)`);
    displayFiles(data.files);
}
```

## Support

Pour toute question ou problème, consultez les logs CloudWatch de la fonction Lambda.
