"""
Lambda Function: Get User Searches
===================================
Récupère la liste des recherches enregistrées pour un utilisateur spécifique
Structure: s3://bucket-name/users/{username}/searches/

Paramètres attendus:
{
    "username": "user@example.com"
}
"""

import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

# Initialisation du client S3
s3_client = boto3.client('s3')

# Configuration
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'bucket-test-new-app')
SEARCHES_PREFIX = 'users'


def get_file_metadata(bucket, key):
    """
    Récupère les métadonnées d'un fichier S3

    Args:
        bucket (str): Nom du bucket
        key (str): Clé S3 du fichier

    Returns:
        dict: Métadonnées du fichier
    """
    try:
        response = s3_client.head_object(Bucket=bucket, Key=key)

        return {
            'size': response.get('ContentLength', 0),
            'last_modified': response.get('LastModified').isoformat() if response.get('LastModified') else None,
            'content_type': response.get('ContentType', 'application/json')
        }
    except Exception as e:
        print(f"⚠️ Erreur récupération métadonnées pour {key}: {e}")
        return {
            'size': 0,
            'last_modified': None,
            'content_type': 'application/json'
        }


def get_annonces_count(bucket, key):
    """
    Récupère le nombre d'annonces dans un fichier de recherche

    Args:
        bucket (str): Nom du bucket
        key (str): Clé S3 du fichier

    Returns:
        int: Nombre total d'annonces (vente + location)
    """
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')
        data = json.loads(content)

        # Récupérer les compteurs depuis summary si disponible
        if 'summary' in data:
            return data['summary'].get('total_combined', 0)

        # Sinon compter manuellement
        vente_count = len(data.get('data', {}).get('vente', []))
        location_count = len(data.get('data', {}).get('location', []))

        return vente_count + location_count

    except Exception as e:
        print(f"⚠️ Erreur lecture fichier {key}: {e}")
        return 0


def list_user_searches(username):
    """
    Liste tous les fichiers de recherche d'un utilisateur

    Args:
        username (str): Email de l'utilisateur

    Returns:
        list: Liste des fichiers avec leurs métadonnées
    """
    try:
        # Construire le préfixe pour cet utilisateur
        prefix = f"{SEARCHES_PREFIX}/{username}/searches/"

        print(f"🔍 Recherche dans: s3://{BUCKET_NAME}/{prefix}")

        # Lister les objets
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=prefix
        )

        # Vérifier si des fichiers existent
        if 'Contents' not in response:
            print(f"📭 Aucun fichier trouvé pour {username}")
            return []

        files = []

        for obj in response['Contents']:
            key = obj['Key']

            # Ignorer les "dossiers" (clés se terminant par /)
            if key.endswith('/'):
                continue

            # Extraire le nom de fichier
            filename = key.split('/')[-1]

            # Récupérer les métadonnées
            metadata = get_file_metadata(BUCKET_NAME, key)

            # Récupérer le nombre d'annonces
            ads_count = get_annonces_count(BUCKET_NAME, key)

            file_info = {
                'name': filename,
                'key': key,
                'size': metadata['size'],
                'last_modified': metadata['last_modified'],
                'ads_count': ads_count,
                'url': f"s3://{BUCKET_NAME}/{key}"
            }

            files.append(file_info)
            print(f"✅ Fichier trouvé: {filename} ({ads_count} annonces)")

        # Trier par date de modification (plus récent en premier)
        files.sort(key=lambda x: x['last_modified'] or '', reverse=True)

        print(f"📊 Total: {len(files)} fichier(s) trouvé(s)")

        return files

    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ Erreur S3 ({error_code}): {str(e)}")

        # Si le bucket ou le préfixe n'existe pas, retourner liste vide
        if error_code == 'NoSuchBucket' or error_code == 'NoSuchKey':
            return []

        raise Exception(f"Erreur lors de la récupération S3: {error_code}")

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

    print("🚀 Début de la fonction getUserSearches")
    print(f"Event: {json.dumps(event)}")

    try:
        # Récupérer le username depuis les query parameters
        username = None

        # Cas 1: Query string parameters (GET request)
        if 'queryStringParameters' in event and event['queryStringParameters']:
            username = event['queryStringParameters'].get('username')

        # Cas 2: Body (POST request - optionnel)
        elif 'body' in event and event['body']:
            try:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
                username = body.get('username')
            except:
                pass

        # Vérifier que le username est fourni
        if not username:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Paramètre "username" requis'
                })
            }

        print(f"👤 Username: {username}")

        # Récupérer les fichiers de l'utilisateur
        files = list_user_searches(username)

        # Préparer la réponse
        response_body = {
            'success': True,
            'username': username,
            'files': files,
            'count': len(files)
        }

        print(f"✅ Succès: {len(files)} fichier(s) retourné(s)")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(response_body)
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
            })
        }


# Pour les tests locaux
if __name__ == '__main__':
    # Exemple de test avec query parameters
    test_event = {
        'queryStringParameters': {
            'username': 'test@example.com'
        }
    }

    result = lambda_handler(test_event, None)
    print(f"\n📤 Résultat du test:\n{json.dumps(json.loads(result['body']), indent=2)}")
