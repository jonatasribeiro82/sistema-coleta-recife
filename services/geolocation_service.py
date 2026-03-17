from typing import Optional, Dict, Any
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable, GeopyError
from geopy.geocoders import Nominatim
from core.config import GEOCODER_USER_AGENT, DEFAULT_TIMEOUT

class GeolocationService:
    def __init__(self) -> None:
        self.geolocator = Nominatim(user_agent=GEOCODER_USER_AGENT, timeout=DEFAULT_TIMEOUT)

    def reverse_geocode(self, latitude: float, longitude: float) -> Dict[str, Any]:
        try:
            location = self.geolocator.reverse((latitude, longitude), exactly_one=True, language="pt-BR")
            if not location:
                return {"success": False, "address": None, "raw": None, "message": "Nenhum endereço encontrado."}
            return {"success": True, "address": location.address, "raw": location.raw, "message": "Sucesso."}
        except (GeocoderTimedOut, GeocoderUnavailable, GeopyError) as exc:
            return {"success": False, "address": None, "raw": None, "message": f"Erro: {str(exc)}"}