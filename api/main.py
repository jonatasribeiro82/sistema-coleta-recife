from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, Form, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from core.api_config import (
    ALLOWED_HEADERS,
    ALLOWED_METHODS,
    ALLOWED_ORIGINS,
    ALLOW_CREDENTIALS,
    API_DESCRIPTION,
    API_TITLE,
    API_VERSION,
)
from core.gps_extractor import GPSExtractor
from models.api_schemas import (
    APIResponse,
    OccurrenceCreateRequest,
    OccurrenceItemResponse,
    OccurrenceListResponse,
    OccurrenceMediaResponse,
)
from services.database_service import DatabaseService
from services.occurrence_service import OccurrenceService
from services.vision_service import VisionService
from services.file_service import save_upload_file_securely


app = FastAPI(title=API_TITLE, description=API_DESCRIPTION, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
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
    if not file_path:
        return None

    path = Path(file_path)
    base = str(request.base_url).rstrip("/")

    if media_type == "raw":
        return f"{base}/media/raw/{path.name}"
    if media_type == "annotated":
        return f"{base}/media/annotated/{path.name}"
    return None


@app.get("/", response_model=APIResponse)
def root() -> APIResponse:
    return APIResponse(
        success=True,
        message="API Waste Intelligence online.",
        data={
            "service": "waste-intelligence-mvp",
            "version": API_VERSION,
            "status": "running",
            "allowed_origins": ALLOWED_ORIGINS,
        },
    )


@app.get("/health", response_model=APIResponse)
def health_check() -> APIResponse:
    return APIResponse(
        success=True,
        message="Health check ok.",
        data={"api": "ok", "database": "ok", "cors": "enabled"},
    )


@app.get("/occurrences", response_model=OccurrenceListResponse)
def list_occurrences(limit: int = Query(default=20, ge=1, le=200)) -> OccurrenceListResponse:
    result = database_service.list_occurrences(limit=limit)
    return OccurrenceListResponse(
        success=result["success"],
        count=result["count"],
        items=result["items"],
    )


@app.get("/occurrences/filter", response_model=OccurrenceListResponse)
def filter_occurrences(
    status: str | None = Query(default=None),
    priority: str | None = Query(default=None),
    camera_id: str | None = Query(default=None),
    date_start: str | None = Query(default=None),
    date_end: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
) -> OccurrenceListResponse:
    result = database_service.filter_occurrences(
        status=status,
        priority=priority,
        camera_id=camera_id,
        date_start=date_start,
        date_end=date_end,
        limit=limit,
    )
    return OccurrenceListResponse(
        success=result["success"],
        count=result["count"],
        items=result["items"],
    )


@app.get("/occurrences/{occurrence_id}", response_model=OccurrenceItemResponse)
def get_occurrence(occurrence_id: str) -> OccurrenceItemResponse:
    result = database_service.get_occurrence_by_id(occurrence_id)
    return OccurrenceItemResponse(
        success=result["success"],
        occurrence_id=occurrence_id,
        item=result.get("item"),
        message=result.get("message"),
    )


@app.get("/occurrences/{occurrence_id}/media", response_model=OccurrenceMediaResponse)
def get_occurrence_media(occurrence_id: str, request: Request) -> OccurrenceMediaResponse:
    result = database_service.get_occurrence_by_id(occurrence_id)

    if not result["success"] or not result.get("item"):
        return OccurrenceMediaResponse(
            success=False,
            occurrence_id=occurrence_id,
            message="Não encontrada.",
        )

    item = result["item"]
    original_url = build_media_url(request, item.get("image_path"), "raw")
    annotated_url = build_media_url(request, item.get("annotated_image_path"), "annotated")

    return OccurrenceMediaResponse(
        success=True,
        occurrence_id=occurrence_id,
        original_image_url=original_url,
        annotated_image_url=annotated_url,
        message="Sucesso.",
    )


@app.post("/occurrences", response_model=APIResponse)
def create_occurrence(payload: OccurrenceCreateRequest) -> APIResponse:
    occ_payload = occurrence_service.build_occurrence_payload(
        image_path=payload.image_path,
        camera_id=payload.camera_id,
        source_type=payload.source_type,
        reported_by=payload.reported_by,
        location_analysis=payload.location_analysis,
        vision_analysis=payload.vision_analysis,
        extra_metadata=payload.extra_metadata,
    )

    db_result = database_service.save_occurrence(occ_payload)
    if not db_result["success"]:
        return APIResponse(success=False, message=db_result["message"])

    return APIResponse(
        success=True,
        message="Criada via API.",
        data={"occurrence_id": occ_payload["occurrence_id"]},
    )


@app.post("/occurrences/upload", response_model=APIResponse)
async def upload_occurrence_image(
    request: Request,
    file: UploadFile = File(...),
    camera_id: str | None = Form(default=None),
    source_type: str = Form(default="manual_upload"),
    reported_by: str = Form(default="api_upload"),
    run_detection: bool = Form(default=True),
) -> APIResponse:
    raw_path_str: str | None = None
    annotated_path: str | None = None

    try:
        if not file.filename:
            return APIResponse(success=False, message="Sem nome de arquivo.", data=None)

        raw_path_str = save_upload_file_securely(file, str(UPLOAD_DIR))

        location_analysis = gps_extractor.resolve_location(
            image_path=raw_path_str,
            camera_id=camera_id,
        )

        vision_analysis = None
        if run_detection:
            try:
                vision_analysis = vision_service.predict_image(raw_path_str)
            except Exception as vision_exc:
                vision_analysis = {
                    "success": False,
                    "message": f"Falha na visão computacional: {str(vision_exc)}",
                    "annotated_image_path": None,
                }

        extra_metadata = {
            "origin": "api_upload",
            "original_filename": file.filename,
            "uploaded_at": datetime.utcnow().isoformat(),
        }

        occ_payload = occurrence_service.build_occurrence_payload(
            image_path=raw_path_str,
            camera_id=camera_id,
            source_type=source_type,
            reported_by=reported_by,
            location_analysis=location_analysis,
            vision_analysis=vision_analysis,
            extra_metadata=extra_metadata,
        )

        db_result = database_service.save_occurrence(occ_payload)
        if not db_result["success"]:
            return APIResponse(success=False, message=db_result["message"], data=None)

        if vision_analysis:
            annotated_path = vision_analysis.get("annotated_image_path")

        original_url = build_media_url(request, raw_path_str, "raw")
        annotated_url = build_media_url(request, annotated_path, "annotated")

        return APIResponse(
            success=True,
            message="Upload processado.",
            data={
                "original_image_url": original_url,
                "annotated_image_url": annotated_url,
                "occurrence_id": occ_payload["occurrence_id"],
            },
        )

    except Exception as exc:
        return APIResponse(
            success=False,
            message=f"Erro: {str(exc)}",
            data=None,
        )