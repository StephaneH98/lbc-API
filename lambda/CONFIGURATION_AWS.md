# 📋 Configuration AWS Lambda - Guide Complet

Ce guide détaille tous les champs à configurer dans AWS Lambda et API Gateway pour chaque fonction.

---

## 🔧 Configuration Lambda - getUserSearches

### Paramètres Généraux

**Navigation:** Lambda → Functions → getUserSearches → Configuration → General configuration

| Champ | Valeur | Description |
|-------|--------|-------------|
| **Function name** | `getUserSearches` | Nom de la fonction |
| **Runtime** | `Python 3.11` | Version de Python |
| **Architecture** | `x86_64` | Architecture (ou arm64 pour plus de performance) |
| **Handler** | `lambda_function.lambda_handler` | Point d'entrée (avec wrapper) |
|  | OU `get_user_searches.lambda_handler` | Point d'entrée (sans wrapper) |
| **Memory** | `256 MB` | Mémoire allouée |
| **Timeout** | `30 seconds` | Timeout maximum |
| **Ephemeral storage** | `512 MB` | Stockage temporaire (par défaut) |

### Variables d'Environnement

**Navigation:** Configuration → Environment variables → Edit

| Key | Value | Description |
|-----|-------|-------------|
| **BUCKET_NAME** | `bucket-test-new-app` | Nom du bucket S3 |

### Permissions IAM

**Navigation:** Configuration → Permissions → Execution role

La Lambda a besoin des permissions suivantes:

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
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

---

## 🔧 Configuration Lambda - saveSearch

### Paramètres Généraux

| Champ | Valeur | Description |
|-------|--------|-------------|
| **Function name** | `saveSearch` | Nom de la fonction |
| **Runtime** | `Python 3.11` | Version de Python |
| **Architecture** | `x86_64` | Architecture |
| **Handler** | `lambda_function.lambda_handler` | Point d'entrée (avec wrapper) |
|  | OU `save_search.lambda_handler` | Point d'entrée (sans wrapper) |
| **Memory** | `256 MB` | Mémoire allouée |
| **Timeout** | `30 seconds` | Timeout maximum |

### Variables d'Environnement

| Key | Value | Description |
|-----|-------|-------------|
| **BUCKET_NAME** | `bucket-test-new-app` | Nom du bucket S3 |

### Permissions IAM

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
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:*:*"
        }
    ]
}
```

---

## 🌐 Configuration API Gateway - getUserSearches

### 1. Créer la Ressource

**Navigation:** API Gateway → Votre API → Resources → Actions → Create Resource

| Champ | Valeur |
|-------|--------|
| **Resource Name** | `user-searches` |
| **Resource Path** | `/user-searches` |
| **Enable API Gateway CORS** | ✅ Cocher |

### 2. Créer la Méthode GET

**Navigation:** Ressource `/user-searches` → Actions → Create Method → GET

| Champ | Valeur |
|-------|--------|
| **Integration type** | `Lambda Function` |
| **Use Lambda Proxy integration** | ✅ Cocher (IMPORTANT) |
| **Lambda Region** | `eu-west-3` (votre région) |
| **Lambda Function** | `getUserSearches` |
| **Use Default Timeout** | ✅ Cocher |

### 3. Configurer les Query Parameters

**Navigation:** GET → Method Request → URL Query String Parameters

| Name | Required | Caching |
|------|----------|---------|
| `username` | ✅ Yes | ❌ No |

### 4. Activer CORS

**Navigation:** Ressource `/user-searches` → Actions → Enable CORS

| Champ | Valeur |
|-------|--------|
| **Access-Control-Allow-Origin** | `*` |
| **Access-Control-Allow-Headers** | `Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token` |
| **Access-Control-Allow-Methods** | `GET,OPTIONS` |

### 5. Configurer l'Autorisation (Optionnel)

**Navigation:** GET → Method Request → Authorization

| Champ | Valeur |
|-------|--------|
| **Authorization** | `Cognito User Pool` |
| **Cognito User Pool Authorizer** | Créer ou sélectionner |
| **Token Source** | `Authorization` |

### 6. Déployer l'API

**Navigation:** Actions → Deploy API

| Champ | Valeur |
|-------|--------|
| **Deployment stage** | `prod` |
| **Stage name** | `prod` |
| **Deployment description** | `Add getUserSearches endpoint` |

### 7. Récupérer l'URL

**Navigation:** Stages → prod → `/user-searches` → GET

**Invoke URL:** Copier l'URL complète, par exemple:
```
https://xxxxxxxxxx.execute-api.eu-west-3.amazonaws.com/prod/user-searches
```

---

## 🌐 Configuration API Gateway - saveSearch

### 1. Créer la Ressource

| Champ | Valeur |
|-------|--------|
| **Resource Name** | `save-search` |
| **Resource Path** | `/save-search` |
| **Enable API Gateway CORS** | ✅ Cocher |

### 2. Créer la Méthode POST

**Navigation:** Ressource `/save-search` → Actions → Create Method → POST

| Champ | Valeur |
|-------|--------|
| **Integration type** | `Lambda Function` |
| **Use Lambda Proxy integration** | ✅ Cocher |
| **Lambda Region** | `eu-west-3` |
| **Lambda Function** | `saveSearch` |

### 3. Activer CORS

| Champ | Valeur |
|-------|--------|
| **Access-Control-Allow-Origin** | `*` |
| **Access-Control-Allow-Headers** | `Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token` |
| **Access-Control-Allow-Methods** | `POST,OPTIONS` |

---

## 🔍 Vérification de la Configuration

### Test Lambda

**Navigation:** Lambda → Functions → getUserSearches → Test

**Événement de test:**
```json
{
    "queryStringParameters": {
        "username": "test@example.com"
    }
}
```

**Réponse attendue:**
```json
{
    "statusCode": 200,
    "body": "{\"success\":true,\"username\":\"test@example.com\",\"files\":[],\"count\":0}"
}
```

### Test API Gateway

**Navigation:** API Gateway → Ressource → GET → Test

**Query Strings:**
```
username=test@example.com
```

**Réponse attendue:**
```json
{
    "success": true,
    "username": "test@example.com",
    "files": [],
    "count": 0
}
```

---

## 🐛 Résolution des Problèmes Courants

### Erreur: "No module named 'lambda_function'"

**Cause:** Handler mal configuré

**Solutions:**

1. **Option A - Modifier le Handler:**
   - Configuration → General configuration → Edit
   - Handler: `get_user_searches.lambda_handler` (au lieu de `lambda_function.lambda_handler`)

2. **Option B - Utiliser le wrapper (DÉJÀ FAIT):**
   - Les fichiers `lambda_function.py` ont été créés
   - Re-déployer avec `./deploy.sh`
   - Le handler `lambda_function.lambda_handler` fonctionnera

### Erreur: "Missing Authentication Token"

**Cause:** API non déployée ou route incorrecte

**Solution:**
- Actions → Deploy API
- Vérifier l'URL de l'API

### Erreur: CORS

**Cause:** Headers CORS manquants

**Solution:**
- Sélectionner la ressource
- Actions → Enable CORS
- Enable CORS and replace existing CORS headers

### Erreur 403: "User is not authorized"

**Cause:** Token Cognito invalide ou manquant

**Solution:**
- Vérifier que le token est envoyé dans le header `Authorization: Bearer {token}`
- Vérifier que l'authorizer Cognito est configuré correctement

### Erreur 500: "Internal Server Error"

**Cause:** Erreur dans le code Lambda

**Solution:**
- Consulter CloudWatch Logs
- Lambda → Monitor → View logs in CloudWatch

---

## 📝 Checklist de Configuration

### getUserSearches

- [ ] Lambda créée avec Runtime Python 3.11
- [ ] Handler configuré (`lambda_function.lambda_handler` ou `get_user_searches.lambda_handler`)
- [ ] Variable d'environnement `BUCKET_NAME` définie
- [ ] Permissions S3 (ListBucket, GetObject, HeadObject) accordées
- [ ] function.zip uploadé
- [ ] Ressource API Gateway `/user-searches` créée
- [ ] Méthode GET avec Lambda Proxy activée
- [ ] Query parameter `username` configuré
- [ ] CORS activé
- [ ] API déployée sur stage `prod`
- [ ] URL de l'API récupérée et ajoutée à `env-config.js`
- [ ] Test réussi

### saveSearch

- [ ] Lambda créée avec Runtime Python 3.11
- [ ] Handler configuré
- [ ] Variable d'environnement `BUCKET_NAME` définie
- [ ] Permissions S3 (PutObject, PutObjectTagging) accordées
- [ ] function.zip uploadé
- [ ] Ressource API Gateway `/save-search` créée
- [ ] Méthode POST avec Lambda Proxy activée
- [ ] CORS activé
- [ ] API déployée sur stage `prod`
- [ ] Test réussi

---

## 🔗 Liens Utiles

- [AWS Lambda Console](https://console.aws.amazon.com/lambda)
- [API Gateway Console](https://console.aws.amazon.com/apigateway)
- [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home#logsV2:log-groups)
- [S3 Console](https://s3.console.aws.amazon.com/s3)
- [Cognito Console](https://console.aws.amazon.com/cognito)

---

## 📞 Support

Pour toute question, consultez :
- [lambda/DEPLOIEMENT.md](DEPLOIEMENT.md) - Guide de déploiement
- [lambda/README.md](README.md) - Vue d'ensemble
- Les README de chaque fonction dans `functions/*/README.md`
