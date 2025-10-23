# 🧪 Tests pour Lambda getArticles - Console AWS

## Comment tester dans la console AWS Lambda

1. Allez sur [AWS Lambda Console](https://eu-west-3.console.aws.amazon.com/lambda/home?region=eu-west-3#/functions)
2. Cliquez sur la fonction **getArticles**
3. Allez dans l'onglet **Test**
4. Créez un nouvel événement de test
5. Copiez-collez l'un des événements ci-dessous
6. Cliquez sur **Test**

---

## ✅ TEST 1 : LIST - Récupérer tous les articles

**Nom de l'événement** : `test-list-all-articles`

```json
{
  "queryStringParameters": null
}
```

### Résultat attendu :
```json
{
  "statusCode": 200,
  "headers": {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  "body": {
    "success": true,
    "articles": [
      {
        "id": "art_007",
        "title": "La stratégie du cash-flow positif...",
        "filename": "cashflow positif.json",
        ...
      }
    ],
    "categories": ["débutant", "financement", "gestion locative", "rentabilité", "stratégie"],
    "total": 10
  }
}
```

---

## ✅ TEST 2 : GET - Article "Investir sans apport"

**Nom de l'événement** : `test-get-investir-sans-apport`

```json
{
  "queryStringParameters": {
    "filename": "investir sans apport.json"
  }
}
```

### Résultat attendu :
- Article complet avec toutes les sections
- Contenu HTML dans `content.introduction`, `content.sections`, `content.conclusion`
- FAQ présente
- Articles liés

---

## ✅ TEST 3 : GET - Article "Meublé vs Nu"

**Nom de l'événement** : `test-get-meuble-vs-nu`

```json
{
  "queryStringParameters": {
    "filename": "meuble vs nu.json"
  }
}
```

---

## ✅ TEST 4 : GET - Article "Cash-flow positif"

**Nom de l'événement** : `test-get-cashflow`

```json
{
  "queryStringParameters": {
    "filename": "cashflow positif.json"
  }
}
```

---

## ✅ TEST 5 : GET - Article "Erreur débutant"

**Nom de l'événement** : `test-get-erreur-debutant`

```json
{
  "queryStringParameters": {
    "filename": "erreur débutant.json"
  }
}
```

---

## ✅ TEST 6 : GET - Article "Bien choisir premier bien"

**Nom de l'événement** : `test-get-premier-bien`

```json
{
  "queryStringParameters": {
    "filename": "bien choirir premier bien.json"
  }
}
```

---

## ✅ TEST 7 : GET - Article "Combien épargner"

**Nom de l'événement** : `test-get-combien-epargner`

```json
{
  "queryStringParameters": {
    "filename": "combien epargner.json"
  }
}
```

---

## ✅ TEST 8 : GET - Article "Négocier son prêt"

**Nom de l'événement** : `test-get-negocier-pret`

```json
{
  "queryStringParameters": {
    "filename": "negocier son pret.json"
  }
}
```

---

## ✅ TEST 9 : GET - Article "Ancien vs Neuf"

**Nom de l'événement** : `test-get-ancien-vs-neuf`

```json
{
  "queryStringParameters": {
    "filename": "ancien vs neuf.json"
  }
}
```

---

## ✅ TEST 10 : GET - Article "Viager"

**Nom de l'événement** : `test-get-viager`

```json
{
  "queryStringParameters": {
    "filename": "viager.json"
  }
}
```

---

## ✅ TEST 11 : GET - Article "Où investir"

**Nom de l'événement** : `test-get-ou-investir`

```json
{
  "queryStringParameters": {
    "filename": "ou investir.json"
  }
}
```

---

## ❌ TEST 12 : Erreur - Fichier inexistant

**Nom de l'événement** : `test-error-not-found`

```json
{
  "queryStringParameters": {
    "filename": "article-inexistant.json"
  }
}
```

### Résultat attendu :
```json
{
  "statusCode": 500,
  "body": {
    "success": false,
    "message": "Erreur interne: Article non trouvé: article-inexistant.json"
  }
}
```

---

## 📊 Vérifications après chaque test

### Pour TEST LIST (Test 1) :
- ✅ `statusCode` = 200
- ✅ `success` = true
- ✅ `articles` est un array de 10 éléments
- ✅ `categories` contient : ["débutant", "financement", "gestion locative", "rentabilité", "stratégie"]
- ✅ `total` = 10
- ✅ Chaque article a : id, title, slug, category, excerpt, filename

### Pour TEST GET (Tests 2-11) :
- ✅ `statusCode` = 200
- ✅ `success` = true
- ✅ `article` contient le contenu complet
- ✅ `article.content.introduction` présent
- ✅ `article.content.sections` est un array
- ✅ `article.content.conclusion` présent
- ✅ `article.author` avec name, role
- ✅ `article.seo` présent

### Pour TEST ERREUR (Test 12) :
- ✅ `statusCode` = 500
- ✅ `success` = false
- ✅ Message d'erreur approprié

---

## 🔍 Voir les logs CloudWatch

Pour voir les logs détaillés de l'exécution :

1. Dans la console Lambda, allez dans l'onglet **Monitor**
2. Cliquez sur **View CloudWatch logs**
3. Sélectionnez le dernier flux de logs

Ou via AWS CLI :
```bash
aws logs tail /aws/lambda/getArticles --region eu-west-3 --follow
```

---

## 🚀 Test rapide - Un seul clic

**Commencez par le TEST 1** pour vérifier que la Lambda peut lister tous les articles.

Si ça fonctionne, testez le **TEST 2** pour vérifier qu'un article peut être récupéré.

---

## 📝 Configuration S3 actuelle

- **Bucket** : `immo-app`
- **Chemin** : `/data/articles/`
- **Fichiers** : 10 articles JSON
- **Région** : eu-west-3

---

## ⚠️ Prérequis validés

- ✅ Lambda déployée
- ✅ Bucket S3 `immo-app` existe
- ✅ 10 articles copiés dans `s3://immo-app/data/articles/`
- ✅ Permissions IAM configurées (s3:GetObject, s3:ListBucket)
- ✅ Variable d'environnement `BUCKET_NAME=immo-app`

---

## 🎯 Prochaine étape

Après avoir validé les tests dans la console Lambda, il faudra :

1. **Configurer API Gateway** pour exposer cette Lambda
2. **Créer une route** `GET /article`
3. **Intégrer** avec la Lambda getArticles
4. **Activer CORS**
5. **Tester** via les pages HTML

Besoin d'aide pour configurer API Gateway ? Demandez-moi !
