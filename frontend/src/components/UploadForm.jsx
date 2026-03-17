import React, { useState } from 'react';

function UploadForm({ onUpload }) {
  const [file, setFile] = useState(null);
  const [cameraId, setCameraId] = useState("");
  const [lat, setLat] = useState(null);
  const [lon, setLon] = useState(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [isUploading, setIsUploading] = useState(false); // Estado para o botão de salvar

  const handleCaptureGps = () => {
    setLoadingGps(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLon(pos.coords.longitude);
          setLoadingGps(false);
          alert("📍 Localização capturada com sucesso!");
        },
        (err) => {
          alert("❌ Erro ao pegar GPS: " + err.message);
          setLoadingGps(false);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("GPS não suportado neste navegador.");
      setLoadingGps(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Por favor, selecione uma foto antes!");
    
    setIsUploading(true); // Ativa o estado de carregamento

    try {
      // Enviando para a função onUpload que está no App.jsx
      await onUpload({ 
        file, 
        camera_id: cameraId || "WEB-MANUAL", 
        latitude: lat, 
        longitude: lon 
      });

      // Se chegou aqui, deu certo!
      alert("✅ Ocorrência registrada e analisada pela IA!");
      
      // Limpa o formulário
      setFile(null);
      setCameraId("");
      setLat(null);
      setLon(null);
      // Reseta o input de arquivo visualmente
      e.target.reset();

    } catch (error) {
      alert("❌ Falha no envio: " + error.message);
    } finally {
      setIsUploading(false); // Desativa o carregamento, independente de sucesso ou erro
    }
  };

  return (
    <div className="upload-form executive-card" style={{ padding: '20px', border: isUploading ? '2px solid #2563eb' : 'none' }}>
      <h3 style={{ marginBottom: '15px' }}>📸 Nova Ocorrência</h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>Selecionar Imagem:</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={(e) => setFile(e.target.files[0])} 
          className="input-field"
          style={{ marginBottom: '15px' }}
        />

        <input 
          type="text" 
          placeholder="ID da Câmera (Ex: CAM-REC-01)" 
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="input-field"
          style={{ marginBottom: '15px' }}
        />
        
        <div style={{ marginBottom: '15px' }}>
          <button 
            type="button" 
            onClick={handleCaptureGps} 
            className="secondary-button"
            style={{ 
              width: '100%',
              background: lat ? '#10b981' : '#64748b', 
              color: 'white',
              border: 'none',
              padding: '10px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {loadingGps ? "⌛ Buscando Satélite..." : lat ? "📍 GPS Vinculado" : "Capturar Minha Localização"}
          </button>
        </div>

        <button 
          type="submit" 
          className="hero-button" 
          disabled={isUploading}
          style={{ 
            width: '100%', 
            padding: '12px',
            backgroundColor: isUploading ? '#94a3b8' : '#2563eb',
            cursor: isUploading ? 'not-allowed' : 'pointer'
          }}
        >
          {isUploading ? "⏳ Processando IA..." : "Analisar e Salvar"}
        </button>

        {isUploading && (
          <p style={{ fontSize: '0.8rem', color: '#2563eb', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>
            Aguarde: A Yolov8 está identificando resíduos...
          </p>
        )}
      </form>
    </div>
  );
}

export default UploadForm;