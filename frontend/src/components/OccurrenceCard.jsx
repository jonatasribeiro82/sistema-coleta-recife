import React from 'react';

function getBadgeClass(type, value) {
  const normalized = String(value || "").toLowerCase();
  if (type === "status") {
    if (normalized === "detectada") return "badge badge-danger";
    if (normalized === "sem_detecção") return "badge badge-neutral";
    if (normalized === "recebida") return "badge badge-info";
  }
  if (type === "priority") {
    if (normalized === "crítica") return "badge badge-danger";
    if (normalized === "alta") return "badge badge-warning";
    if (normalized === "média") return "badge badge-info";
    if (normalized === "baixa") return "badge badge-success";
  }
  return "badge badge-neutral";
}

function OccurrenceCard({ occurrence }) {
  // Pegando os dados de dentro das "gavetas" corretas (location_analysis e vision_analysis)
  const lat = occurrence.latitude || occurrence?.location_analysis?.latitude;
  const lon = occurrence.longitude || occurrence?.location_analysis?.longitude;
  const address = occurrence.address || occurrence?.location_analysis?.address || "N/A";

  // O TRADUTOR DEFINITIVO 🚀
  const getImageUrl = () => {
    const backendUrl = "http://192.168.11.89:8000";
    
    // Procura a imagem com IA dentro do vision_analysis
    const annotatedPath = occurrence?.vision_analysis?.annotated_image_path || occurrence.annotated_image_path;
    
    // Procura a imagem original (o Python chama de image_path)
    const rawPath = occurrence.image_path || occurrence.raw_image_path;

    if (annotatedPath) {
      const filename = String(annotatedPath).split(/[\/\\]/).pop(); 
      return `${backendUrl}/media/annotated/${filename}`;
    }
    if (rawPath) {
      const filename = String(rawPath).split(/[\/\\]/).pop();
      return `${backendUrl}/media/raw/${filename}`;
    }
    return null;
  };

  const imageUrl = getImageUrl();
  
  // Confere se a gaveta vision_analysis existe para acender a etiqueta "IA Analisada"
  const hasAnalysis = !!occurrence?.vision_analysis || !!occurrence.annotated_image_path;

  return (
    <div className="occurrence-card executive-card">
      <div className="occurrence-top">
        <div>
          <p className="occurrence-label">Ocorrência</p>
          <h3>{occurrence.occurrence_id}</h3>
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

      <div className="occurrence-image-container" style={{ width: '100%', height: '180px', backgroundColor: '#e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt="Ocorrência" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
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
            {lat && lon ? `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}` : "Não disponível"}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">Câmera</span>
          <span className="detail-value">{occurrence.camera_id || "N/A"}</span>
        </div>
        
        <div className="detail-item">
          <span className="detail-label">Detecções</span>
          <span className="detail-value">{occurrence.total_detections ?? 0}</span>
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