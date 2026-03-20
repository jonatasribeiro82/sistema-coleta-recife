from typing import Dict

# Camada 1: categoria base derivada do YOLO
YOLO_WASTE_CATEGORY_MAP: Dict[str, str] = {
    # Recicláveis / plástico
    "bottle": "plástico",
    "cup": "plástico",
    "bowl": "plástico",

    # Recicláveis / vidro
    "wine glass": "vidro",

    # Recicláveis / metal
    "fork": "metal",
    "knife": "metal",
    "spoon": "metal",

    # Orgânicos
    "banana": "orgânico",
    "apple": "orgânico",
    "orange": "orgânico",
    "broccoli": "orgânico",
    "carrot": "orgânico",
    "sandwich": "orgânico",
    "pizza": "orgânico",
    "hot dog": "orgânico",
    "donut": "orgânico",
    "cake": "orgânico",
    "potted plant": "orgânico",

    # Eletrônicos
    "cell phone": "eletrônico",
    "tv": "eletrônico",
    "laptop": "eletrônico",
    "mouse": "eletrônico",
    "remote": "eletrônico",
    "keyboard": "eletrônico",

    # Papel / reciclável seco
    "book": "papel",
    "cardboard": "papel",

    # Veículos / operação
    "truck": "veículo/coleta",
    "bus": "veículo/coleta",
    "car": "veículo",
    "motorcycle": "veículo",

    # Não resíduo
    "person": "não resíduo",
    "dog": "não resíduo",
    "cat": "não resíduo",

    # Volumosos / entulho urbano
    "chair": "volumoso",
    "couch": "volumoso",
    "bed": "volumoso",
    "dining table": "volumoso",
    "toilet": "entulho",

    # Mistos
    "backpack": "descarte misto",
    "handbag": "descarte misto",
    "suitcase": "volumoso",
    "tie": "descarte misto",
    "umbrella": "descarte misto",
}

# Camada 2: categoria operacional para gestão
BASE_TO_OPERATIONAL_CATEGORY: Dict[str, str] = {
    "plástico": "reciclável",
    "vidro": "reciclável",
    "metal": "reciclável",
    "papel": "reciclável",
    "orgânico": "orgânico/poda",
    "eletrônico": "eletrônico",
    "entulho": "entulho",
    "volumoso": "volumoso",
    "descarte misto": "domiciliar",
    "veículo/coleta": "veículo/coleta",
    "veículo": "não resíduo",
    "não resíduo": "não resíduo",
}


def map_yolo_class_to_waste_category(class_name: str) -> str:
    """
    Retorna a categoria base associada à classe detectada pelo YOLO.
    """
    if not class_name:
        return "descarte misto"
    return YOLO_WASTE_CATEGORY_MAP.get(class_name.lower(), "descarte misto")


def map_base_to_operational_category(base_category: str) -> str:
    """
    Traduz a categoria base para uma categoria operacional útil ao painel.
    """
    if not base_category:
        return "domiciliar"
    return BASE_TO_OPERATIONAL_CATEGORY.get(base_category.lower(), "domiciliar")