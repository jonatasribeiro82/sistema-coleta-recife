from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

from geopy.geocoders import Nominatim
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS


class GPSExtractor:
    def __init__(self):
        # Serviço gratuito do OpenStreetMap
        self.geolocator = Nominatim(user_agent="waste_intelligence_app")

    @staticmethod
    def _convert_to_decimal(value: Any) -> Optional[float]:
        """
        Converte coordenadas EXIF (graus/minutos/segundos) em decimal.
        """
        try:
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        except Exception:
            return None

    def _extract_exif_gps(self, image_path: str) -> tuple[Optional[float], Optional[float]]:
        """
        Tenta extrair latitude/longitude dos metadados EXIF da imagem.
        """
        try:
            image_file = Path(image_path)
            if not image_file.exists():
                return None, None

            with Image.open(image_file) as img:
                exif = img._getexif()
                if not exif:
                    return None, None

                gps_info = {}
                for key, value in exif.items():
                    tag = TAGS.get(key)
                    if tag == "GPSInfo":
                        for t in value:
                            sub_tag = GPSTAGS.get(t)
                            gps_info[sub_tag] = value[t]

                lat = self._convert_to_decimal(gps_info.get("GPSLatitude"))
                lon = self._convert_to_decimal(gps_info.get("GPSLongitude"))

                if lat is None or lon is None:
                    return None, None

                if gps_info.get("GPSLatitudeRef") == "S":
                    lat = -lat
                if gps_info.get("GPSLongitudeRef") == "W":
                    lon = -lon

                return lat, lon

        except Exception:
            return None, None

    def get_address_from_coords(self, lat: Optional[float], lon: Optional[float]) -> str:
        """
        Transforma latitude/longitude em endereço textual.
        """
        try:
            if lat is None or lon is None:
                return "Coordenadas não fornecidas"

            location = self.geolocator.reverse(f"{lat}, {lon}", timeout=10)
            if location:
                return location.address

            return f"Lat: {lat}, Lon: {lon}"

        except Exception as e:
            print(f"Erro no geocoding reverso: {e}")
            return f"Lat: {lat}, Lon: {lon} (Sem conexão com serviço de mapa)"

    def _get_city_from_address(self, address: str) -> str:
        """
        Tenta inferir cidade a partir do endereço textual.
        """
        if not address:
            return "Recife"

        address_lower = address.lower()

        if "paulista" in address_lower:
            return "Paulista/PE"
        if "olinda" in address_lower:
            return "Olinda/PE"
        if "jaboatão" in address_lower or "jaboatao" in address_lower:
            return "Jaboatão dos Guararapes/PE"
        if "recife" in address_lower:
            return "Recife/PE"

        return "Recife/PE"

    def resolve_location(self, image_path: str, camera_id: str = None) -> dict[str, Any]:
        """
        Tenta resolver localização prioritariamente pela imagem (EXIF).
        Se não encontrar, devolve estrutura padrão sem quebrar o sistema.
        """
        lat, lon = self._extract_exif_gps(image_path)

        if lat is not None and lon is not None:
            address = self.get_address_from_coords(lat, lon)
            city = self._get_city_from_address(address)

            return {
                "latitude": lat,
                "longitude": lon,
                "address": address,
                "city": city,
                "location_source": "image_exif"
            }

        return {
            "latitude": None,
            "longitude": None,
            "address": "Localização não identificada na imagem",
            "city": "Recife/PE",
            "location_source": "unresolved"
        }