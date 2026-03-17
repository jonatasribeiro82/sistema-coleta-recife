from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_IMAGES_DIR = DATA_DIR / "raw_images"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_DIR = BASE_DIR / "output"
LOGS_DIR = OUTPUT_DIR / "logs"
REPORTS_DIR = OUTPUT_DIR / "reports"

CAMERA_LOCATIONS_FILE = DATA_DIR / "camera_locations.json"

GEOCODER_USER_AGENT = "waste_intelligence_mvp"
DEFAULT_TIMEOUT = 10