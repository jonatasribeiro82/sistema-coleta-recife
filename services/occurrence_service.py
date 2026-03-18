from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4


class OccurrenceService:
    def __init__(self, output_dir: str = "data/processed") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def _generate_occurrence_id() -> str:
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        short_uuid = str(uuid4())[:8]
        return f"OCC-{timestamp}-{short_uuid}"

    @staticmethod
    def _define_priority(
        location_analysis: Optional[Dict[str, Any]],
        vision_analysis: Optional[Dict[str, Any]],
    ) -> str:
        """
        Define prioridade baseada principalmente na severidade estimada pela visão.
        """
        if not vision_analysis or not vision_analysis.get("success"):
            return "pendente_análise"

        waste_estimation = vision_analysis.get("summary", {}).get("waste_estimation", {})
        severity = waste_estimation.get("severity", "baixo")
        estimated_items_count = waste_estimation.get("estimated_items_count", 0)

        if severity == "crítico":
            return "crítica"
        if severity == "alto":
            return "alta"
        if severity == "médio":
            return "média"
        if estimated_items_count > 0:
            return "baixa"

        return "monitoramento"

    @staticmethod
    def _define_status(vision_analysis: Optional[Dict[str, Any]]) -> str:
        """
        Define status da ocorrência com base no processamento visual.
        """
        if not vision_analysis:
            return "recebida"

        if not vision_analysis.get("success"):
            return "erro_processamento"

        total_detections = vision_analysis.get("summary", {}).get("total_detections", 0)
        return "detectada" if total_detections > 0 else "sem_detecção"

    @staticmethod
    def _normalize_location_analysis(location_analysis: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Garante que a estrutura mínima exista para evitar None inesperado.
        """
        return location_analysis or {}

    @staticmethod
    def _normalize_vision_analysis(vision_analysis: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Mantém vision_analysis como None ou dict coerente.
        """
        if vision_analysis is None:
            return None

        if not isinstance(vision_analysis, dict):
            return {
                "success": False,
                "message": "vision_analysis inválido",
                "summary": {
                    "total_detections": 0,
                    "waste_category_summary": {},
                    "waste_estimation": {
                        "image_area": 0,
                        "total_detected_area": 0,
                        "occupied_ratio": 0,
                        "estimated_volume_label": "desconhecido",
                        "severity": "desconhecido",
                        "estimated_items_count": 0,
                    },
                },
                "annotated_image_path": None,
            }

        return vision_analysis

    def build_occurrence_payload(
        self,
        image_path: Optional[str] = None,
        camera_id: Optional[str] = None,
        source_type: str = "manual_upload",
        reported_by: str = "sistema",
        location_analysis: Optional[Dict[str, Any]] = None,
        vision_analysis: Optional[Dict[str, Any]] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        normalized_location = self._normalize_location_analysis(location_analysis)
        normalized_vision = self._normalize_vision_analysis(vision_analysis)

        return {
            "occurrence_id": self._generate_occurrence_id(),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "source": {
                "source_type": source_type,
                "image_path": image_path,
                "camera_id": camera_id,
                "reported_by": reported_by,
            },
            "status": self._define_status(normalized_vision),
            "priority": self._define_priority(normalized_location, normalized_vision),
            "location_analysis": normalized_location,
            "vision_analysis": normalized_vision,
            "extra_metadata": extra_metadata or {},
        }

    def save_occurrence(self, occurrence_payload: Dict[str, Any]) -> Dict[str, Any]:
        occurrence_id = occurrence_payload["occurrence_id"]
        output_file = self.output_dir / f"{occurrence_id}.json"

        with open(output_file, "w", encoding="utf-8") as file:
            json.dump(occurrence_payload, file, indent=4, ensure_ascii=False)

        return {
            "success": True,
            "occurrence_id": occurrence_id,
            "file_path": str(output_file),
            "message": "Ocorrência salva com sucesso.",
        }