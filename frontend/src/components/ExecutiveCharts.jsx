import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function buildChartData(items, field) {
  const grouped = items.reduce((acc, item) => {
    const key = item[field] || "não informado";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([name, value]) => ({ name, value }));
}

function ChartBlock({ title, data }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header"><h3>{title}</h3></div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ExecutiveCharts({ occurrences }) {
  const statusData = buildChartData(occurrences, "status");
  const priorityData = buildChartData(occurrences, "priority");
  const severityData = buildChartData(occurrences, "severity");

  return (
    <section className="charts-section">
      <div className="section-header">
        <div><p className="section-kicker">Análise executiva</p><h2>Distribuição das ocorrências</h2></div>
      </div>
      <div className="charts-grid">
        <ChartBlock title="Ocorrências por status" data={statusData} />
        <ChartBlock title="Ocorrências por prioridade" data={priorityData} />
        <ChartBlock title="Ocorrências por severidade" data={severityData} />
      </div>
    </section>
  );
}
export default ExecutiveCharts;