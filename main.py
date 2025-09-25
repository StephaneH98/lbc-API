import sys
from scraper import download_page

def main():
    # Vérifier que l'URL est fournie
    if len(sys.argv) < 2:
        print("Usage: python main.py <URL> [output_file]")
        sys.exit(1)
    
    url = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "page_telechargee.html"
    
    print("Démarrage du téléchargement avec Selenium...")
    print("Remarque : Un navigateur Chrome va s'ouvrir automatiquement.")
    
    # Télécharger la page
    download_page(url, output_path)

if __name__ == "__main__":
    main()