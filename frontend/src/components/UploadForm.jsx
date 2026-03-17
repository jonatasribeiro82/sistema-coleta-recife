import React, { useState } from 'react';

function UploadForm({ onUpload }) {
  const [file, setFile] = useState(null);
  const [cameraId, setCameraId] = useState("");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);

  const handleCaptureGps = () => {
    setLoadingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setLoadingGps(false);
          alert("📍 GPS capturado com sucesso!");
        },
        (err) => {
          alert("❌ Erro ao pegar GPS: " + err.message);
          setLoadingGps(false);
        }
      );
    } else {
      alert("GPS não suportado neste navegador.");
      setLoadingGps(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return alert("Selecione uma foto!");
    
    // 🎯 Enviando tudo: arquivo + coordenadas
    onUpload({ 
      file, 
      camera_id: cameraId, 
      latitude: lat, 
      longitude: lon 
    });

    // Limpa o formulário após enviar
    setFile(null);
    setLat(null);
    setLon(null);
  };

  return (
    <div className="upload-form executive-card" style={{ padding: '20px' }}>
      <h3>Nova Ocorrência</h3>
      <form onSubmit={handleSubmit}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setFile(e.target.files[0])} 
          className="input-field"
        />
        <input 
          type="text" 
          placeholder="ID da Câmera (Ex: CAM-01)" 
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="input-field"
        />
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button 
            type="button" 
            onClick={handleCaptureGps} 
            className="secondary-button"
            style={{ background: lat ? '#28a745' : '#6c757d', color: 'white' }}
          >
            {loadingGps ? "Buscando..." : lat ? "📍 GPS OK" : "Capturar Localização"}
          </button>
        </div>

        <button type="submit" className="hero-button" style={{ width: '100%' }}>
          Analisar e Salvar
        </button>
      </form>
    </div>
  );
}

export default UploadForm;