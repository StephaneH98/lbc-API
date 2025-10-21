"""
Lambda Function: getUserSearches
Récupère la liste des fichiers de recherche d'un utilisateur depuis S3
OU récupère le contenu d'un fichier spécifique
"""

import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

# Initialisation du client S3
s3_client = boto3.client('s3')

# Variables d'environnement
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'bucket-test-new-app')
SEARCHES_PREFIX = 'users'

def lambda_handler(event, context):
    """
    Point d'entrée de la Lambda

    Query Parameters:
    - username (requis): Email de l'utilisateur
    - filename (optionnel): Si fourni, retourne le contenu de ce fichier spécifique
    """

    print('🚀 Début de la fonction getUserSearches')
    print(f'📦 Event reçu: {json.dumps(event)}')

    try:
        # Récupérer les paramètres de requête
        query_params = event.get('queryStringParameters', {})

        if not query_params:
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
                    'message': 'Paramètres manquants'
                })
            }

        username = query_params.get('username')
        filename = query_params.get('filename')  # Optionnel

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

        print(f'👤 Username: {username}')
        print(f'📄 Filename: {filename if filename else "Non spécifié (liste tous les fichiers)"}')

        # Si un filename est fourni, retourner le contenu de ce fichier
        if filename:
            return get_file_content(username, filename)

        # Sinon, lister tous les fichiers de l'utilisateur
        return list_user_files(username)

    except Exception as e:
        print(f'❌ Erreur interne: {str(e)}')
        import traceback
        traceback.print_exc()

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'message': f'Erreur interne du serveur: {str(e)}'
            })
        }


def list_user_files(username):
    """
    Liste tous les fichiers de recherche d'un utilisateur
    """
    print(f'📂 Listing des fichiers pour: {username}')

    # Construire le préfixe S3
    prefix = f"{SEARCHES_PREFIX}/{username}/searches/"
    print(f'🔍 Préfixe S3: s3://{BUCKET_NAME}/{prefix}')

    try:
        # Lister les objets dans S3
        response = s3_client.list_objects_v2(
            Bucket=BUCKET_NAME,
            Prefix=prefix
        )

        files = []

        if 'Contents' in response:
            print(f'📊 Nombre d\'objets trouvés: {len(response["Contents"])}')

            for obj in response['Contents']:
                key = obj['Key']

                # Extraire le nom du fichier (enlever le préfixe)
                filename = key.replace(prefix, '')

                # Ignorer les dossiers vides ou fichiers sans nom
                if not filename or filename.endswith('/'):
                    continue

                # Récupérer les métadonnées du fichier
                try:
                    head_response = s3_client.head_object(
                        Bucket=BUCKET_NAME,
                        Key=key
                    )

                    metadata = head_response.get('Metadata', {})
                    ads_count = metadata.get('ads_count')

                    # Si ads_count est dans les métadonnées, le convertir en int
                    if ads_count:
                        try:
                            ads_count = int(ads_count)
                        except (ValueError, TypeError):
                            ads_count = None

                except ClientError as e:
                    print(f'⚠️ Impossible de récupérer les métadonnées pour {key}: {e}')
                    ads_count = None

                file_info = {
                    'filename': filename,
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'ads_count': ads_count
                }

                files.append(file_info)
                print(f'   ✅ {filename} - {obj["Size"]} bytes - {ads_count} annonces')

        else:
            print('📭 Aucun fichier trouvé')

        # Trier par date (plus récent en premier)
        files.sort(key=lambda x: x['last_modified'], reverse=True)

        print(f'✅ Retour de {len(files)} fichiers')

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'files': files,
                'count': len(files)
            })
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f'❌ Erreur S3: {error_code}')

        if error_code == 'NoSuchBucket':
            message = f'Bucket introuvable: {BUCKET_NAME}'
        elif error_code == 'AccessDenied':
            message = 'Accès refusé au bucket S3'
        else:
            message = f'Erreur S3: {str(e)}'

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'message': message
            })
        }


def get_file_content(username, filename):
    """
    Récupère le contenu d'un fichier spécifique
    """
    print(f'📄 Récupération du fichier: {filename} pour {username}')

    # Construire la clé S3
    s3_key = f"{SEARCHES_PREFIX}/{username}/searches/{filename}"
    print(f'🔍 Chemin S3: s3://{BUCKET_NAME}/{s3_key}')

    try:
        # Récupérer l'objet depuis S3
        response = s3_client.get_object(
            Bucket=BUCKET_NAME,
            Key=s3_key
        )

        # Lire le contenu du fichier
        file_content = response['Body'].read().decode('utf-8')
        file_data = json.loads(file_content)

        print(f'✅ Fichier récupéré avec succès: {len(file_content)} caractères')

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'filename': filename,
                'data': file_data
            })
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f'❌ Erreur S3: {error_code}')

        if error_code == 'NoSuchKey':
            message = f'Fichier non trouvé: {filename}'
            status_code = 404
        elif error_code == 'AccessDenied':
            message = 'Accès refusé au fichier'
            status_code = 403
        else:
            message = f'Erreur S3: {str(e)}'
            status_code = 500

        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'message': message
            })
        }

    except json.JSONDecodeError as e:
        print(f'❌ Erreur de parsing JSON: {str(e)}')

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'message': 'Format de fichier invalide (JSON attendu)'
            })
        }
