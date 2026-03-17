function KpiCards({ occurrences }) {
  const total = occurrences.length;
  const detectadas = occurrences.filter((item) => item.status === "detectada").length;
  const criticas = occurrences.filter((item) => item.priority === "crítica").length;
  const altas = occurrences.filter((item) => item.priority === "alta").length;
  const severidadeAltaOuCritica = occurrences.filter((item) => item.severity === "alto" || item.severity === "crítico").length;

  return (
    <section className="kpi-grid">
      <div className="kpi-card"><span className="kpi-label">Total de ocorrências</span><strong className="kpi-value">{total}</strong></div>
      <div className="kpi-card"><span className="kpi-label">Ocorrências detectadas</span><strong className="kpi-value">{detectadas}</strong></div>
      <div className="kpi-card"><span className="kpi-label">Prioridade crítica</span><strong className="kpi-value">{criticas}</strong></div>
      <div className="kpi-card"><span className="kpi-label">Prioridade alta</span><strong className="kpi-value">{altas}</strong></div>
      <div className="kpi-card"><span className="kpi-label">Severidade alta/crítica</span><strong className="kpi-value">{severidadeAltaOuCritica}</strong></div>
    </section>
  );
}
export default KpiCards;