import json
import re
import sys
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import uuid  # Pour générer des IDs uniques

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

def extract_ads(html_file, output_file):
    """
    Extrait les annonces de la page HTML et enregistre les données structurées
    """
    try:
        # Lire le fichier HTML
        with open(html_file, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Utiliser BeautifulSoup pour parser le HTML
        soup = BeautifulSoup(content, 'html.parser')
        
        # Trouver tous les éléments qui contiennent des annonces
        ads = soup.find_all('div', class_=lambda x: x and x.startswith('adcard_'))
        
        if not ads:
            print("Aucune annonce trouvée dans la page.")
            return False
        
        # Extraire les données de chaque annonce en éliminant les doublons par URL
        unique_announcements = {}  # Dictionnaire pour stocker les annonces uniques par URL
        ignored_ads = 0  # Compteur d'annonces ignorées
        
        for i, ad in enumerate(ads, 1):
            announcement = extract_announcement_data(ad, i)
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
        
        # Écrire les données dans un fichier JSON
        with open(output_file, 'w', encoding='utf-8') as file:
            json.dump(announcements, file, ensure_ascii=False, indent=2)
        
        total_ads = len(ads)
        valid_ads = len(announcements)
        print(f"{valid_ads} annonces valides extraites sur {total_ads} ({valid_ads/max(1, total_ads)*100:.1f}% de complétion)")
        if ignored_ads > 0:
            print(f"{ignored_ads} annonces ignorées car ne correspondant pas au format d'URL requis")
        return True
        
    except Exception as e:
        print(f"Une erreur s'est produite : {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_ads.py <fichier_html> [fichier_sortie.json]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "annonces_data.json"
    
    extract_ads(input_file, output_file)
