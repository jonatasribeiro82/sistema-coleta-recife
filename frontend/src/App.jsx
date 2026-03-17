import { useEffect, useState } from "react";
import { filterOccurrences, getOccurrenceMedia, getOccurrences, uploadOccurrenceImage } from "./services/api";
import OccurrenceCard from "./components/OccurrenceCard";
import FilterBar from "./components/FilterBar";
import UploadForm from "./components/UploadForm";
import KpiCards from "./components/KpiCards";
import ExecutiveCharts from "./components/ExecutiveCharts";
import OccurrenceMap from "./components/OccurrenceMap";
import OccurrenceTable from "./components/OccurrenceTable";
import { exportOccurrencesToCsv } from "./utils/exportCsv";
import { exportExecutivePdf } from "./utils/exportPdf";
import "./index.css";

function App() {
  const [occurrences, setOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try { const data = await getOccurrences(20); setOccurrences(data.items || []); } 
    catch { setError("Erro ao carregar dados."); } 
    finally { setLoading(false); }
  };

  const handleApplyFilters = async (f) => {
    setLoading(true);
    try { const data = await filterOccurrences(f); setOccurrences(data.items || []); } 
    catch { setError("Erro nos filtros."); } 
    finally { setLoading(false); }
  };

  const handleUpload = async (p) => {
    try { 
      setSuccessMessage("Processando..."); 
      const res = await uploadOccurrenceImage(p); 
      if(res.success) { setSuccessMessage("Enviado com sucesso!"); await load(); }
    } catch { setError("Erro no upload."); }
  };

  // Melhoria para sabermos exatamente o que chegou do servidor
  const handleOpenMedia = async (id) => {
    const data = await getOccurrenceMedia(id);
    if (data.success) {
      setSelectedMedia(data);
    } else {
      alert("Erro ao buscar a foto: " + data.error);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="app-shell">
      <div className="hero-panel">
        <div>
          <p className="hero-kicker">Consórcio Recife Ambiental</p>
          <h1>Waste Intelligence Dashboard</h1>
          <p className="hero-subtitle">Gestão inteligente de resíduos com Visão Computacional.</p>
        </div>
        <div className="hero-actions">
          <button className="hero-button" onClick={load}>Atualizar</button>
          <button className="hero-button hero-button-secondary" onClick={() => exportOccurrencesToCsv(occurrences)}>Exportar CSV</button>
          <button className="hero-button hero-button-pdf" onClick={() => exportExecutivePdf(occurrences)}>Gerar PDF</button>
        </div>
      </div>

      <KpiCards occurrences={occurrences} />
      <ExecutiveCharts occurrences={occurrences} />
      <OccurrenceMap occurrences={occurrences} onOpenMedia={handleOpenMedia} />

      <div className="top-panels">
        <UploadForm onUpload={handleUpload} />
        <FilterBar onApplyFilters={handleApplyFilters} onClearFilters={load} />
      </div>

      <section className="grid">
        {occurrences.map((o) => (
          <div key={o.occurrence_id}><OccurrenceCard occurrence={o} /><button className="media-button" onClick={() => handleOpenMedia(o.occurrence_id)}>Ver mídias</button></div>
        ))}
      </section>

      <OccurrenceTable occurrences={occurrences} onOpenMedia={handleOpenMedia} />

      {/* 👇 O PAINEL DE EVIDÊNCIAS AGORA VAI FLUTUAR NO MEIO DA TELA 👇 */}
      {selectedMedia && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, 
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <section className="media-panel" style={{
            background: 'white', padding: '20px', borderRadius: '12px',
            width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <div className="media-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Evidências da IA</h2>
              <button 
                className="secondary-button" 
                onClick={() => setSelectedMedia(null)}
                style={{ background: '#ff4d4f', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                FECHAR (X)
              </button>
            </div>
            
            <div className="media-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {selectedMedia.original_image_url ? (
                <div>
                  <p style={{fontWeight: 'bold'}}>📸 Imagem Original</p>
                  <img src={selectedMedia.original_image_url} style={{ width: '100%', borderRadius: '8px' }} alt="Original" />
                </div>
              ) : <p>Imagem original não registrada.</p>}

              {selectedMedia.annotated_image_url ? (
                <div>
                  <p style={{fontWeight: 'bold', color: '#0066cc'}}>🤖 Análise da IA (YOLO)</p>
                  <img src={selectedMedia.annotated_image_url} style={{ width: '100%', borderRadius: '8px' }} alt="IA Analisada" />
                </div>
              ) : <p>Análise da IA não registrada.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
export default App;