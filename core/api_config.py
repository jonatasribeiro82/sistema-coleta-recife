from __future__ import annotations
from typing import List

API_TITLE = "Waste Intelligence MVP API"
API_DESCRIPTION = "API REST para gestão de ocorrências de resíduos urbanos"
API_VERSION = "1.0.0"

# O asterisco "*" significa: "Aceite requisições de QUALQUER IP, celular ou computador"
ALLOWED_ORIGINS: List[str] = ["*"]

# Deve ser False quando usamos "*" nas origens
ALLOW_CREDENTIALS = False 

ALLOWED_METHODS: List[str] = ["*"]
ALLOWED_HEADERS: List[str] = ["*"]