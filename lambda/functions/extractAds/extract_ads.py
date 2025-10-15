import json
import boto3
import urllib.parse
from datetime import datetime
from botocore.exceptions import ClientError
from bs4 import BeautifulSoup

s3_client = boto3.client('s3')


def parse_date(date_text):
    """
    Convertit une date textuelle de Le Bon Coin en date au format ISO (sans heure).
    
    Args:
        date_text (str): Date au format texte (ex: "Aujourd'hui, 15:30", "Hier, 09:15", "Il y a 3 jours")
        
    Returns:
        str: Date au format ISO (ex: "2023-09-26") ou None en cas d'erreur
    """
    if not date_text:
        return None
    
    date_text = date_text.strip()
    today = datetime.now().date()
    
    try:
        # Cas 1: "Aujourd'hui" ou "Aujourd'hui, HH:MM"
        if 'aujourd' in date_text.lower():
            return today.isoformat()
        
        # Cas 2: "Hier" ou "Hier, HH:MM"
        elif 'hier' in date_text.lower():
            return (today - timedelta(days=1)).isoformat()
        
        # Cas 3: "Il y a X jours"
        elif 'jour' in date_text.lower():
            days_ago = int(re.search(r'\d+', date_text).group())
            return (today - timedelta(days=days_ago)).isoformat()
        
        # Cas 4: Date complète (ex: "25 sept. 2023 à 14:30")
        elif 'à' in date_text:
            # Essayer de parser avec le format complet mais ne garder que la date
            try:
                date_obj = datetime.strptime(date_text.split('à')[0].strip(), "%d %b %Y")
                return date_obj.date().isoformat()
            except ValueError:
                pass
        
        # Cas 5: Date seule (ex: "25 sept. 2023")
        try:
            date_obj = datetime.strptime(date_text, "%d %b %Y")
            return date_obj.date().isoformat()
        except ValueError:
            pass
        
        # Si aucun format ne correspond, retourner la date d'aujourd'hui
        return today.isoformat()
    
    except Exception as e:
        print(f"Erreur lors du parsing de la date '{date_text}': {e}")
        return None

def extract_surface_m2(surface_text):
    """Extrait la surface en m² à partir du texte de surface"""
    if not surface_text:
        return None
    import re
    match = re.search(r'(\d+)\s*m²', surface_text.replace(' ', ''))
    return int(match.group(1)) if match else None

def extract_price(price_text):
    """Extrait le prix numérique à partir du texte de prix"""
    if not price_text:
        return None
    try:
        # Remplacer tous les caractères d'espacement par des espaces standards
        price_str = price_text.replace('\xa0', '').replace('\u202f', '').replace(' ', '')
        # Supprimer tout ce qui suit le premier caractère non numérique
        price_str = ''.join(c for c in price_str if c.isdigit() or c in '.,')
        # Remplacer la virgule par un point si nécessaire
        if ',' in price_str and '.' in price_str:
            # Si les deux sont présents, on garde le dernier séparateur
            last_sep = max(price_str.rfind(','), price_str.rfind('.'))
            price_str = price_str[:last_sep].replace('.', '').replace(',', '') + price_str[last_sep:]
        price_str = price_str.replace(',', '.')
        # Supprimer les points des milliers
        price_str = price_str.replace('.', '')
        return int(float(price_str))
    except (ValueError, AttributeError) as e:
        print(f"Erreur de conversion du prix '{price_text}': {e}")
        return None

def extract_pieces(description):
    """Extrait le nombre de pièces de la description"""
    if not description:
        return None
    import re
    match = re.search(r'(\d+)\s*pi[èe]ce', description, re.IGNORECASE)
    return int(match.group(1)) if match else None

def extract_announcement_data(ad, annonce_id):
    """Extrait les données d'une annonce"""
    data = {
        'id': str(annonce_id),  # Ajout de l'ID unique
        'prix': None,
        'localisation': None,
        'description': None,
        'surface_m2': None,
        'prix_m2': None,
        'pieces': None,  # Nombre de pièces
        'url': None,
        'date_publication': None  # Date de publication de l'annonce
    }
    
    try:
        # Extraire le prix
        price_elem = ad.find('p', {'data-test-id': 'price'}) or ad.find('span', {'data-test-id': 'price'})
        if price_elem:
            price_text = price_elem.get_text(strip=True).replace('\xa0', ' ')
            data['prix'] = extract_price(price_text)
        
        # Extraire la localisation
        location_elem = ad.find('p', {'data-test-id': 'city'}) or \
                       ad.find('p', class_=lambda x: x and 'text-caption' in x and 'text-neutral' in x and 'hier' not in x)
        
        if not location_elem:
            for elem in ad.find_all('p', class_=lambda x: x and 'text-caption' in x):
                text = elem.get_text(strip=True)
                if any(c.isdigit() for c in text) and any(c.isalpha() for c in text) and 'hier' not in text:
                    location_elem = elem
                    break
        
        if location_elem:
            data['localisation'] = location_elem.get_text(strip=True)
        
        # Extraire la description
        for elem in ad.find_all('p', class_=lambda x: x and 'text-body-2' in x):
            text = elem.get_text()
            if 'm²' in text:
                data['description'] = text.strip()
                data['surface_m2'] = extract_surface_m2(text)
                data['pieces'] = extract_pieces(text)
                break
        
        # Extraire l'URL de l'annonce
        link_elem = ad.find('a', href=True)
        if link_elem:
            data['url'] = link_elem['href']
            if not data['url'].startswith('http'):
                data['url'] = 'https://www.leboncoin.fr' + data['url']
        
        # Calculer le prix au m² si on a le prix et la surface
        if data['prix'] and data['surface_m2'] and data['surface_m2'] > 0:
            data['prix_m2'] = round(data['prix'] / data['surface_m2'])
        
        # Extraire et formater la date de publication
        date_elem = ad.find('p', class_=lambda x: x and 'text-caption' in x and ('text-neutral' in x or 'text-grey' in x))
        if date_elem:
            date_text = date_elem.get_text(strip=True)
            # Nettoyer le texte de la date
            date_text = ' '.join(word for word in date_text.split() if word != '·')
            # Convertir la date en format ISO
            data['date_publication'] = parse_date(date_text)
        
        # Vérifier si les champs requis sont présents
        required_fields = ['prix', 'localisation', 'description', 'url']
        if all(data[field] is not None for field in required_fields):
            return data
            
    except Exception as e:
        print(f"Erreur lors de l'extraction d'une annonce: {str(e)}")
        
    return None

def extract_ads(body_html):
    """
    Extrait les annonces depuis le contenu HTML et retourne les données structurées
    
    Args:
        body_html (str): Contenu HTML contenant les annonces
        
    Returns:
        dict: Résultat avec les annonces extraites et les statistiques
    """
    try:
        # Utiliser BeautifulSoup pour parser le HTML
        soup = BeautifulSoup(body_html, 'html.parser')

        # Trouver tous les éléments qui contiennent des annonces
        ads = soup.find_all('div', class_=lambda x: x and x.startswith('adcard_'))

        if not ads:
            return {
                'success': False,
                'message': "Aucune annonce trouvée dans la page.",
                'announcements': [],
                'stats': {
                    'total_ads': 0,
                    'valid_ads': 0,
                    'ignored_ads': 0,
                    'completion_rate': 0
                }
            }

        # Extraire les données de chaque annonce en éliminant les doublons par URL
        unique_announcements = {}  # Dictionnaire pour stocker les annonces uniques par URL
        ignored_ads = 0  # Compteur d'annonces ignorées
        
        print("🚀 Extraction des annonces...")

        for i, ad in enumerate(ads, 1):
            announcement = extract_announcement_data(ad, i)
            #print(f"Annonce {i}: {announcement}")
            if announcement and 'url' in announcement and announcement['url']:
                url = announcement['url']
                # Vérifier si l'URL commence par le préfixe souhaité
                if not url.startswith('https://www.leboncoin.fr/ad/'):
                    ignored_ads += 1
                    continue

                # Si l'URL n'existe pas encore ou si la nouvelle annonce a plus d'informations
                if url not in unique_announcements or (
                    announcement.get('prix') is not None or 
                    announcement.get('surface_m2') is not None
                ):
                    unique_announcements[url] = announcement

        # Convertir le dictionnaire en liste pour le JSON
        announcements = list(unique_announcements.values())
        
        # Réattribuer des IDs séquentiels après la déduplication
        for i, annonce in enumerate(announcements, 1):
            annonce['id'] = str(i)

        #print(ads)
        total_ads = len(ads)
        valid_ads = len(announcements)
        completion_rate = (valid_ads / max(1, total_ads)) * 100

        return {
            'success': True,
            'message': f"{valid_ads} annonces valides extraites sur {total_ads} ({completion_rate:.1f}% de complétion)",
            'announcements': announcements,
            'stats': {
                'total_ads': total_ads,
                'valid_ads': valid_ads,
                'ignored_ads': ignored_ads,
                'completion_rate': completion_rate
            }
        }

    except Exception as e:
        return {
            'success': False,
            'message': f"Une erreur s'est produite : {str(e)}",
            'announcements': [],
            'error': str(e)
        }


def extract_body(input_data):
    """
    Extrait le champ body depuis les données d'entrée
    """
    print("🚀 Extraction du body...")
    print("Input data : ", input_data)
    try:
        # Si c'est une string, la parser en JSON
        if isinstance(input_data, str):
            data = json.loads(input_data)
        # Si c'est déjà un dict, l'utiliser directement
        elif isinstance(input_data, dict):
            data = input_data
        else:
            print(f"Type inattendu pour input_data: {type(input_data)}")
            return ''
        
        # Extraire le body
        body = data.get('body', '')
        
        return body
        
    except json.JSONDecodeError as e:
        print(f"Erreur JSON dans extract_body: {str(e)}")
        return ''
    except Exception as e:
        print(f"Erreur extraction body: {str(e)}")
        return ''

def lambda_handler(event, context):
    try:
        # Récupérer les paramètres de la requête GET
        query_params = event.get('queryStringParameters')
        
        if not query_params:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Paramètres de requête manquants'})
            }
        
        # Récupérer l'URL S3 depuis les query parameters
        s3_url = query_params.get('url', '')
        
        if not s3_url:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Paramètre "url" manquant dans la requête'})
            }
        
        # Décoder l'URL si elle est encodée
        s3_url = urllib.parse.unquote(s3_url)
        
        # Parser l'URL S3 pour extraire le bucket et la clé
        # Format attendu: https://bucket-name.s3.region.amazonaws.com/path/to/file.html
        # ou: https://s3.region.amazonaws.com/bucket-name/path/to/file.html
        # ou: s3://bucket-name/path/to/file.html
        
        bucket_name, object_key = parse_s3_url(s3_url)
        
        print(f"Bucket: {bucket_name}, Key: {object_key}")

        if not bucket_name or not object_key:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'URL S3 invalide', 'url_received': s3_url})
            }
        
        # Récupérer le fichier depuis S3
        #response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        #print(f"Response: {response}")
        #html_content = response['Body'].read().decode('utf-8')
        html_content = get_s3_file_content(s3_url)
        
        print(f"HTML Content: {html_content[:100]}...")
        data = extract_ads(html_content)
        # Parser le HTML avec BeautifulSoup
        #soup = BeautifulSoup(html_content, 'html.parser')
        #print("Soup :")
        #print(f"Soup: {soup}")

        # Extraire les données (adaptez selon votre structure HTML)
        #data = extract_data_from_html(soup)
        print("Data :")
        print(f"Data: {data}")

        # Retourner le contenu HTML
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*'
            },
            'body': data['announcements']
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Fichier non trouvé dans S3'})
            }
        elif error_code == 'NoSuchBucket':
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Bucket S3 non trouvé'})
            }
        else:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Erreur S3: {str(e)}'})
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': f'Erreur interne: {str(e)}'})
        }


def get_s3_file_content(s3_url):
    """
    Récupère le contenu d'un fichier S3 à partir de son URL
    
    Args:
        s3_url (str): URL du fichier S3
                     Formats supportés:
                     - s3://bucket-name/path/to/file
                     - https://bucket-name.s3.region.amazonaws.com/path/to/file
                     - https://s3.region.amazonaws.com/bucket-name/path/to/file
    
    Returns:
        str: Contenu du fichier
        
    Raises:
        ValueError: Si l'URL est invalide
        ClientError: Si le fichier ou le bucket n'existe pas
    """
    
    # Créer le client S3
    s3_client = boto3.client('s3')
    
    # Parser l'URL pour extraire bucket et key
    bucket_name, object_key = parse_s3_url(s3_url)
    
    if not bucket_name or not object_key:
        raise ValueError(f"URL S3 invalide: {s3_url}")
    
    try:
        # Récupérer le fichier
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        
        # Lire et décoder le contenu
        content = response['Body'].read().decode('utf-8')
        
        return content
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchKey':
            raise FileNotFoundError(f"Fichier non trouvé: {object_key} dans le bucket {bucket_name}")
        elif error_code == 'NoSuchBucket':
            raise FileNotFoundError(f"Bucket non trouvé: {bucket_name}")
        else:
            raise

def extract_data_from_html(soup):
    """
    Extrait les données du HTML et retourne un dictionnaire
    ADAPTEZ CETTE FONCTION selon votre structure HTML
    """
    data = {
        'title': '',
        'content': [],
        'metadata': {}
    }
    
    # Exemple : extraire le titre
    title_tag = soup.find('title')
    if title_tag:
        data['title'] = title_tag.get_text(strip=True)
    
    # Exemple : extraire tous les paragraphes
    paragraphs = soup.find_all('p')
    data['content'] = [p.get_text(strip=True) for p in paragraphs]
    
    # Exemple : extraire des métadonnées
    meta_tags = soup.find_all('meta')
    for meta in meta_tags:
        name = meta.get('name') or meta.get('property')
        content = meta.get('content')
        if name and content:
            data['metadata'][name] = content
    
    return data

def parse_s3_url(url):
    """
    Parse une URL S3 pour extraire le nom du bucket et la clé de l'objet
    """
    try:
        # Format s3://bucket/key
        if url.startswith('s3://'):
            parts = url[5:].split('/', 1)
            bucket = parts[0]
            key = parts[1] if len(parts) > 1 else ''
            return bucket, key
        
        # Format https://
        elif url.startswith('https://'):
            parsed = urllib.parse.urlparse(url)
            
            # Format: https://bucket.s3.region.amazonaws.com/key
            if '.s3.' in parsed.netloc or '.s3-' in parsed.netloc:
                bucket = parsed.netloc.split('.')[0]
                key = parsed.path.lstrip('/')
                return bucket, key
            
            # Format: https://s3.region.amazonaws.com/bucket/key
            elif parsed.netloc.startswith('s3'):
                parts = parsed.path.lstrip('/').split('/', 1)
                bucket = parts[0]
                key = parts[1] if len(parts) > 1 else ''
                return bucket, key
        
        return None, None
        
    except Exception:
        return None, None
