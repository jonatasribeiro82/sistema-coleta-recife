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

  // Função para garantir que a URL da imagem use o IP da rede e não localhost
  const formatMediaUrl = (url) => {
    if (!url) return null;
    return url.replace('localhost', '192.168.11.89').replace('127.0.0.1', '192.168.11.89');
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try { 
      const data = await getOccurrences(20); 
      setOccurrences(data.items || []); 
    } 
    catch (err) { 
      setError("Erro ao carregar dados do servidor."); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const handleApplyFilters = async (f) => {
    setLoading(true);
    try { 
      const data = await filterOccurrences(f); 
      setOccurrences(data.items || []); 
    } 
    catch { 
      setError("Erro ao aplicar filtros."); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const handleUpload = async (p) => {
    try { 
      setError("");
      setSuccessMessage("🚀 Processando análise de IA..."); 
      const res = await uploadOccurrenceImage(p); 
      
      if(res.success) { 
        setSuccessMessage("✅ Ocorrência salva com sucesso!"); 
        // Limpa a mensagem de sucesso após 4 segundos
        setTimeout(() => setSuccessMessage(""), 4000);
        await load(); 
      }
    } catch (err) { 
      setError("Falha no upload. Verifique o servidor."); 
      setSuccessMessage("");
    }
  };

  const handleOpenMedia = async (id) => {
    try {
      const data = await getOccurrenceMedia(id);
      if (data.success) {
        // Aplica a correção de IP nas URLs que vêm do banco
        const formattedData = {
          ...data,
          original_image_url: formatMediaUrl(data.original_image_url),
          annotated_image_url: formatMediaUrl(data.annotated_image_url)
        };
        setSelectedMedia(formattedData);
      } else {
        alert("As imagens desta ocorrência ainda não foram processadas.");
      }
    } catch (err) {
      alert("Erro de conexão ao buscar mídias.");
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="app-shell">
      {/* Alertas Flutuantes de Feedback */}
      {successMessage && <div className="toast success-toast">{successMessage}</div>}
      {error && <div className="toast error-toast">{error}</div>}

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
          <div key={o.occurrence_id} className="card-container">
            <OccurrenceCard occurrence={o} />
            <button className="media-button" onClick={() => handleOpenMedia(o.occurrence_id)}>
              🔎 Ver Evidências
            </button>
          </div>
        ))}
      </section>

      <OccurrenceTable occurrences={occurrences} onOpenMedia={handleOpenMedia} />

      {/* Painel de Evidências (Modal) */}
      {selectedMedia && (
        <div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
          <section className="media-panel" onClick={(e) => e.stopPropagation()}>
            <div className="media-header">
              <h2>Análise de Evidências: {selectedMedia.occurrence_id}</h2>
              <button className="close-button" onClick={() => setSelectedMedia(null)}>FECHAR (X)</button>
            </div>
            
            <div className="media-grid">
              <div className="media-box">
                <p className="media-title">📸 Imagem Original</p>
                {selectedMedia.original_image_url ? (
                  <img src={selectedMedia.original_image_url} alt="Original" />
                ) : (
                  <div className="no-image">Não disponível</div>
                )}
              </div>

              <div className="media-box">
                <p className="media-title ia-title">🤖 Análise YOLOv8</p>
                {selectedMedia.annotated_image_url ? (
                  <img src={selectedMedia.annotated_image_url} alt="IA Analisada" />
                ) : (
                  <div className="no-image">Processando IA...</div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;