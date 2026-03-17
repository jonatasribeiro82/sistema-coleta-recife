from __future__ import annotations
import shutil
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, File, Form, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Imports dos seus serviços
from core.api_config import (
    ALLOWED_HEADERS, ALLOWED_METHODS, ALLOWED_ORIGINS, ALLOW_CREDENTIALS,
    API_DESCRIPTION, API_TITLE, API_VERSION
)
from core.gps_extractor import GPSExtractor
from models.api_schemas import (
    APIResponse, OccurrenceListResponse, OccurrenceMediaResponse
)
from services.database_service import DatabaseService
from services.occurrence_service import OccurrenceService
from services.vision_service import VisionService

app = FastAPI(title=API_TITLE, description=API_DESCRIPTION, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=ALLOWED_METHODS, allow_headers=ALLOWED_HEADERS,
)

# Inicialização dos serviços
database_service = DatabaseService()
occurrence_service = OccurrenceService()
gps_extractor = GPSExtractor()
vision_service = VisionService(model_path="yolov8n.pt")

UPLOAD_DIR = Path("data/raw_images")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ANNOTATED_DIR = Path("output/reports")
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/media/raw", StaticFiles(directory=str(UPLOAD_DIR)), name="media_raw")
app.mount("/media/annotated", StaticFiles(directory=str(ANNOTATED_DIR)), name="media_annotated")

def build_media_url(request: Request, file_path: str | None, media_type: str) -> str | None:
    if not file_path: return None
    file_name = Path(file_path).name
    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/media/{'raw' if media_type == 'raw' else 'annotated'}/{file_name}"

@app.get("/")
def root():
    return {"message": "API Waste Intelligence Online"}

@app.get("/occurrences", response_model=OccurrenceListResponse)
def list_occurrences(limit: int = Query(default=20)):
    result = database_service.list_occurrences(limit=limit)
    return OccurrenceListResponse(success=result["success"], count=result["count"], items=result["items"])

@app.get("/occurrences/{occurrence_id}/media", response_model=OccurrenceMediaResponse)
def get_occurrence_media_route(occurrence_id: str, request: Request):
    try:
        result = database_service.get_occurrence_by_id(occurrence_id)
        if result["success"] and result["item"]:
            occ_data = result["item"]
            return OccurrenceMediaResponse(
                success=True,
                occurrence_id=occurrence_id,
                original_image_url=build_media_url(request, occ_data.get("image_path"), "raw"),
                annotated_image_url=build_media_url(request, occ_data.get("annotated_image_path"), "annotated")
            )
        return OccurrenceMediaResponse(success=False, occurrence_id=occurrence_id, error="Não encontrado.")
    except Exception as e:
        return OccurrenceMediaResponse(success=False, occurrence_id=occurrence_id, error=str(e))

@app.post("/occurrences/upload")
async def upload_occurrence_image(
    request: Request, 
    file: UploadFile = File(...), 
    camera_id: str = Form(default=None),
    latitude: float = Form(default=None),
    longitude: float = Form(default=None),
    run_detection: str = Form(default="true")
):
    try:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        saved_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        saved_path = UPLOAD_DIR / saved_filename
        
        with saved_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 🌍 Lógica de Localização com Geocoding Reverso
        if latitude and longitude:
            # ✅ AQUI ESTÁ A MUDANÇA: O SISTEMA BUSCA O ENDEREÇO REAL
            endereco_real = gps_extractor.get_address_from_coords(latitude, longitude)
            
            location_analysis = {
                "latitude": latitude, 
                "longitude": longitude, 
                "address": endereco_real, 
                "city": "Recife/PE"
            }
        else:
            # Senão, tenta ler da foto (extractor)
            location_analysis = gps_extractor.resolve_location(str(saved_path), camera_id)

        vision_analysis = vision_service.predict_image(str(saved_path)) if run_detection == "true" else None

        occ_payload = occurrence_service.build_occurrence_payload(
            image_path=str(saved_path), camera_id=camera_id, 
            source_type="manual_upload", reported_by="web_user",
            location_analysis=location_analysis, vision_analysis=vision_analysis
        )
        
        database_service.save_occurrence(occ_payload)
        return APIResponse(success=True, message="Ocorrência registrada!")
    except Exception as e:
        return APIResponse(success=False, message=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)