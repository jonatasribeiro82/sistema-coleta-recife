import React, { useRef, useState } from "react";

function UploadForm({ onUpload }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [cameraId, setCameraId] = useState("");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("não capturado");

  const formatCoord = (value) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toFixed(6);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const isImage = selectedFile.type.startsWith("image/");
    if (!isImage) {
      alert("Selecione apenas arquivos de imagem.");
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleCaptureGps = () => {
    setLoadingGps(true);
    setGpsStatus("capturando");

    if (!("geolocation" in navigator)) {
      alert("GPS não suportado neste navegador.");
      setLoadingGps(false);
      setGpsStatus("indisponível");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLoadingGps(false);
        setGpsStatus("capturado");
        alert("📍 Localização capturada com sucesso!");
      },
      (err) => {
        alert("❌ Erro ao pegar GPS: " + err.message);
        setLoadingGps(false);
        setGpsStatus("falhou");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const resetForm = () => {
    setFile(null);
    setCameraId("");
    setLat(null);
    setLon(null);
    setGpsStatus("não capturado");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Por favor, selecione uma foto antes.");
      return;
    }

    setIsUploading(true);

    try {
      await onUpload({
        file,
        camera_id: cameraId?.trim() || "WEB-MANUAL",
        latitude: lat,
        longitude: lon,
      });

      alert("✅ Ocorrência registrada e analisada pela IA!");
      resetForm();
    } catch (error) {
      alert("❌ Falha no envio: " + (error?.message || "Erro desconhecido"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="upload-form executive-card"
      style={{
        padding: "20px",
        border: isUploading ? "2px solid #2563eb" : "none",
      }}
    >
      <h3 style={{ marginBottom: "15px" }}>📸 Nova Ocorrência</h3>

      <form onSubmit={handleSubmit}>
        <label
          style={{
            display: "block",
            marginBottom: "5px",
            fontSize: "0.9rem",
            color: "#666",
          }}
        >
          Selecionar Imagem:
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="input-field"
          style={{ marginBottom: "15px" }}
        />

        {file && (
          <div
            style={{
              fontSize: "0.85rem",
              marginBottom: "15px",
              color: "#334155",
              background: "#f8fafc",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
            }}
          >
            <strong>Arquivo:</strong> {file.name}
          </div>
        )}

        <input
          type="text"
          placeholder="ID da Câmera (Ex: CAM-REC-01)"
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="input-field"
          style={{ marginBottom: "15px" }}
        />

        <div style={{ marginBottom: "15px" }}>
          <button
            type="button"
            onClick={handleCaptureGps}
            className="secondary-button"
            disabled={loadingGps}
            style={{
              width: "100%",
              background: lat ? "#10b981" : "#64748b",
              color: "white",
              border: "none",
              padding: "10px",
              borderRadius: "6px",
              cursor: loadingGps ? "not-allowed" : "pointer",
              opacity: loadingGps ? 0.85 : 1,
            }}
          >
            {loadingGps
              ? "⌛ Buscando Satélite..."
              : lat
              ? "📍 GPS Vinculado"
              : "Capturar Minha Localização"}
          </button>
        </div>

        <div
          style={{
            fontSize: "0.85rem",
            marginBottom: "15px",
            color: "#334155",
            background: "#f8fafc",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <strong>Status GPS:</strong> {gpsStatus}
          </div>
          <div>
            <strong>Latitude:</strong> {formatCoord(lat)}
          </div>
          <div>
            <strong>Longitude:</strong> {formatCoord(lon)}
          </div>
        </div>

        <button
          type="submit"
          className="hero-button"
          disabled={isUploading}
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: isUploading ? "#94a3b8" : "#2563eb",
            cursor: isUploading ? "not-allowed" : "pointer",
          }}
        >
          {isUploading ? "⏳ Processando IA..." : "Analisar e Salvar"}
        </button>

        {isUploading && (
          <p
            style={{
              fontSize: "0.8rem",
              color: "#2563eb",
              marginTop: "10px",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Aguarde: a YOLOv8 está identificando resíduos...
          </p>
        )}
      </form>
    </div>
  );
}

export default UploadForm;