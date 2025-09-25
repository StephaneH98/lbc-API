import json
import re
import sys
from bs4 import BeautifulSoup
import uuid  # Pour générer des IDs uniques

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

def extract_announcement_data(ad, annonce_id):
    """Extrait les données d'une annonce"""
    data = {
        'id': str(annonce_id),  # Ajout de l'ID unique
        'prix': None,
        'localisation': None,
        'description': None,
        'surface_m2': None,
        'prix_m2': None,
        'url': None
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
