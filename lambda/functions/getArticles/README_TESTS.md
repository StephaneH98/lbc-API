# Tests pour la Lambda getArticles

## 🧪 Méthodes de test

### Méthode 1 : Script Bash interactif (Recommandé)

```bash
cd lambda/functions/getArticles
chmod +x test_lambda.sh
./test_lambda.sh
```

Ou exécuter un test spécifique :
```bash
./test_lambda.sh 1    # Test LIST
./test_lambda.sh 2    # Test GET article 1
./test_lambda.sh all  # Tous les tests
```

---

### Méthode 2 : Console AWS Lambda

Allez sur la console AWS Lambda et sélectionnez la fonction `getArticles`.

Cliquez sur l'onglet **Test** et utilisez les événements ci-dessous :

---

#### TEST 1 : LIST - Récupérer tous les articles

**Nom de l'événement de test** : `test-list-articles`

```json
{
  "queryStringParameters": null
}
```

**Résultat attendu :**
- Liste de tous les articles avec métadonnées
- Tableau de toutes les catégories
- Total d'articles

---

#### TEST 2 : GET - Récupérer un article spécifique

**Nom de l'événement de test** : `test-get-article-1`

```json
{
  "queryStringParameters": {
    "filename": "investir sans apport.json"
  }
}
```

**Résultat attendu :**
- Contenu complet de l'article
- Toutes les sections, FAQ, articles liés
- Métadonnées complètes

---

#### TEST 3 : GET - Article "Location meublée vs nue"

**Nom de l'événement de test** : `test-get-article-2`

```json
{
  "queryStringParameters": {
    "filename": "meuble vs nu.json"
  }
}
```

---

#### TEST 4 : GET - Article "Cash-flow positif"

**Nom de l'événement de test** : `test-get-article-3`

```json
{
  "queryStringParameters": {
    "filename": "cashflow positif.json"
  }
}
```

---

#### TEST 5 : GET - Fichier inexistant (Test d'erreur)

**Nom de l'événement de test** : `test-error-not-found`

```json
{
  "queryStringParameters": {
    "filename": "article-inexistant.json"
  }
}
```

**Résultat attendu :**
- Erreur 500
- Message : "Article non trouvé: article-inexistant.json"

---

### Méthode 3 : AWS CLI

#### Test LIST
```bash
aws lambda invoke \
  --function-name getArticles \
  --region eu-west-3 \
  --payload '{"queryStringParameters": null}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json | jq '.body | fromjson'
```

#### Test GET
```bash
aws lambda invoke \
  --function-name getArticles \
  --region eu-west-3 \
  --payload '{"queryStringParameters": {"filename": "investir sans apport.json"}}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json | jq '.body | fromjson'
```

---

### Méthode 4 : Test via API Gateway (après configuration)

Une fois l'API Gateway configuré, vous pourrez tester avec curl :

#### LIST tous les articles
```bash
curl -X GET "https://VOTRE-API-ID.execute-api.eu-west-3.amazonaws.com/article"
```

#### GET un article spécifique
```bash
curl -X GET "https://VOTRE-API-ID.execute-api.eu-west-3.amazonaws.com/article?filename=investir%20sans%20apport.json"
```

---

## 📋 Vérifications à effectuer

Pour chaque test, vérifiez :

### Pour LIST (Test 1) :
- ✅ `success: true`
- ✅ Array `articles` contenant tous les articles
- ✅ Array `categories` avec toutes les catégories uniques
- ✅ `total` correspond au nombre d'articles
- ✅ Les articles sont triés par date (plus récent en premier)
- ✅ Chaque article contient : id, title, slug, category, excerpt, featured_image, published_at, reading_time, author, filename

### Pour GET (Tests 2-4) :
- ✅ `success: true`
- ✅ Objet `article` avec le contenu complet
- ✅ `content.introduction` présent
- ✅ `content.sections` array avec toutes les sections
- ✅ `content.conclusion` présent
- ✅ `content.faq` array (si présent dans le JSON)
- ✅ `author` avec name, role, avatar
- ✅ `seo` avec meta_title, meta_description, keywords
- ✅ `related_articles` (si présent)

### Pour erreur (Test 5) :
- ✅ `statusCode: 500`
- ✅ `success: false`
- ✅ Message d'erreur approprié

---

## 🔍 Analyse des logs

Pour voir les logs détaillés de la Lambda :

```bash
aws logs tail /aws/lambda/getArticles --region eu-west-3 --follow
```

Ou dans la console AWS :
1. Aller dans CloudWatch
2. Logs > Log groups
3. Chercher `/aws/lambda/getArticles`
4. Voir les derniers logs

---

## 📊 Exemples de réponses

### Réponse LIST (extrait)
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "articles": [
      {
        "id": "art_007",
        "title": "La stratégie du cash-flow positif : comment l'appliquer en 2025 ?",
        "slug": "strategie-cash-flow-positif-2025",
        "category": ["stratégie", "rentabilité"],
        "excerpt": "En 2025, générer un cash-flow positif est plus crucial...",
        "featured_image": {...},
        "published_at": "2025-01-15T08:00:00Z",
        "reading_time": 25,
        "author": {...},
        "filename": "cashflow positif.json"
      }
    ],
    "categories": ["débutant", "financement", "gestion locative", "rentabilité", "stratégie"],
    "total": 10
  }
}
```

### Réponse GET (structure)
```json
{
  "statusCode": 200,
  "body": {
    "success": true,
    "article": {
      "id": "art_001",
      "title": "...",
      "content": {
        "introduction": "<p>...</p>",
        "sections": [...],
        "conclusion": "<p>...</p>",
        "faq": [...]
      },
      "author": {...},
      "seo": {...},
      "related_articles": [...]
    }
  }
}
```

---

## ⚠️ Prérequis

Avant de tester, assurez-vous que :

1. ✅ La Lambda `getArticles` est déployée
2. ✅ Le bucket S3 `bucket-test-new-app` existe
3. ✅ Les fichiers JSON sont dans `s3://bucket-test-new-app/data/`
4. ✅ Le rôle Lambda a les permissions S3 :
   - `s3:GetObject`
   - `s3:ListBucket`

### Vérifier les articles dans S3
```bash
aws s3 ls s3://bucket-test-new-app/data/ --region eu-west-3
```

### Copier les articles locaux vers S3
```bash
aws s3 cp data/ s3://bucket-test-new-app/data/ --recursive --region eu-west-3
```

---

## 🐛 Dépannage

### Erreur : "NoSuchBucket"
```bash
# Créer le bucket si nécessaire
aws s3 mb s3://bucket-test-new-app --region eu-west-3
```

### Erreur : "AccessDenied"
Vérifier les permissions IAM du rôle Lambda :
```bash
aws iam get-role --role-name lambda-saveSearch-execution-role
```

### Erreur : "NoSuchKey"
Vérifier que les fichiers existent dans S3 :
```bash
aws s3 ls s3://bucket-test-new-app/data/ --region eu-west-3
```

---

## 📞 Support

Pour toute question ou problème :
1. Vérifier les logs CloudWatch
2. Tester avec les événements de test ci-dessus
3. Vérifier les permissions S3
4. Vérifier que les fichiers JSON sont valides
