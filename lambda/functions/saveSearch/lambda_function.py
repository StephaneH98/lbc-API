"""
Lambda Function: Save Search Results
=====================================
Enregistre les résultats de recherche (vente + location) dans S3
Structure: s3://bucket-name/users/{username}/searches/{timestamp}.json

Payload attendu:
{
    "username": "user@example.com",
    "timestamp": "2025-10-17T16:30:00.000Z",
    "data": {
        "vente": [...],
        "location": [...],
        "stats": {...}
    }
}
"""

import json
import boto3
import os
from datetime import datetime
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


def sanitize_filename(timestamp_str):
    """
    Convertit un timestamp ISO en nom de fichier valide

    Args:
        timestamp_str (str): Timestamp au format ISO (ex: "2025-10-17T16:30:00.000Z")

    Returns:
        str: Nom de fichier valide (ex: "2025-10-17_16-30-00.json")
    """
    try:
        # Remplacer les caractères invalides
        filename = timestamp_str.replace(':', '-').replace('.', '-')
        # Retirer les millisecondes et le Z
        filename = filename.split('-000')[0] if '-000' in filename else filename.rstrip('Z')
        # Remplacer T par _
        filename = filename.replace('T', '_')
        # Ajouter l'extension
        return f"{filename}.json"
    except Exception as e:
        print(f"Erreur lors du sanitize du filename: {e}")
        # Fallback: utiliser le timestamp actuel
        return f"{datetime.utcnow().strftime('%Y-%m-%d_%H-%M-%S')}.json"


def save_to_s3(username, filename, data):
    """
    Sauvegarde les données dans S3

    Args:
        username (str): Username (email) de l'utilisateur
        filename (str): Nom du fichier
        data (dict): Données à sauvegarder

    Returns:
        dict: Informations sur le fichier sauvegardé

    Raises:
        Exception: En cas d'erreur S3
    """
    try:
        # Construire le chemin S3
        s3_key = f"{SEARCHES_PREFIX}/{username}/searches/{filename}"

        # Convertir les données en JSON
        json_data = json.dumps(data, ensure_ascii=False, indent=2)

        # Métadonnées
        metadata = {
            'username': username,
            'timestamp': data.get('timestamp', ''),
            'content-type': 'application/json'
        }

        # Uploader vers S3
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json_data.encode('utf-8'),
            ContentType='application/json',
            Metadata=metadata,
            # Tags pour restriction d'accès
            Tagging=f'owner={username}&type=search-results'
        )

        # Construire l'URL S3
        s3_url = f"s3://{BUCKET_NAME}/{s3_key}"

        print(f"✅ Fichier sauvegardé: {s3_url}")

        return {
            'bucket': BUCKET_NAME,
            'key': s3_key,
            'url': s3_url,
            'size': len(json_data)
        }

    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ Erreur S3 ({error_code}): {str(e)}")
        raise Exception(f"Erreur lors de la sauvegarde S3: {error_code}")
    except Exception as e:
        print(f"❌ Erreur inattendue: {str(e)}")
        raise


def validate_payload(payload):
    """
    Valide la structure du payload

    Args:
        payload (dict): Payload reçu

    Returns:
        tuple: (is_valid, error_message)
    """
    # Vérifier les champs requis
    required_fields = ['username', 'timestamp', 'data']
    for field in required_fields:
        if field not in payload:
            return False, f"Champ requis manquant: {field}"

    # Valider le username
    if not validate_username(payload['username']):
        return False, "Format de username invalide (email attendu)"

    # Valider la structure de data
    data = payload.get('data', {})
    if not isinstance(data, dict):
        return False, "Le champ 'data' doit être un objet"

    # Vérifier qu'il y a au moins des données (vente ou location)
    vente = data.get('vente', [])
    location = data.get('location', [])

    if not vente and not location:
        return False, "Aucune donnée de recherche (vente ou location) fournie"

    return True, None


def lambda_handler(event, context):
    """
    Handler principal de la Lambda

    Args:
        event: Événement Lambda (API Gateway)
        context: Contexte Lambda

    Returns:
        dict: Réponse HTTP
    """

    print("🚀 Début de la fonction saveSearch")
    print(f"Event: {json.dumps(event)}")

    try:
        # Parser le body de la requête
        if 'body' not in event:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS'
                },
                'body': json.dumps({
                    'success': False,
                    'message': 'Corps de requête manquant'
                })
            }

        # Parser le JSON
        try:
            if isinstance(event['body'], str):
                payload = json.loads(event['body'])
            else:
                payload = event['body']
        except json.JSONDecodeError as e:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': f'JSON invalide: {str(e)}'
                })
            }

        print(f"📦 Payload reçu: {json.dumps(payload, indent=2)}")

        # Valider le payload
        is_valid, error_message = validate_payload(payload)
        if not is_valid:
            print(f"❌ Validation échouée: {error_message}")
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': False,
                    'message': error_message
                })
            }

        # Extraire les informations
        username = payload['username']
        timestamp = payload['timestamp']
        data = payload['data']

        # Statistiques pour les logs
        vente_count = len(data.get('vente', []))
        location_count = len(data.get('location', []))

        print(f"👤 Username: {username}")
        print(f"📊 Annonces VENTE: {vente_count}")
        print(f"📊 Annonces LOCATION: {location_count}")

        # Générer le nom de fichier
        filename = sanitize_filename(timestamp)
        print(f"📄 Nom de fichier: {filename}")

        # Préparer les données à sauvegarder
        save_data = {
            'username': username,
            'timestamp': timestamp,
            'saved_at': datetime.utcnow().isoformat() + 'Z',
            'data': data,
            'summary': {
                'total_vente': vente_count,
                'total_location': location_count,
                'total_combined': vente_count + location_count
            }
        }

        # Sauvegarder dans S3
        file_info = save_to_s3(username, filename, save_data)

        # Préparer la réponse
        response_body = {
            'success': True,
            'message': 'Recherche enregistrée avec succès',
            'file': {
                'bucket': file_info['bucket'],
                'key': file_info['key'],
                'url': file_info['url'],
                'size': file_info['size']
            },
            'summary': save_data['summary']
        }

        print(f"✅ Succès: {json.dumps(response_body)}")

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
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
    # Exemple de payload de test
    test_event = {
        'body': json.dumps({
            'username': 'test@example.com',
            'timestamp': '2025-10-17T16:30:00.000Z',
            'data': {
                'vente': [
                    {
                        'titre': 'Appartement T3',
                        'prix': '180000',
                        'localisation': 'Perpignan 66000'
                    }
                ],
                'location': [
                    {
                        'titre': 'Studio meublé',
                        'prix': '550 € / mois',
                        'localisation': 'Perpignan 66000'
                    }
                ],
                'stats': {
                    'totalVente': 1,
                    'totalLocation': 1,
                    'totalCombine': 2
                }
            }
        })
    }

    result = lambda_handler(test_event, None)
    print(f"\n📤 Résultat du test:\n{json.dumps(json.loads(result['body']), indent=2)}")
