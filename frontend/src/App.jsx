import { useEffect, useState } from "react";
import {
  filterOccurrences,
  getOccurrenceMedia,
  getOccurrences,
  uploadOccurrenceImage,
} from "./services/api";
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

    // Se vier URL relativa do backend, transforma em absoluta
    if (url.startsWith("/")) {
      return `${apiBase}${url}`;
    }

    // Se vier absoluta com localhost/127.0.0.1, troca para o host atual
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

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getOccurrences(20);
      setOccurrences(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Erro ao carregar ocorrências:", err);
      setError("Erro ao carregar dados do servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async (filters) => {
    setLoading(true);
    setError("");

    try {
      const data = await filterOccurrences(filters);
      setOccurrences(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error("Erro ao aplicar filtros:", err);
      setError("Erro ao aplicar filtros.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (payload) => {
    try {
      setError("");
      setSuccessMessage("🚀 Processando análise de IA...");

      const res = await uploadOccurrenceImage(payload);

      if (res?.success) {
        setSuccessMessage("✅ Ocorrência salva com sucesso!");
        await load();
        setTimeout(() => setSuccessMessage(""), 4000);
      } else {
        setSuccessMessage("");
        setError(res?.message || "Falha no upload.");
      }
    } catch (err) {
      console.error("Erro no upload:", err);
      setSuccessMessage("");
      setError("Falha no upload. Verifique o servidor.");
    }
  };

  const handleOpenMedia = async (occurrenceId) => {
    try {
      const data = await getOccurrenceMedia(occurrenceId);

      if (data?.success) {
        const formattedData = {
          ...data,
          original_image_url: formatMediaUrl(data.original_image_url),
          annotated_image_url: formatMediaUrl(data.annotated_image_url),
        };
        setSelectedMedia(formattedData);
      } else {
        alert("As imagens desta ocorrência ainda não foram processadas.");
      }
    } catch (err) {
      console.error("Erro ao buscar mídias:", err);
      alert("Erro de conexão ao buscar mídias.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="app-shell">
      {successMessage && <div className="toast success-toast">{successMessage}</div>}
      {error && <div className="toast error-toast">{error}</div>}

      <div className="hero-panel">
        <div>
          <p className="hero-kicker">Consórcio Recife Ambiental</p>
          <h1>Waste Intelligence Dashboard</h1>
          <p className="hero-subtitle">
            Gestão inteligente de resíduos com Visão Computacional.
          </p>
        </div>

        <div className="hero-actions">
          <button className="hero-button" onClick={load} disabled={loading}>
            {loading ? "Carregando..." : "Atualizar"}
          </button>

          <button
            className="hero-button hero-button-secondary"
            onClick={() => exportOccurrencesToCsv(occurrences)}
          >
            Exportar CSV
          </button>

          <button
            className="hero-button hero-button-pdf"
            onClick={() => exportExecutivePdf(occurrences)}
          >
            Gerar PDF
          </button>
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
        {occurrences.map((occurrence) => (
          <div key={occurrence.occurrence_id} className="card-container">
            <OccurrenceCard occurrence={occurrence} />
            <button
              className="media-button"
              onClick={() => handleOpenMedia(occurrence.occurrence_id)}
            >
              🔎 Ver Evidências
            </button>
          </div>
        ))}
      </section>

      <OccurrenceTable occurrences={occurrences} onOpenMedia={handleOpenMedia} />

      {selectedMedia && (
        <div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
          <section className="media-panel" onClick={(e) => e.stopPropagation()}>
            <div className="media-header">
              <h2>Análise de Evidências: {selectedMedia.occurrence_id}</h2>
              <button className="close-button" onClick={() => setSelectedMedia(null)}>
                FECHAR (X)
              </button>
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