import React, { useRef, useState } from "react";

function UploadForm({ onUpload }) {
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [cameraId, setCameraId] = useState("");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("não capturado");

  const formatCoord = (value) => {
    if (value === null || value === undefined) return "-";
    return Number(value).toFixed(6);
  };

  const formatAccuracy = (value) => {
    if (value === null || value === undefined) return "-";
    return `${Math.round(Number(value))} m`;
  };

  const getAccuracyLabel = (value) => {
    if (value === null || value === undefined) return "desconhecida";
    if (value <= 20) return "alta";
    if (value <= 80) return "média";
    return "baixa";
  };

  const getResolvedGpsStatus = () => {
    if (loadingGps) return "capturando";
    if (gpsStatus === "falhou") return "falhou";
    if (gpsStatus === "indisponível") return "indisponível";

    const hasCoords = lat !== null && lon !== null;

    if (!hasCoords) return "não capturado";

    if (accuracy === null || accuracy === undefined) return "capturado";
    if (accuracy <= 80) return "capturado";
    return "capturado com baixa precisão";
  };

  const resolvedGpsStatus = getResolvedGpsStatus();

  const getGpsBoxStyle = () => {
    if (resolvedGpsStatus === "capturado") {
      return {
        background: "#ecfdf5",
        border: "1px solid #86efac",
        color: "#166534",
      };
    }

    if (resolvedGpsStatus === "capturado com baixa precisão") {
      return {
        background: "#fefce8",
        border: "1px solid #fde68a",
        color: "#92400e",
      };
    }

    if (resolvedGpsStatus === "falhou" || resolvedGpsStatus === "indisponível") {
      return {
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
      };
    }

    return {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      color: "#334155",
    };
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
        const nextLat = pos.coords.latitude;
        const nextLon = pos.coords.longitude;
        const nextAccuracy = pos.coords.accuracy ?? null;

        setLat(nextLat);
        setLon(nextLon);
        setAccuracy(nextAccuracy);
        setLoadingGps(false);

        if (nextAccuracy !== null && nextAccuracy > 80) {
          setGpsStatus("capturado com baixa precisão");
          alert(
            `📍 Localização capturada, mas com precisão baixa (${Math.round(
              nextAccuracy
            )} m). Se puder, aguarde alguns segundos e capture novamente.`
          );
        } else {
          setGpsStatus("capturado");
          alert("📍 Localização capturada com sucesso!");
        }
      },
      (err) => {
        alert("❌ Erro ao pegar GPS: " + err.message);
        setLoadingGps(false);
        setGpsStatus("falhou");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  const resetForm = () => {
    setFile(null);
    setCameraId("");
    setLat(null);
    setLon(null);
    setAccuracy(null);
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
        accuracy,
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
              background:
                resolvedGpsStatus === "capturado"
                  ? "#10b981"
                  : resolvedGpsStatus === "capturado com baixa precisão"
                  ? "#f59e0b"
                  : "#64748b",
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
              : resolvedGpsStatus === "capturado"
              ? "📍 GPS Vinculado"
              : resolvedGpsStatus === "capturado com baixa precisão"
              ? "⚠️ GPS com baixa precisão"
              : "Capturar Minha Localização"}
          </button>
        </div>

        <div
          style={{
            fontSize: "0.85rem",
            marginBottom: "15px",
            padding: "10px",
            borderRadius: "6px",
            ...getGpsBoxStyle(),
          }}
        >
          <div>
            <strong>Status GPS:</strong> {resolvedGpsStatus}
          </div>
          <div>
            <strong>Latitude:</strong> {formatCoord(lat)}
          </div>
          <div>
            <strong>Longitude:</strong> {formatCoord(lon)}
          </div>
          <div>
            <strong>Precisão estimada:</strong> {formatAccuracy(accuracy)}
          </div>
          <div>
            <strong>Qualidade:</strong> {getAccuracyLabel(accuracy)}
          </div>

          {resolvedGpsStatus === "capturado com baixa precisão" && (
            <div style={{ marginTop: "8px", fontWeight: 600 }}>
              Recomendação: capture novamente antes de salvar.
            </div>
          )}
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