"""
Lambda Function: Get Articles
==============================
Récupère les articles depuis S3 (bucket/data/articles/)

API Endpoints:
- LIST: GET /article (liste tous les articles disponibles)
- GET: GET /article?filename=xxx.json (récupère un article spécifique)

Payload LIST:
    GET /article
    Returns: {
        "success": true,
        "articles": [
            {
                "id": "art_001",
                "title": "...",
                "slug": "...",
                "category": ["débutant", "financement"],
                "excerpt": "...",
                "featured_image": {...},
                "published_at": "...",
                "reading_time": 12
            },
            ...
        ],
        "categories": ["débutant", "financement", "stratégie", ...],
        "total": 10
    }

Payload GET:
    GET /article?filename=investir sans apport.json
    Returns: {
        "success": true,
        "article": { ... full article content ... }
    }
"""

import json
import boto3
import os
from botocore.exceptions import ClientError

# Initialisation du client S3
s3_client = boto3.client('s3')

# Configuration
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'immo-app')
ARTICLES_PREFIX = 'data/articles/'


def list_articles():
    """
    Liste tous les articles disponibles dans S3

    Returns:
        dict: Liste des articles avec métadonnées

    Raises:
        Exception: En cas d'erreur S3
    """
    try:
        print(f"📂 Listing articles depuis s3://{BUCKET_NAME}/{ARTICLES_PREFIX}")

        # Lister tous les objets dans le prefix data/
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=ARTICLES_PREFIX
        )

        if 'Contents' not in response:
            print("⚠️ Aucun fichier trouvé dans le bucket")
            return {
                'articles': [],
                'categories': [],
                'total': 0
            }
        print(f"✅ {len(response['Contents'])} fichiers trouvés")
        articles = []
        all_categories = set()

        # Parcourir tous les fichiers
        for obj in response['Contents']:
            key = obj['Key']
            print(f"📄 Traitement de {key}")
            # Ignorer les fichiers qui ne sont pas des JSON ou qui sont dans des sous-dossiers
            if not key.endswith('.json'):
                print(f"❌ {key} n'est pas un fichier JSON")
                continue

            # Ignorer les fichiers dans des sous-dossiers (on veut seulement data/articles/*.json)
            if key.count('/') > 2:
                print(f"❌ {key} est dans un sous-dossier")
                continue

            print(f"📄 Traitement de {key}")

            try:
                # Récupérer le fichier
                file_obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=key)
                file_content = file_obj['Body'].read().decode('utf-8')
                article_data = json.loads(file_content)

                # Extraire les métadonnées pour la liste
                article_meta = {
                    'id': article_data.get('id', ''),
                    'title': article_data.get('title', ''),
                    'slug': article_data.get('slug', ''),
                    'category': article_data.get('category', []),
                    'tags': article_data.get('tags', []),
                    'excerpt': article_data.get('excerpt', ''),
                    'featured_image': article_data.get('featured_image', {}),
                    'published_at': article_data.get('published_at', ''),
                    'reading_time': article_data.get('reading_time', 0),
                    'featured': article_data.get('featured', False),
                    'author': article_data.get('author', {}),
                    'filename': key.replace(ARTICLES_PREFIX, '')  # Nom du fichier sans le prefix
                }

                articles.append(article_meta)

                # Collecter toutes les catégories
                for cat in article_data.get('category', []):
                    all_categories.add(cat)

            except Exception as e:
                print(f"❌ Erreur lors du traitement de {key}: {str(e)}")
                continue

        # Trier les articles par date de publication (plus récent en premier)
        articles.sort(key=lambda x: x.get('published_at', ''), reverse=True)

        print(f"✅ {len(articles)} articles trouvés")
        print(f"📂 Catégories: {sorted(all_categories)}")

        return {
            'articles': articles,
            'categories': sorted(list(all_categories)),
            'total': len(articles)
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ Erreur S3 ({error_code}): {str(e)}")
        raise Exception(f"Erreur lors de la récupération des articles: {error_code}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {str(e)}")
        raise


def get_article(filename):
    """
    Récupère un article spécifique depuis S3

    Args:
        filename (str): Nom du fichier (ex: "investir sans apport.json")

    Returns:
        dict: Contenu complet de l'article

    Raises:
        Exception: En cas d'erreur S3
    """
    try:
        # Construire la clé S3
        s3_key = f"{ARTICLES_PREFIX}{filename}"

        print(f"📄 Récupération de s3://{BUCKET_NAME}/{s3_key}")

        # Récupérer le fichier depuis S3
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=s3_key
        )

        # Lire et parser le JSON
        file_content = response['Body'].read().decode('utf-8')
        article_data = json.loads(file_content)

        print(f"✅ Article récupéré: {article_data.get('title', 'N/A')}")

        return article_data

    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            print(f"❌ Article non trouvé: {filename}")
            raise Exception(f"Article non trouvé: {filename}")
        else:
            print(f"❌ Erreur S3 ({error_code}): {str(e)}")
            raise Exception(f"Erreur lors de la récupération de l'article: {error_code}")
    except json.JSONDecodeError as e:
        print(f"❌ Erreur de parsing JSON: {str(e)}")
        raise Exception(f"Format JSON invalide: {str(e)}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {str(e)}")
        raise


def lambda_handler(event, context):
    """
    Handler principal de la Lambda

    Args:
        event: Événement Lambda (API Gateway)
        context: Contexte Lambda

    Returns:
        dict: Réponse HTTP
    """

    print("🚀 Début de la fonction getArticles")
    print(f"Event: {json.dumps(event)}")

    try:
        # Récupérer les paramètres de la requête
        query_params = event.get('queryStringParameters') or {}
        filename = query_params.get('filename')

        # Déterminer l'action: LIST ou GET
        if filename:
            # GET: Récupérer un article spécifique
            print(f"📄 Mode GET: Récupération de {filename}")
            article = get_article(filename)

            response_body = {
                'success': True,
                'article': article
            }
        else:
            # LIST: Lister tous les articles
            print("📂 Mode LIST: Récupération de tous les articles")
            result = list_articles()

            response_body = {
                'success': True,
                'articles': result['articles'],
                'categories': result['categories'],
                'total': result['total']
            }

        print(f"✅ Succès: {json.dumps(response_body, ensure_ascii=False)[:200]}...")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(response_body, ensure_ascii=False)
        }

    except Exception as e:
        print(f"❌ Erreur interne: {str(e)}")
        import traceback
        traceback.print_exc()

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'message': f'Erreur interne: {str(e)}'
            }, ensure_ascii=False)
        }


# Pour les tests locaux
if __name__ == '__main__':
    # Test LIST
    print("\n" + "="*50)
    print("TEST 1: LIST tous les articles")
    print("="*50)
    test_event_list = {
        'queryStringParameters': None
    }
    result = lambda_handler(test_event_list, None)
    print(f"\n📤 Résultat LIST:\n{json.dumps(json.loads(result['body']), indent=2, ensure_ascii=False)[:500]}...")

    # Test GET
    print("\n" + "="*50)
    print("TEST 2: GET un article spécifique")
    print("="*50)
    test_event_get = {
        'queryStringParameters': {
            'filename': 'investir sans apport.json'
        }
    }
    result = lambda_handler(test_event_get, None)
    print(f"\n📤 Résultat GET:\n{json.dumps(json.loads(result['body']), indent=2, ensure_ascii=False)[:500]}...")
