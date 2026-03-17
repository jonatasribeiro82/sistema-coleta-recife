from geopy.geocoders import Nominatim
from pathlib import Path

class GPSExtractor:
    def __init__(self):
        # Nominatim é o serviço gratuito do OpenStreetMap
        self.geolocator = Nominatim(user_agent="waste_intelligence_app")

    def resolve_location(self, image_path: str, camera_id: str = None):
        """
        Função padrão para extração de dados da imagem.
        """
        return {
            "latitude": None,
            "longitude": None,
            "address": "Localização não identificada na imagem",
            "city": "Recife"
        }

    def get_address_from_coords(self, lat, lon):
        """
        Transforma Latitude e Longitude em nome de Rua/Bairro.
        """
        try:
            if lat is None or lon is None:
                return "Coordenadas não fornecidas"
            
            location = self.geolocator.reverse(f"{lat}, {lon}", timeout=10)
            if location:
                return location.address
            return f"Lat: {lat}, Lon: {lon}"
        except Exception as e:
            print(f"Erro no Geocoding: {e}")
            return f"Lat: {lat}, Lon: {lon} (Sem conexão com serviço de mapa)"