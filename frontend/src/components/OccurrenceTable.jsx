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
  const result = String(first).localeCompare(String(second), "pt-BR", { numeric: true, sensitivity: "base" });
  return direction === "asc" ? result : -result;
}

function SortButton({ label, column, sortConfig, onSort }) {
  const isActive = sortConfig.key === column;
  const arrow = !isActive ? "↕" : sortConfig.direction === "asc" ? "↑" : "↓";
  return (
    <button className="sort-button" onClick={() => onSort(column)}>{label} {arrow}</button>
  );
}

function OccurrenceTable({ occurrences, onOpenMedia }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });

  const handleSort = (column) => {
    setSortConfig((prev) => ({
      key: column,
      direction: prev.key === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const filteredAndSortedData = useMemo(() => {
    const filtered = occurrences.filter((item) => {
      const joined = [item.occurrence_id, item.status, item.priority, item.severity, item.camera_id, item.source_type, item.reported_by, item.address, item.estimated_volume_label].map(normalizeValue).join(" ");
      return joined.includes(normalizeValue(searchTerm));
    });
    return [...filtered].sort((a, b) => compareValues(a[sortConfig.key], b[sortConfig.key], sortConfig.direction));
  }, [occurrences, searchTerm, sortConfig]);

  return (
    <section className="table-section">
      <div className="section-header">
        <div><p className="section-kicker">Auditoria operacional</p><h2>Tabela executiva de ocorrências</h2></div>
        <span className="results-pill">{filteredAndSortedData.length} registros</span>
      </div>
      <div className="table-toolbar">
        <input type="text" className="table-search" placeholder="Buscar por ID, câmera, status, prioridade, endereço..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="table-card">
        <div className="table-wrapper">
          <table className="occurrence-table">
            <thead>
              <tr>
                <th><SortButton label="ID" column="occurrence_id" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Data" column="created_at" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Prioridade" column="priority" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Severidade" column="severity" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Câmera" column="camera_id" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Detecções" column="total_detections" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th><SortButton label="Volume" column="estimated_volume_label" sortConfig={sortConfig} onSort={handleSort} /></th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.length === 0 ? (
                <tr><td colSpan="9" className="table-empty">Nenhuma ocorrência encontrada.</td></tr>
              ) : (
                filteredAndSortedData.map((occurrence) => (
                  <tr key={occurrence.occurrence_id}>
                    <td>{occurrence.occurrence_id}</td>
                    <td>{occurrence.created_at || "N/A"}</td>
                    <td>{occurrence.status || "N/A"}</td>
                    <td>{occurrence.priority || "N/A"}</td>
                    <td>{occurrence.severity || "N/A"}</td>
                    <td>{occurrence.camera_id || "N/A"}</td>
                    <td>{occurrence.total_detections ?? 0}</td>
                    <td>{occurrence.estimated_volume_label || "N/A"}</td>
                    <td><button className="table-action-button" onClick={() => onOpenMedia(occurrence.occurrence_id)}>Ver mídias</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
export default OccurrenceTable;