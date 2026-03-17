from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, List
import cv2
from ultralytics import YOLO
from core.waste_mapping import map_yolo_class_to_waste_category

class VisionService:
    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.25,
        iou_threshold: float = 0.45,
        image_size: int = 640,
        output_dir: str = "output/reports"
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        self.image_size = image_size
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.model = YOLO(model_path)

    @staticmethod
    def _validate_image(image_path: str) -> Path:
        image_file = Path(image_path)
        if not image_file.exists(): raise FileNotFoundError(f"Imagem não encontrada: {image_path}")
        return image_file

    @staticmethod
    def _calculate_box_area(x1: float, y1: float, x2: float, y2: float) -> float:
        return max(0.0, x2 - x1) * max(0.0, y2 - y1)

    @staticmethod
    def _normalize_area(area: float, image_area: float) -> float:
        return 0.0 if image_area <= 0 else area / image_area

    @staticmethod
    def _get_box_color(waste_category: str) -> tuple[int, int, int]:
        category_colors = {
            "plástico": (255, 0, 0), "metal": (192, 192, 192), "vidro": (0, 255, 255),
            "papel": (0, 165, 255), "orgânico": (0, 128, 0), "eletrônico": (128, 0, 128),
            "entulho": (42, 42, 165), "descarte misto": (0, 0, 255),
            "veículo/coleta": (255, 255, 0), "veículo": (255, 255, 255), "não resíduo": (100, 100, 100)
        }
        return category_colors.get(waste_category, (0, 0, 255))

    def _estimate_waste_volume(self, detections: List[Dict[str, Any]], image_width: int, image_height: int) -> Dict[str, Any]:
        image_area = float(image_width * image_height)
        waste_detections = [det for det in detections if det["waste_category"] not in {"não resíduo", "veículo", "veículo/coleta"}]
        total_detected_area = sum(det["box_area"] for det in waste_detections)
        occupied_ratio = self._normalize_area(total_detected_area, image_area)

        if occupied_ratio < 0.02: severity, estimated_volume_label = "baixo", "pequeno"
        elif occupied_ratio < 0.08: severity, estimated_volume_label = "médio", "moderado"
        elif occupied_ratio < 0.18: severity, estimated_volume_label = "alto", "grande"
        else: severity, estimated_volume_label = "crítico", "muito_grande"

        return {
            "image_area": image_area, "total_detected_area": round(total_detected_area, 2),
            "occupied_ratio": round(occupied_ratio, 4), "estimated_volume_label": estimated_volume_label,
            "severity": severity, "estimated_items_count": len(waste_detections)
        }

    @staticmethod
    def _summarize_categories(detections: List[Dict[str, Any]]) -> Dict[str, int]:
        summary: Dict[str, int] = {}
        for detection in detections:
            cat = detection["waste_category"]
            summary[cat] = summary.get(cat, 0) + 1
        return summary

    def _draw_detections(self, image, detections: List[Dict[str, Any]], output_image_path: Path) -> str:
        annotated_image = image.copy()
        for det in detections:
            x1, y1, x2, y2 = int(det["bbox"]["x1"]), int(det["bbox"]["y1"]), int(det["bbox"]["x2"]), int(det["bbox"]["y2"])
            class_name, confidence, waste_category = det["class_name"], det["confidence"], det["waste_category"]
            color = self._get_box_color(waste_category)
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)
            label = f"{class_name} | {waste_category} | {confidence:.2f}"
            cv2.putText(annotated_image, label, (x1, max(y1 - 10, 20)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2, cv2.LINE_AA)
        cv2.imwrite(str(output_image_path), annotated_image)
        return str(output_image_path)

    def predict_image(self, image_path: str) -> Dict[str, Any]:
        try:
            image_file = self._validate_image(image_path)
            image = cv2.imread(str(image_file))
            if image is None: return {"success": False, "message": "Não foi possível abrir a imagem."}
            
            image_height, image_width = image.shape[:2]
            results = self.model.predict(source=str(image_file), conf=self.confidence_threshold, iou=self.iou_threshold, imgsz=self.image_size, verbose=False)

            if not results: return {"success": True, "message": "Sem resultados."}
            
            result = results[0]
            detections: List[Dict[str, Any]] = []
            names = result.names if hasattr(result, "names") else {}

            if result.boxes is not None:
                for index, box in enumerate(result.boxes):
                    cls_id = int(box.cls[0].item()) if box.cls is not None else -1
                    confidence = float(box.conf[0].item()) if box.conf is not None else 0.0
                    xyxy = box.xyxy[0].tolist()
                    x1, y1, x2, y2 = [float(v) for v in xyxy]
                    class_name = names.get(cls_id, f"class_{cls_id}")
                    waste_category = map_yolo_class_to_waste_category(class_name)
                    area = self._calculate_box_area(x1, y1, x2, y2)
                    
                    detections.append({
                        "detection_id": index + 1, "class_id": cls_id, "class_name": class_name,
                        "waste_category": waste_category, "confidence": round(confidence, 4),
                        "bbox": {"x1": round(x1, 2), "y1": round(y1, 2), "x2": round(x2, 2), "y2": round(y2, 2)},
                        "box_area": round(area, 2), "normalized_area": round(self._normalize_area(area, float(image_width * image_height)), 6)
                    })

            waste_estimation = self._estimate_waste_volume(detections, image_width, image_height)
            category_summary = self._summarize_categories(detections)
            output_image_path = self.output_dir / f"{image_file.stem}_annotated.jpg"
            saved_image_path = self._draw_detections(image, detections, output_image_path)

            return {
                "success": True, "message": "Sucesso.", "detections": detections,
                "summary": {"total_detections": len(detections), "waste_category_summary": category_summary, "waste_estimation": waste_estimation},
                "annotated_image_path": saved_image_path
            }
        except Exception as exc: return {"success": False, "message": f"Erro: {str(exc)}"}