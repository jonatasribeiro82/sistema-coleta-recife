import os
import uuid
from fastapi import UploadFile, HTTPException
from PIL import Image, UnidentifiedImageError

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}


def save_upload_file_securely(file: UploadFile, dest_dir: str = "data/raw_images") -> str:
    """
    Salva upload com segurança:
    - valida extensão
    - limita tamanho
    - evita sobrescrita com UUID
    - valida se o arquivo é realmente uma imagem
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Formato não permitido. Apenas JPG/PNG.")

    os.makedirs(dest_dir, exist_ok=True)
    safe_name = f"{uuid.uuid4()}{ext}"
    raw_path = os.path.join(dest_dir, safe_name)

    size = 0
    try:
        with open(raw_path, "wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)  # 1 MB por vez
                if not chunk:
                    break

                size += len(chunk)
                if size > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(status_code=413, detail="Arquivo muito grande. Limite de 10MB.")

                buffer.write(chunk)

        try:
            with Image.open(raw_path) as img:
                img.verify()
        except (UnidentifiedImageError, SyntaxError, TypeError, OSError):
            if os.path.exists(raw_path):
                os.remove(raw_path)
            raise HTTPException(status_code=400, detail="Arquivo de imagem corrompido ou inválido.")

        return raw_path

    except HTTPException:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise
    except Exception as e:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise HTTPException(status_code=500, detail=f"Erro ao processar o arquivo: {str(e)}")