from __future__ import annotations
import shutil
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, File, Form, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.api_config import (
    ALLOWED_HEADERS, ALLOWED_METHODS, ALLOWED_ORIGINS, ALLOW_CREDENTIALS,
    API_DESCRIPTION, API_TITLE, API_VERSION
)
from core.gps_extractor import GPSExtractor
from models.api_schemas import (
    APIResponse, OccurrenceCreateRequest, OccurrenceItemResponse,
    OccurrenceListResponse, OccurrenceMediaResponse
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
    path = Path(file_path)
    if media_type == "raw": return str(request.base_url).rstrip("/") + f"/media/raw/{path.name}"
    if media_type == "annotated": return str(request.base_url).rstrip("/") + f"/media/annotated/{path.name}"
    return None

@app.get("/", response_model=APIResponse)
def root() -> APIResponse:
    return APIResponse(success=True, message="API Waste Intelligence online.", data={"service": "waste-intelligence-mvp", "version": API_VERSION, "status": "running", "allowed_origins": ALLOWED_ORIGINS})

@app.get("/health", response_model=APIResponse)
def health_check() -> APIResponse:
    return APIResponse(success=True, message="Health check ok.", data={"api": "ok", "database": "ok", "cors": "enabled"})

@app.get("/occurrences", response_model=OccurrenceListResponse)
def list_occurrences(limit: int = Query(default=20, ge=1, le=200)) -> OccurrenceListResponse:
    result = database_service.list_occurrences(limit=limit)
    return OccurrenceListResponse(success=result["success"], count=result["count"], items=result["items"])

@app.get("/occurrences/filter", response_model=OccurrenceListResponse)
def filter_occurrences(
    status: str | None = Query(default=None), priority: str | None = Query(default=None),
    camera_id: str | None = Query(default=None), date_start: str | None = Query(default=None),
    date_end: str | None = Query(default=None), limit: int = Query(default=20, ge=1, le=200)
) -> OccurrenceListResponse:
    result = database_service.filter_occurrences(status=status, priority=priority, camera_id=camera_id, date_start=date_start, date_end=date_end, limit=limit)
    return OccurrenceListResponse(success=result["success"], count=result["count"], items=result["items"])

@app.get("/occurrences/{occurrence_id}", response_model=OccurrenceItemResponse)
def get_occurrence(occurrence_id: str) -> OccurrenceItemResponse:
    result = database_service.get_occurrence_by_id(occurrence_id)
    return OccurrenceItemResponse(success=result["success"], occurrence_id=occurrence_id, item=result.get("item"), message=result.get("message"))

@app.get("/occurrences/{occurrence_id}/media", response_model=OccurrenceMediaResponse)
def get_occurrence_media(occurrence_id: str, request: Request) -> OccurrenceMediaResponse:
    result = database_service.get_occurrence_by_id(occurrence_id)
    if not result["success"] or not result.get("item"):
        return OccurrenceMediaResponse(success=False, occurrence_id=occurrence_id, message="Não encontrada.")
    item = result["item"]
    original_url = build_media_url(request, item.get("image_path"), "raw")
    annotated_url = build_media_url(request, item.get("annotated_image_path"), "annotated")
    return OccurrenceMediaResponse(success=True, occurrence_id=occurrence_id, original_image_url=original_url, annotated_image_url=annotated_url, message="Sucesso.")

@app.post("/occurrences", response_model=APIResponse)
def create_occurrence(payload: OccurrenceCreateRequest) -> APIResponse:
    occ_payload = occurrence_service.build_occurrence_payload(
        image_path=payload.image_path, camera_id=payload.camera_id, source_type=payload.source_type,
        reported_by=payload.reported_by, location_analysis=payload.location_analysis,
        vision_analysis=payload.vision_analysis, extra_metadata=payload.extra_metadata
    )
    db_result = database_service.save_occurrence(occ_payload)
    if not db_result["success"]: return APIResponse(success=False, message=db_result["message"])
    return APIResponse(success=True, message="Criada via API.", data={"occurrence_id": occ_payload["occurrence_id"]})

@app.post("/occurrences/upload", response_model=APIResponse)
async def upload_occurrence_image(
    request: Request, file: UploadFile = File(...), camera_id: str | None = Form(default=None),
    source_type: str = Form(default="manual_upload"), reported_by: str = Form(default="api_upload"),
    run_detection: bool = Form(default=True)
) -> APIResponse:
    try:
        if not file.filename: return APIResponse(success=False, message="Sem nome de arquivo.", data=None)
        allowed_extensions = {".jpg", ".jpeg", ".png"}
        original_suffix = Path(file.filename).suffix.lower()
        if original_suffix not in allowed_extensions: return APIResponse(success=False, message="Formato não suportado.", data=None)

        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        safe_name = Path(file.filename).stem.replace(" ", "_").lower()
        saved_filename = f"{timestamp}_{safe_name}{original_suffix}"
        saved_path = UPLOAD_DIR / saved_filename

        with saved_path.open("wb") as buffer: shutil.copyfileobj(file.file, buffer)

        location_analysis = gps_extractor.resolve_location(image_path=str(saved_path), camera_id=camera_id)
        vision_analysis = vision_service.predict_image(str(saved_path)) if run_detection else None

        extra_metadata = {"origin": "api_upload", "original_filename": file.filename}
        occ_payload = occurrence_service.build_occurrence_payload(
            image_path=str(saved_path), camera_id=camera_id, source_type=source_type,
            reported_by=reported_by, location_analysis=location_analysis,
            vision_analysis=vision_analysis, extra_metadata=extra_metadata
        )

        occurrence_service.save_occurrence(occ_payload)
        db_result = database_service.save_occurrence(occ_payload)

        annotated_path = vision_analysis.get("annotated_image_path") if vision_analysis else None
        original_url = build_media_url(request, str(saved_path), "raw")
        annotated_url = build_media_url(request, annotated_path, "annotated")

        return APIResponse(success=True, message="Upload processado.", data={"original_image_url": original_url, "annotated_image_url": annotated_url, "occurrence_id": occ_payload["occurrence_id"]})
    except Exception as exc: return APIResponse(success=False, message=f"Erro: {str(exc)}", data=None)