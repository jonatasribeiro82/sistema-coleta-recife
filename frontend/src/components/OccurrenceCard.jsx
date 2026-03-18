import React from "react";

function getBadgeClass(type, value) {
  const normalized = String(value || "").toLowerCase();

  if (type === "status") {
    if (normalized === "detectada") return "badge badge-danger";
    if (normalized === "sem_detecção") return "badge badge-neutral";
    if (normalized === "recebida") return "badge badge-info";
    if (normalized === "erro_processamento") return "badge badge-warning";
  }

  if (type === "priority") {
    if (normalized === "crítica") return "badge badge-danger";
    if (normalized === "alta") return "badge badge-warning";
    if (normalized === "média") return "badge badge-info";
    if (normalized === "baixa") return "badge badge-success";
    if (normalized === "monitoramento") return "badge badge-neutral";
    if (normalized === "pendente_análise") return "badge badge-warning";
  }

  return "badge badge-neutral";
}

function OccurrenceCard({ occurrence }) {
  const lat =
    occurrence.latitude ??
    occurrence.location_analysis?.latitude ??
    null;

  const lon =
    occurrence.longitude ??
    occurrence.location_analysis?.longitude ??
    null;

  const address =
    occurrence.address ||
    occurrence.location_analysis?.address ||
    "Não informado";

  const getApiBaseUrl = () => {
    const envBase = import.meta.env.VITE_API_BASE_URL;
    if (envBase && typeof envBase === "string" && envBase.trim()) {
      return envBase.replace(/\/$/, "");
    }

    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:8000`;
  };

  const formatMediaUrl = (url) => {
    if (!url) return null;

    const apiBase = getApiBaseUrl();

    if (url.startsWith("/")) {
      return `${apiBase}${url}`;
    }

    try {
      const parsed = new URL(url);
      const currentHostname = window.location.hostname;

      if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
        parsed.protocol = window.location.protocol;
        parsed.hostname = currentHostname;
        parsed.port = "8000";
        return parsed.toString();
      }

      return parsed.toString();
    } catch {
      return url;
    }
  };

  const getImageUrl = () => {
    // prioridade: imagem anotada pública
    if (occurrence.annotated_image_url) {
      return formatMediaUrl(occurrence.annotated_image_url);
    }

    // depois: imagem original pública
    if (occurrence.original_image_url) {
      return formatMediaUrl(occurrence.original_image_url);
    }

    // fallback: annotated_image_path
    if (occurrence.annotated_image_path) {
      const filename = String(occurrence.annotated_image_path).split(/[\\/]/).pop();
      return formatMediaUrl(`/media/annotated/${filename}`);
    }

    // fallback: image_path
    if (occurrence.image_path) {
      const filename = String(occurrence.image_path).split(/[\\/]/).pop();
      return formatMediaUrl(`/media/raw/${filename}`);
    }

    // fallback: visão aninhada
    if (occurrence.vision_analysis?.annotated_image_path) {
      const filename = String(occurrence.vision_analysis.annotated_image_path).split(/[\\/]/).pop();
      return formatMediaUrl(`/media/annotated/${filename}`);
    }

    return null;
  };

  const imageUrl = getImageUrl();

  const hasAnalysis = Boolean(
    occurrence.annotated_image_url ||
      occurrence.annotated_image_path ||
      occurrence.vision_analysis?.annotated_image_path
  );

  const totalDetections =
    occurrence.total_detections ??
    occurrence.vision_analysis?.summary?.total_detections ??
    occurrence.vision_analysis?.total_detections ??
    0;

  return (
    <div className="occurrence-card executive-card">
      <div className="occurrence-top">
        <div>
          <p className="occurrence-label">Ocorrência</p>
          <h3 style={{ fontSize: "1.1rem", wordBreak: "break-all" }}>
            {occurrence.occurrence_id}
          </h3>
        </div>

        <div className="occurrence-badges">
          <span className={getBadgeClass("status", occurrence.status)}>
            {occurrence.status || "N/A"}
          </span>
          <span className={getBadgeClass("priority", occurrence.priority)}>
            {occurrence.priority || "N/A"}
          </span>
        </div>
      </div>

      <div
        className="occurrence-image-container"
        style={{
          width: "100%",
          height: "180px",
          backgroundColor: "#e2e8f0",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "15px",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Ocorrência"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#64748b",
            }}
          >
            <span>Sem imagem</span>
          </div>
        )}
      </div>

      <div className="occurrence-details">
        <div className="detail-item full-width">
          <span className="detail-label">📍 Endereço</span>
          <span className="detail-value">{address}</span>
        </div>

        <div className="detail-item full-width">
          <span className="detail-label">🌍 GPS</span>
          <span className="detail-value">
            {lat != null && lon != null
              ? `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`
              : "Não disponível"}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Câmera</span>
          <span className="detail-value">{occurrence.camera_id || "N/A"}</span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Detecções</span>
          <span className="detail-value">{totalDetections}</span>
        </div>
      </div>

      <div className="occurrence-footer">
        <span className={hasAnalysis ? "media-ok" : "media-missing"}>
          {hasAnalysis ? "🤖 IA: Analisada" : "Sem análise"}
        </span>
      </div>
    </div>
  );
}

export default OccurrenceCard;