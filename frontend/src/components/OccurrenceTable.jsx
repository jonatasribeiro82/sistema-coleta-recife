import { useMemo, useState } from "react";

function normalizeValue(value) {
  if (value == null) return "";
  return String(value).toLowerCase();
}

function compareValues(a, b, direction = "asc") {
  const first = a ?? "";
  const second = b ?? "";

  if (typeof first === "number" && typeof second === "number") {
    return direction === "asc" ? first - second : second - first;
  }

  const result = String(first).localeCompare(String(second), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });

  return direction === "asc" ? result : -result;
}

function formatDate(value) {
  if (!value) return "N/A";

  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function SortButton({ label, column, sortConfig, onSort }) {
  const isActive = sortConfig.key === column;
  const arrow = !isActive ? "↕" : sortConfig.direction === "asc" ? "↑" : "↓";

  return (
    <button className="sort-button" onClick={() => onSort(column)}>
      {label} {arrow}
    </button>
  );
}

function OccurrenceTable({ occurrences, onOpenMedia }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc",
  });

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      key: column,
      direction:
        prev.key === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedData = useMemo(() => {
    const filtered = occurrences.filter((item) => {
      const joined = [
        item.occurrence_id,
        item.status,
        item.priority,
        item.severity,
        item.camera_id,
        item.source_type,
        item.reported_by,
        item.address,
        item.estimated_volume_label,
        item.dominant_operational_category,
        item.latitude,
        item.longitude,
      ]
        .map(normalizeValue)
        .join(" ");

      return joined.includes(normalizeValue(searchTerm));
    });

    return [...filtered].sort((a, b) =>
      compareValues(a[sortConfig.key], b[sortConfig.key], sortConfig.direction)
    );
  }, [occurrences, searchTerm, sortConfig]);

  return (
    <section className="table-section">
      <div className="section-header">
        <div>
          <p className="section-kicker">Auditoria operacional</p>
          <h2>Tabela executiva de ocorrências</h2>
        </div>
        <span className="results-pill">{filteredAndSortedData.length} registros</span>
      </div>

      <div className="table-toolbar">
        <input
          type="text"
          className="table-search"
          placeholder="Buscar por ID, câmera, status, prioridade, categoria, endereço, GPS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-card">
        <div className="table-wrapper">
          <table className="occurrence-table">
            <thead>
              <tr>
                <th>
                  <SortButton
                    label="ID"
                    column="occurrence_id"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Data"
                    column="created_at"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Status"
                    column="status"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Prioridade"
                    column="priority"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Severidade"
                    column="severity"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Categoria"
                    column="dominant_operational_category"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Câmera"
                    column="camera_id"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Detecções"
                    column="total_detections"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>
                  <SortButton
                    label="Volume"
                    column="estimated_volume_label"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  />
                </th>
                <th>Endereço / GPS</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan="11" className="table-empty">
                    Nenhuma ocorrência encontrada.
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((occurrence) => {
                  const hasIA = Boolean(
                    occurrence.annotated_image_url ||
                      occurrence.annotated_image_path ||
                      occurrence.vision_analysis?.annotated_image_path
                  );

                  const totalDetections =
                    occurrence.total_detections ??
                    occurrence.vision_analysis?.summary?.total_detections ??
                    occurrence.vision_analysis?.total_detections ??
                    0;

                  const gpsLabel =
                    occurrence.latitude != null && occurrence.longitude != null
                      ? `${Number(occurrence.latitude).toFixed(6)}, ${Number(
                          occurrence.longitude
                        ).toFixed(6)}`
                      : "GPS não disponível";

                  const operationalCategory =
                    occurrence.dominant_operational_category || "Não classificado";

                  return (
                    <tr key={occurrence.occurrence_id}>
                      <td>{occurrence.occurrence_id}</td>
                      <td>{formatDate(occurrence.created_at)}</td>
                      <td>{occurrence.status || "N/A"}</td>
                      <td>{occurrence.priority || "N/A"}</td>
                      <td>{occurrence.severity || "N/A"}</td>
                      <td>{operationalCategory}</td>
                      <td>{occurrence.camera_id || "N/A"}</td>
                      <td>{totalDetections}</td>
                      <td>{occurrence.estimated_volume_label || "N/A"}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontWeight: 600 }}>
                            {occurrence.address || "Endereço não informado"}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b" }}>
                            {gpsLabel}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          className="btn-ver-midias-blindado"
                          onClick={() => onOpenMedia(occurrence.occurrence_id)}
                          style={{
                            backgroundColor: hasIA ? "#2563eb" : "#64748b",
                            color: "white",
                            padding: "8px 16px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            transition: "all 0.2s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          {hasIA ? "🔍 Ver Mídias" : "📄 Detalhes"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .btn-ver-midias-blindado::before,
            .btn-ver-midias-blindado::after {
              content: none !important;
              display: none !important;
            }

            .btn-ver-midias-blindado:hover {
              filter: brightness(1.1);
              transform: translateY(-1px);
            }
          `,
        }}
      />
    </section>
  );
}

export default OccurrenceTable;