import json
import boto3
from botocore.exceptions import ClientError
import os

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'bucket-test-new-app')

def lambda_handler(event, context):
    """
    Handler Lambda compatible avec API Gateway REST API
    """
    
    print(f"📨 Event reçu: {json.dumps(event)}")
    
    # Récupérer le path et la méthode HTTP
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    resource = event.get('resource', '/')
    
    print(f"🔍 Requête: {http_method} {path}")
    
    # Headers CORS
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }
    
    # OPTIONS pour CORS preflight
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # Route: Health check
        if resource == '/health' or path == '/health':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({
                    'status': 'ok',
                    'message': 'API est opérationnelle',
                    'bucket': BUCKET_NAME,
                    'version': '1.0.0'
                })
            }
        
        # Route: Liste des fichiers
        elif resource == '/files' or path == '/files':
            return list_files(headers)
        
        # Route: Contenu d'un fichier
        elif resource == '/file/{filename}' or path.startswith('/file/'):
            # Extraire le filename du path
            filename = event.get('pathParameters', {}).get('filename')
            if not filename:
                # Fallback: extraire du path
                filename = path.replace('/file/', '')
            
            if not filename:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({
                        'success': False,
                        'error': 'missing_filename',
                        'message': 'Nom de fichier manquant'
                    })
                }
            
            return get_file_content(filename, headers)
        
        # Route: Plusieurs fichiers
        elif resource == '/files/multiple' or path == '/files/multiple':
            body = json.loads(event.get('body', '{}'))
            return get_multiple_files(body, headers)
        
        # Route inconnue
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'not_found',
                    'message': f'Route {path} non trouvée',
                    'available_routes': ['/health', '/files', '/file/{filename}', '/files/multiple']
                })
            }
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'internal_error',
                'message': str(e)
            })
        }

def list_files(headers):
    """Liste tous les fichiers JSON"""
    try:
        print(f"📂 Listage des fichiers dans: {BUCKET_NAME}")
        
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
        
        files = []
        if 'Contents' in response:
            for obj in response['Contents']:
                if obj['Key'].endswith('.json'):
                    files.append({
                        'name': obj['Key'],
                        'size': obj['Size'],
                        'size_mb': round(obj['Size'] / (1024 * 1024), 2),
                        'last_modified': obj['LastModified'].isoformat()
                    })
        
        print(f"✅ {len(files)} fichiers JSON trouvés")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'files': files,
                'count': len(files)
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        print(f"❌ Erreur S3: {error_code}")
        
        return {
            'statusCode': 500 if error_code != '403' else 403,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': error_code,
                'message': e.response['Error']['Message']
            })
        }

def get_file_content(filename, headers):
    """Récupère le contenu d'un fichier"""
    try:
        print(f"📥 Lecture du fichier: {filename}")
        
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=filename)
        file_content = response['Body'].read().decode('utf-8')
        json_content = json.loads(file_content)
        
        print(f"✅ Fichier lu: {len(file_content)} caractères")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'filename': filename,
                'content': json_content,
                'size_bytes': len(file_content)
            })
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        status_code = 404 if error_code in ['404', 'NoSuchKey'] else 500
        
        print(f"❌ Erreur S3: {error_code}")
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': error_code,
                'message': e.response['Error']['Message']
            })
        }
    except json.JSONDecodeError as e:
        print(f"❌ JSON invalide: {str(e)}")
        
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'invalid_json',
                'message': 'Le fichier n\'est pas un JSON valide'
            })
        }

def get_multiple_files(body, headers):
    """Récupère plusieurs fichiers"""
    try:
        filenames = body.get('files', [])
        
        if not filenames:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'no_files',
                    'message': 'Aucun fichier spécifié'
                })
            }
        
        print(f"📥 Lecture de {len(filenames)} fichiers...")
        
        results = []
        errors = []
        
        for filename in filenames:
            try:
                response = s3_client.get_object(Bucket=BUCKET_NAME, Key=filename)
                file_content = response['Body'].read().decode('utf-8')
                json_content = json.loads(file_content)
                
                results.append({
                    'filename': filename,
                    'success': True,
                    'content': json_content
                })
                
            except Exception as e:
                errors.append({
                    'filename': filename,
                    'success': False,
                    'error': str(e)
                })
        
        print(f"✅ {len(results)} succès, {len(errors)} erreurs")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'results': results,
                'errors': errors,
                'total': len(filenames),
                'success_count': len(results),
                'error_count': len(errors)
            })
        }
        
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'internal_error',
                'message': str(e)
            })
        }
