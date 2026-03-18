from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional


class DatabaseService:
    def __init__(self, db_path: str = "data/db/waste_intelligence.db") -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize_database()

    def _get_connection(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize_database(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS occurrences (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    occurrence_id TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    source_type TEXT,
                    image_path TEXT,
                    camera_id TEXT,
                    reported_by TEXT,
                    status TEXT,
                    priority TEXT,
                    latitude REAL,
                    longitude REAL,
                    address TEXT,
                    total_detections INTEGER,
                    estimated_volume_label TEXT,
                    severity TEXT,
                    estimated_items_count INTEGER,
                    annotated_image_path TEXT,
                    payload_json TEXT NOT NULL
                )
            """)
            for field in ["occurrence_id", "created_at", "status", "priority", "camera_id"]:
                cursor.execute(f"CREATE INDEX IF NOT EXISTS idx_occurrences_{field} ON occurrences ({field})")
            conn.commit()

    @staticmethod
    def _safe_get_location_fields(occurrence_payload: Dict[str, Any]) -> Dict[str, Optional[Any]]:
        loc = occurrence_payload.get("location_analysis") or {}
        return {
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "address": loc.get("address"),
        }

    @staticmethod
    def _safe_get_vision_fields(occurrence_payload: Dict[str, Any]) -> Dict[str, Optional[Any]]:
        vision = occurrence_payload.get("vision_analysis") or {}
        summary = vision.get("summary") or {}
        waste = summary.get("waste_estimation") or {}
        return {
            "total_detections": summary.get("total_detections"),
            "estimated_volume_label": waste.get("estimated_volume_label"),
            "severity": waste.get("severity"),
            "estimated_items_count": waste.get("estimated_items_count"),
            "annotated_image_path": vision.get("annotated_image_path"),
        }

    @staticmethod
    def _build_public_media_urls(row_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Acrescenta URLs públicas derivadas dos paths salvos no banco,
        sem remover os campos originais.
        """
        image_path = row_dict.get("image_path")
        annotated_path = row_dict.get("annotated_image_path")

        row_dict["original_image_url"] = None
        row_dict["annotated_image_url"] = None

        if image_path:
            row_dict["original_image_url"] = f"/media/raw/{Path(str(image_path)).name}"

        if annotated_path:
            row_dict["annotated_image_url"] = f"/media/annotated/{Path(str(annotated_path)).name}"

        return row_dict

    def save_occurrence(self, occurrence_payload: Dict[str, Any]) -> Dict[str, Any]:
        source = occurrence_payload.get("source") or {}
        loc = self._safe_get_location_fields(occurrence_payload)
        vis = self._safe_get_vision_fields(occurrence_payload)

        row_data = {
            "occurrence_id": occurrence_payload.get("occurrence_id"),
            "created_at": occurrence_payload.get("created_at"),
            "source_type": source.get("source_type"),
            "image_path": source.get("image_path"),
            "camera_id": source.get("camera_id"),
            "reported_by": source.get("reported_by"),
            "status": occurrence_payload.get("status"),
            "priority": occurrence_payload.get("priority"),
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude"),
            "address": loc.get("address"),
            "total_detections": vis.get("total_detections"),
            "estimated_volume_label": vis.get("estimated_volume_label"),
            "severity": vis.get("severity"),
            "estimated_items_count": vis.get("estimated_items_count"),
            "annotated_image_path": vis.get("annotated_image_path"),
            "payload_json": json.dumps(occurrence_payload, ensure_ascii=False),
        }

        try:
            with self._get_connection() as conn:
                conn.cursor().execute("""
                    INSERT INTO occurrences (
                        occurrence_id, created_at, source_type, image_path, camera_id, reported_by,
                        status, priority, latitude, longitude, address, total_detections,
                        estimated_volume_label, severity, estimated_items_count,
                        annotated_image_path, payload_json
                    ) VALUES (
                        :occurrence_id, :created_at, :source_type, :image_path, :camera_id, :reported_by,
                        :status, :priority, :latitude, :longitude, :address, :total_detections,
                        :estimated_volume_label, :severity, :estimated_items_count,
                        :annotated_image_path, :payload_json
                    )
                """, row_data)
                conn.commit()

            return {
                "success": True,
                "occurrence_id": row_data["occurrence_id"],
                "message": "Salvo no SQLite.",
            }

        except sqlite3.IntegrityError:
            return {"success": False, "message": "A ocorrência já existe no banco."}
        except Exception as exc:
            return {"success": False, "message": f"Erro: {str(exc)}"}

    def list_occurrences(self, limit: int = 20) -> Dict[str, Any]:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT
                        occurrence_id,
                        created_at,
                        source_type,
                        image_path,
                        camera_id,
                        reported_by,
                        status,
                        priority,
                        latitude,
                        longitude,
                        address,
                        total_detections,
                        estimated_volume_label,
                        severity,
                        estimated_items_count,
                        annotated_image_path
                    FROM occurrences
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))
                rows = cursor.fetchall()

            items = [self._build_public_media_urls(dict(row)) for row in rows]

            return {
                "success": True,
                "count": len(items),
                "items": items,
            }

        except Exception as exc:
            return {
                "success": False,
                "count": 0,
                "items": [],
                "message": f"Erro: {str(exc)}",
            }

    def filter_occurrences(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        camera_id: Optional[str] = None,
        date_start: Optional[str] = None,
        date_end: Optional[str] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        try:
            query = """
                SELECT
                    occurrence_id,
                    created_at,
                    source_type,
                    image_path,
                    camera_id,
                    reported_by,
                    status,
                    priority,
                    latitude,
                    longitude,
                    address,
                    total_detections,
                    estimated_volume_label,
                    severity,
                    estimated_items_count,
                    annotated_image_path
                FROM occurrences
                WHERE 1=1
            """
            params: List[Any] = []

            if status:
                query += " AND status = ?"
                params.append(status)

            if priority:
                query += " AND priority = ?"
                params.append(priority)

            if camera_id:
                query += " AND camera_id = ?"
                params.append(camera_id)

            if date_start:
                query += " AND created_at >= ?"
                params.append(date_start)

            if date_end:
                query += " AND created_at <= ?"
                params.append(date_end)

            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()

            items = [self._build_public_media_urls(dict(row)) for row in rows]

            return {
                "success": True,
                "filters": {
                    "status": status,
                    "priority": priority,
                    "camera_id": camera_id,
                    "date_start": date_start,
                    "date_end": date_end,
                    "limit": limit,
                },
                "count": len(items),
                "items": items,
            }

        except Exception as exc:
            return {
                "success": False,
                "count": 0,
                "items": [],
                "message": f"Erro: {str(exc)}",
            }

    def get_occurrence_by_id(self, occurrence_id: str) -> Dict[str, Any]:
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM occurrences WHERE occurrence_id = ? LIMIT 1", (occurrence_id,))
                row = cursor.fetchone()

            if not row:
                return {
                    "success": False,
                    "occurrence_id": occurrence_id,
                    "item": None,
                    "message": "Não encontrada.",
                }

            item = dict(row)

            if item.get("payload_json"):
                try:
                    item["payload_json"] = json.loads(item["payload_json"])
                except json.JSONDecodeError:
                    pass

            item = self._build_public_media_urls(item)

            return {
                "success": True,
                "occurrence_id": occurrence_id,
                "item": item,
            }

        except Exception as exc:
            return {
                "success": False,
                "occurrence_id": occurrence_id,
                "item": None,
                "message": f"Erro: {str(exc)}",
            }