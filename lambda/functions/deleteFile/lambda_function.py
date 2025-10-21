"""
Lambda Function: Delete File
==============================
Supprime un fichier de recherche depuis S3

Payload attendu:
{
    "username": "user@example.com",
    "filename": "2025-10-21_09-15-23-242.json"
}
"""

import json
import boto3
import os
from botocore.exceptions import ClientError
import re

# Initialisation du client S3
s3_client = boto3.client('s3')

# Configuration
BUCKET_NAME = os.environ.get('BUCKET_NAME', 'bucket-test-new-app')
SEARCHES_PREFIX = 'users'


def validate_username(username):
    """
    Valide le format du username (email)

    Args:
        username (str): Username à valider

    Returns:
        bool: True si valide, False sinon
    """
    if not username:
        return False

    # Pattern email simple
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, username))


def validate_filename(filename):
    """
    Valide le format du filename

    Args:
        filename (str): Nom du fichier à valider

    Returns:
        bool: True si valide, False sinon
    """
    if not filename:
        return False

    # Vérifier que le filename ne contient pas de caractères dangereux
    # Autoriser: lettres, chiffres, tirets, underscores, points
    safe_pattern = r'^[a-zA-Z0-9._-]+\.json$'
    return bool(re.match(safe_pattern, filename))


def lambda_handler(event, context):
    """
    Handler principal de la Lambda

    Args:
        event: Événement Lambda contenant username et filename
        context: Contexte Lambda

    Returns:
        dict: Réponse avec statusCode et body
    """
    print("📥 Événement reçu:", json.dumps(event))

    try:
        # Parser le body si c'est une requête API Gateway
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        # Extraire les paramètres
        username = body.get('username')
        filename = body.get('filename')

        print(f"👤 Username: {username}")
        print(f"📄 Filename: {filename}")

        # Validation des paramètres
        if not username:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Le paramètre username est obligatoire'
                })
            }

        if not filename:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Le paramètre filename est obligatoire'
                })
            }

        # Valider le format
        if not validate_username(username):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Format de username invalide'
                })
            }

        if not validate_filename(filename):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Format de filename invalide (doit être un fichier .json)'
                })
            }

        # Construire la clé S3
        s3_key = f"{SEARCHES_PREFIX}/{username}/searches/{filename}"
        print(f"🔑 Clé S3: {s3_key}")

        # Vérifier que le fichier existe avant de le supprimer
        try:
            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    },
                    'body': json.dumps({
                        'success': False,
                        'message': f'Fichier non trouvé: {filename}'
                    })
                }
            raise

        # Supprimer le fichier
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
        print(f"✅ Fichier supprimé: {s3_key}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'message': f'Fichier {filename} supprimé avec succès',
                'filename': filename
            })
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        print(f"❌ Erreur S3: {error_code} - {error_message}")

        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': False,
                'message': f'Erreur S3: {error_message}'
            })
        }

    except Exception as e:
        print(f"❌ Erreur inattendue: {str(e)}")

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
