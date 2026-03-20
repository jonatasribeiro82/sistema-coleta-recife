from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OccurrenceCreateRequest(BaseModel):
    image_path: Optional[str] = Field(default=None, description="Caminho da imagem no sistema")
    camera_id: Optional[str] = Field(default=None, description="ID da câmera fixa")
    source_type: str = Field(default="manual_upload", description="Origem da ocorrência")
    reported_by: str = Field(default="api_user", description="Responsável pelo registro")
    location_analysis: Optional[Dict[str, Any]] = Field(default=None, description="Resultado da análise de localização")
    vision_analysis: Optional[Dict[str, Any]] = Field(default=None, description="Resultado da análise visual")
    extra_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadados extras")


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class OccurrenceListItem(BaseModel):
    occurrence_id: str
    created_at: str
    source_type: Optional[str] = None
    image_path: Optional[str] = None
    camera_id: Optional[str] = None
    reported_by: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    total_detections: Optional[int] = None
    estimated_volume_label: Optional[str] = None
    severity: Optional[str] = None
    estimated_items_count: Optional[int] = None

    # Campo novo da camada operacional
    dominant_operational_category: Optional[str] = None

    annotated_image_path: Optional[str] = None

    # URLs prontas para o frontend
    original_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None


class OccurrenceListResponse(BaseModel):
    success: bool
    count: int
    items: List[OccurrenceListItem]


class OccurrenceItemResponse(BaseModel):
    success: bool
    occurrence_id: str
    item: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class OccurrenceMediaResponse(BaseModel):
    success: bool
    occurrence_id: str
    original_image_url: Optional[str] = None
    annotated_image_url: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None