from __future__ import annotations

from pathlib import Path
from math import radians, sin, cos, sqrt, atan2

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

    file_name = Path(file_path).name
    base_url = str(request.base_url).rstrip("/")
    return f"{base_url}/media/{'raw' if media_type == 'raw' else 'annotated'}/{file_name}"


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_m = 6371000.0

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)

    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    )
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return earth_radius_m * c


def classify_location_confidence(accuracy: float | None, conflict: bool) -> str:
    if conflict:
        return "baixa"

    if accuracy is None:
        return "média"

    if accuracy <= 20:
        return "alta"
    if accuracy <= 80:
        return "média"
    return "baixa"


def build_location_analysis(
    saved_path: Path,
    gps_extractor: GPSExtractor,
    latitude: float | None,
    longitude: float | None,
    accuracy: float | None,
    camera_id: str | None,
) -> dict:
    exif_location = gps_extractor.resolve_location(str(saved_path), camera_id)

    exif_lat = exif_location.get("latitude")
    exif_lon = exif_location.get("longitude")
    exif_address = exif_location.get("address")
    exif_city = exif_location.get("city")

    has_device_gps = latitude is not None and longitude is not None
    has_exif_gps = exif_lat is not None and exif_lon is not None

    if has_device_gps:
        resolved_address = gps_extractor.get_address_from_coords(latitude, longitude)

        location_analysis = {
            "latitude": latitude,
            "longitude": longitude,
            "address": resolved_address,
            "city": "Recife/PE",
            "location_source": "device_gps",
            "device_latitude": latitude,
            "device_longitude": longitude,
            "device_accuracy_m": accuracy,
            "exif_latitude": exif_lat,
            "exif_longitude": exif_lon,
            "exif_address": exif_address,
            "location_conflict": False,
            "location_conflict_distance_m": None,
            "location_confidence": "média",
        }

        if has_exif_gps:
            try:
                distance_m = haversine_meters(latitude, longitude, exif_lat, exif_lon)
                location_analysis["location_conflict_distance_m"] = round(distance_m, 2)

                if distance_m > 300:
                    location_analysis["location_conflict"] = True
            except Exception:
                pass

        location_analysis["location_confidence"] = classify_location_confidence(
            accuracy=accuracy,
            conflict=location_analysis["location_conflict"],
        )

        return location_analysis

    if has_exif_gps:
        return {
            "latitude": exif_lat,
            "longitude": exif_lon,
            "address": exif_address,
            "city": exif_city or "Recife/PE",
            "location_source": "image_exif",
            "device_latitude": None,
            "device_longitude": None,
            "device_accuracy_m": None,
            "exif_latitude": exif_lat,
            "exif_longitude": exif_lon,
            "exif_address": exif_address,
            "location_conflict": False,
            "location_conflict_distance_m": None,
            "location_confidence": "média",
        }

    return {
        "latitude": None,
        "longitude": None,
        "address": "Localização não identificada",
        "city": "Recife/PE",
        "location_source": "unresolved",
        "device_latitude": None,
        "device_longitude": None,
        "device_accuracy_m": None,
        "exif_latitude": None,
        "exif_longitude": None,
        "exif_address": None,
        "location_conflict": False,
        "location_conflict_distance_m": None,
        "location_confidence": "baixa",
    }


@app.get("/")
def root():
    return {"message": "API Waste Intelligence Online"}


@app.get("/health")
def health_check():
    return {
        "success": True,
        "message": "Verificação de integridade ok.",
        "data": {
            "api": "ok",
            "database": "ok",
            "cors": "enabled",
        },
    }


@app.get("/occurrences", response_model=OccurrenceListResponse)
def list_occurrences(limit: int = Query(default=20)):
    result = database_service.list_occurrences(limit=limit)
    return OccurrenceListResponse(
        success=result["success"],
        count=result["count"],
        items=result["items"],
    )


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
                annotated_image_url=build_media_url(request, occ_data.get("annotated_image_path"), "annotated"),
            )

        return OccurrenceMediaResponse(
            success=False,
            occurrence_id=occurrence_id,
            error="Não encontrado.",
        )

    except Exception as e:
        return OccurrenceMediaResponse(
            success=False,
            occurrence_id=occurrence_id,
            error=str(e),
        )


@app.post("/occurrences/upload")
async def upload_occurrence_image(
    request: Request,
    file: UploadFile = File(...),
    camera_id: str = Form(default=None),
    latitude: float = Form(default=None),
    longitude: float = Form(default=None),
    accuracy: float = Form(default=None),
    run_detection: str = Form(default="true"),
):
    try:
        if not file.filename:
            return APIResponse(success=False, message="Arquivo sem nome.")

        raw_path_str = save_upload_file_securely(file, str(UPLOAD_DIR))
        saved_path = Path(raw_path_str)

        location_analysis = build_location_analysis(
            saved_path=saved_path,
            gps_extractor=gps_extractor,
            latitude=latitude,
            longitude=longitude,
            accuracy=accuracy,
            camera_id=camera_id,
        )

        vision_analysis = None
        if run_detection == "true":
            try:
                vision_analysis = vision_service.predict_image(str(saved_path))
            except Exception as vision_exc:
                vision_analysis = {
                    "success": False,
                    "message": f"Falha na visão computacional: {str(vision_exc)}",
                    "annotated_image_path": None,
                }

        occ_payload = occurrence_service.build_occurrence_payload(
            image_path=str(saved_path),
            camera_id=camera_id,
            source_type="manual_upload",
            reported_by="web_user",
            location_analysis=location_analysis,
            vision_analysis=vision_analysis,
        )

        database_result = database_service.save_occurrence(occ_payload)
        if not database_result.get("success", False):
            return APIResponse(
                success=False,
                message=database_result.get("message", "Erro ao salvar ocorrência."),
            )

        return APIResponse(
            success=True,
            message="Ocorrência registrada!",
            data={
                "occurrence_id": occ_payload.get("occurrence_id"),
                "original_image_url": build_media_url(request, str(saved_path), "raw"),
                "annotated_image_url": build_media_url(
                    request,
                    vision_analysis.get("annotated_image_path") if vision_analysis else None,
                    "annotated",
                ),
                "location_source": location_analysis.get("location_source"),
                "location_conflict": location_analysis.get("location_conflict"),
                "location_conflict_distance_m": location_analysis.get("location_conflict_distance_m"),
                "location_confidence": location_analysis.get("location_confidence"),
                "device_accuracy_m": location_analysis.get("device_accuracy_m"),
            },
        )

    except Exception as e:
        return APIResponse(success=False, message=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)