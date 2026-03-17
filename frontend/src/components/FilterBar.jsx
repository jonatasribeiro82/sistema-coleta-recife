import { useState } from "react";

function FilterBar({ onApplyFilters, onClearFilters }) {
  const [filters, setFilters] = useState({ status: "", priority: "", camera_id: "", date_start: "", date_end: "", limit: 20 });

  const handleChange = (e) => setFilters(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => { e.preventDefault(); onApplyFilters(filters); };
  const handleClear = () => { setFilters({ status: "", priority: "", camera_id: "", date_start: "", date_end: "", limit: 20 }); onClearFilters(); };

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <h2>Filtros Operacionais</h2>
      <div className="filter-grid">
        <select name="status" value={filters.status} onChange={handleChange}>
          <option value="">Todos os status</option>
          <option value="detectada">detectada</option>
          <option value="sem_detecção">sem_detecção</option>
        </select>
        <select name="priority" value={filters.priority} onChange={handleChange}>
          <option value="">Todas as prioridades</option>
          <option value="crítica">crítica</option>
          <option value="alta">alta</option>
          <option value="média">média</option>
          <option value="baixa">baixa</option>
          <option value="monitoramento">monitoramento</option>
        </select>
        <input type="text" name="camera_id" placeholder="camera_id" value={filters.camera_id} onChange={handleChange} />
        <input type="number" name="limit" min="1" max="200" value={filters.limit} onChange={handleChange} />
      </div>
      <div className="filter-actions">
        <button type="submit">Aplicar filtros</button>
        <button type="button" className="secondary-button" onClick={handleClear}>Limpar filtros</button>
      </div>
    </form>
  );
}
export default FilterBar;