import json
import boto3
from botocore.exceptions import ClientError
import os

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'bucket-test-new-app')

def lambda_handler(event, context):
    """
    Handler Lambda compatible avec API Gateway
    """
    
    # Récupérer le path et la méthode HTTP
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    
    print(f"📨 Requête: {http_method} {path}")
    
    # Headers CORS
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
    
    # OPTIONS pour CORS preflight
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    try:
        # Route: Liste des fichiers
        if path == '/api/files' and http_method == 'GET':
            return list_files(headers)
        
        # Route: Contenu d'un fichier
        elif path.startswith('/api/file/') and http_method == 'GET':
            filename = path.replace('/api/file/', '')
            return get_file_content(filename, headers)
        
        # Route: Plusieurs fichiers
        elif path == '/api/files/multiple' and http_method == 'POST':
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
                    'message': f'Route {path} non trouvée'
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

def list_files(headers):
    """Liste tous les fichiers JSON"""
    try:
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
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'files': files,
                'count': len(files)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }

def get_file_content(filename, headers):
    """Récupère le contenu d'un fichier"""
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=filename)
        file_content = response['Body'].read().decode('utf-8')
        json_content = json.loads(file_content)
        
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
        
        return {
            'statusCode': status_code,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': error_code,
                'message': e.response['Error']['Message']
            })
        }

def get_multiple_files(body, headers):
    """Récupère plusieurs fichiers"""
    try:
        filenames = body.get('files', [])
        
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
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }
