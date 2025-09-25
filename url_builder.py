from urllib.parse import urlencode, urlparse, parse_qs, urlunparse
from config import DEFAULT_SEARCH_PARAMS, RENTAL_PARAMS, SCRAPER_CONFIG

class LBCUrlBuilder:
    """Classe pour construire et modifier les URLs de recherche Le Bon Coin"""
    
    BASE_URL = SCRAPER_CONFIG['search_url']
    
    def __init__(self, url=None):
        """Initialise le builder avec une URL existante ou des paramètres par défaut"""
        self.params = DEFAULT_SEARCH_PARAMS.copy()
        
        if url:
            self._parse_url(url)
    
    def _parse_url(self, url):
        """Parse une URL existante pour extraire les paramètres"""
        parsed = urlparse(url)
        query_params = parse_qs(parsed.query)
        
        # Mettre à jour les paramètres avec ceux de l'URL
        for key, value in query_params.items():
            if key in self.params:
                # Prendre la première valeur pour les paramètres simples
                self.params[key] = value[0]
    
    def set_furnished(self, furnished=None):
        """
        Définit si la location est meublée ou non
        
        Args:
            furnished (int, optional): 
                - 1 pour meublé
                - 2 pour non meublé
                - None pour ne pas filtrer
        """
        if furnished in [1, 2]:
            self.params['furnished'] = str(furnished)
        elif 'furnished' in self.params:
            del self.params['furnished']
        return self
        
    def set_category(self, category_id):
        """Définit la catégorie de recherche"""
        self.params['category'] = str(category_id)
        return self
    
    def add_location(self, name, postal_code=None, lat=None, lon=None, radius=10000):
        """
        Ajoute une localisation à la recherche
        
        Args:
            name (str): Nom de la localisation
            postal_code (str, optional): Code postal
            lat (float, optional): Latitude
            lon (float, optional): Longitude
            radius (int, optional): Rayon de recherche en mètres (défaut: 10000)
            
        Returns:
            LBCUrlBuilder: L'instance courante pour le chaînage des méthodes
        """
        location_parts = [name.replace(' ', '-')]  # Remplacer les espaces par des tirets
        
        if postal_code:
            location_parts.append(str(postal_code))
        
        if lat is not None and lon is not None:
            location_parts.extend(['', f"{lat}_{lon}_{radius}"])
        
        new_location = '_'.join(location_parts)
        
        # Si c'est la première localisation, on initialise, sinon on ajoute avec une virgule
        if 'locations' not in self.params or not self.params['locations']:
            self.params['locations'] = new_location
        else:
            self.params['locations'] += f",{new_location}"
            
        return self
    
    def clear_locations(self):
        """Efface toutes les localisations"""
        self.params['locations'] = ''
        return self
    
    def set_price_range(self, min_price=None, max_price=None):
        """Définit la fourchette de prix"""
        if min_price is not None and max_price is not None:
            self.params['price'] = f"{min_price}-{max_price}"
        elif min_price is not None:
            self.params['price'] = f"{min_price}-"
        elif max_price is not None:
            self.params['price'] = f"-{max_price}"
        return self
    
    def set_surface_range(self, min_surface=None, max_surface=None):
        """Définit la fourchette de surface"""
        if min_surface is not None and max_surface is not None:
            self.params['square'] = f"{min_surface}-{max_surface}"
        elif min_surface is not None:
            self.params['square'] = f"{min_surface}-"
        elif max_surface is not None:
            self.params['square'] = f"-{max_surface}"
        return self
    
    def set_rooms_range(self, min_rooms=None, max_rooms=None):
        """Définit le nombre de pièces"""
        if min_rooms is not None and max_rooms is not None:
            self.params['rooms'] = f"{min_rooms}-{max_rooms}"
        return self
    
    def set_bedrooms_range(self, min_bedrooms=None, max_bedrooms=None):
        """Définit le nombre de chambres"""
        if min_bedrooms is not None and max_bedrooms is not None:
            self.params['bedrooms'] = f"{min_bedrooms}-{max_bedrooms}"
        return self
    
    def set_property_types(self, *types):
        """Définit les types de biens (1=Maison, 2=Appartement)"""
        if types:
            self.params['real_estate_type'] = ','.join(str(t) for t in types)
        return self
    
    def build(self, category_id=None, custom_params=None):
        """
        Construit et retourne l'URL finale
        
        Args:
            category_id (str, optional): ID de la catégorie à utiliser. Si None, utilise la catégorie actuelle.
            custom_params (dict, optional): Dictionnaire de paramètres personnalisés à utiliser au lieu des paramètres par défaut.
            
        Returns:
            str: L'URL générée
        """
        # Utiliser les paramètres personnalisés si fournis, sinon une copie des paramètres actuels
        params = custom_params.copy() if custom_params is not None else self.params.copy()
        
        # Mettre à jour la catégorie si spécifiée
        if category_id is not None:
            params['category'] = category_id
        
        # Nettoyer les paramètres vides
        params = {k: v for k, v in params.items() if v is not None and v != ''}
        
        # Construire l'URL
        query_string = urlencode(params, doseq=True)
        return f"{self.BASE_URL}?{query_string}"
    
    def get_rental_url(self):
        """
        Retourne une URL pour la location (catégorie 10) avec des paramètres optimisés
        pour la recherche de locations (appartements et maisons).
        
        Returns:
            str: URL pour la recherche de locations
        """
        # Créer une copie des paramètres de location par défaut
        rental_params = RENTAL_PARAMS.copy()
        
        # Ajouter la localisation si elle existe
        if 'locations' in self.params and self.params['locations']:
            rental_params['locations'] = self.params['locations']
        
        # Construire l'URL avec les paramètres optimisés pour la location
        return self.build(category_id='10', custom_params=rental_params)
        
    def __str__(self):
        """
        Retourne la représentation en chaîne de l'URL construite.
        
        Returns:
            str: URL complète avec les paramètres actuels
        """
        return self.build()


if __name__ == "__main__":
    # Exemple d'utilisation
    builder = LBCUrlBuilder()
    
    # Modifier les paramètres
    builder \
        .set_price_range(20000, 300000) \
        .set_surface_range(50, 100) \
        .set_rooms_range(2, 3) \
        .set_bedrooms_range(1, 2) \
        .set_property_types(1, 2)  # Maison et appartement
    
    # Ajouter des localisations
    #builder.clear_locations()
    #builder.add_location("Albi", "81000", "43.92617", "2.14838", 10000)
    #builder.add_location("Toulouse", "31000", "43.60426", "1.44367", 20000)
    
    # Afficher l'URL générée
    print("URL de recherche :")
    print(builder.build())
