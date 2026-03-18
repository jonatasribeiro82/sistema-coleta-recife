from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

geolocator = Nominatim(user_agent="waste_intelligence_recife_v5")


def _convert_to_decimal(value):
    try:
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        return None


def extract_exif_gps(image_path):
    try:
        with Image.open(image_path) as img:
            exif = img._getexif()
            if not exif:
                return None

            gps_info = {}
            for key, val in exif.items():
                if TAGS.get(key) == "GPSInfo":
                    for t in val:
                        gps_info[GPSTAGS.get(t)] = val[t]

            lat = _convert_to_decimal(gps_info.get("GPSLatitude"))
            lon = _convert_to_decimal(gps_info.get("GPSLongitude"))

            if lat is None or lon is None:
                return None

            if gps_info.get("GPSLatitudeRef") == "S":
                lat = -lat
            if gps_info.get("GPSLongitudeRef") == "W":
                lon = -lon

            return (lat, lon)

    except Exception:
        return None


def process_location_audit(dev_lat, dev_lon, accuracy, image_path):
    exif_gps = extract_exif_gps(image_path)
    exif_lat, exif_lon = exif_gps if exif_gps else (None, None)

    # REGRA 1: sem GPS do dispositivo
    if dev_lat is None or dev_lon is None:
        if exif_gps:
            final_lat, final_lon = exif_lat, exif_lon
            source = "exif_only"
            confidence = "medium_confidence"
            status = "resolved"
        else:
            final_lat, final_lon = None, None
            source = "missing"
            confidence = "low_confidence"
            status = "needs_review"

    # REGRA 2: com GPS do dispositivo
    else:
        final_lat, final_lon = dev_lat, dev_lon

        if exif_gps:
            diff = geodesic((dev_lat, dev_lon), exif_gps).meters
            if diff < 50:
                source = "hybrid_match"
                confidence = "high_confidence"
                status = "resolved"
            else:
                source = "hybrid_conflict"
                confidence = "low_confidence"
                status = "conflict"
        else:
            source = "device_only"
            status = "resolved"

            if accuracy is not None and accuracy <= 30:
                confidence = "high_confidence"
            elif accuracy is not None and accuracy > 100:
                confidence = "low_confidence"
                status = "needs_review"
            else:
                confidence = "medium_confidence"

    # reverse geocoding
    if final_lat is not None and final_lon is not None:
        try:
            location = geolocator.reverse(f"{final_lat}, {final_lon}", timeout=3)
            address = location.address if location else "Localização desconhecida"
            bairro = location.raw.get("address", {}).get("suburb", "N/A") if location else "N/A"
        except Exception:
            address, bairro = f"Coord: {final_lat:.5f}, {final_lon:.5f}", "N/A"
    else:
        address, bairro = "Sem localização definida", "N/A"

    return {
        "lat": final_lat,
        "lon": final_lon,
        "exif_lat": exif_lat,
        "exif_lon": exif_lon,
        "confidence": confidence,
        "status": status,
        "source": source,
        "address": address,
        "bairro": bairro,
    }