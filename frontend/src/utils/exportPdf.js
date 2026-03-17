import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatValue(value) {
  return (value === null || value === undefined || value === "") ? "N/A" : String(value);
}

function buildKpis(occurrences) {
  return {
    total: occurrences.length,
    detectadas: occurrences.filter((item) => item.status === "detectada").length,
    criticas: occurrences.filter((item) => item.priority === "crítica").length,
    altas: occurrences.filter((item) => item.priority === "alta").length,
    severidade: occurrences.filter((item) => item.severity === "alto" || item.severity === "crítico").length,
  };
}

export function exportExecutivePdf(occurrences) {
  if (!occurrences || occurrences.length === 0) {
    alert("Não há ocorrências para exportar.");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const kpis = buildKpis(occurrences);

  doc.setFontSize(18);
  doc.text("Waste Intelligence - Resumo Executivo", 14, 16);
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 25);

  // Blocos de KPI no PDF
  doc.setFontSize(11);
  doc.text(`Total: ${kpis.total} | Detectadas: ${kpis.detectadas} | Críticas: ${kpis.criticas} | Altas: ${kpis.altas}`, 14, 35);

  const tableColumns = ["ID", "Data", "Status", "Prioridade", "Severidade", "Câmera", "Detecções", "Endereço"];
  const tableRows = occurrences.map((item) => [
    formatValue(item.occurrence_id).substring(0, 12) + "...",
    formatValue(item.created_at).substring(0, 10),
    formatValue(item.status),
    formatValue(item.priority),
    formatValue(item.severity),
    formatValue(item.camera_id),
    formatValue(item.total_detections),
    formatValue(item.address),
  ]);

  autoTable(doc, {
    startY: 45,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [29, 78, 216] },
    styles: { fontSize: 7 }
  });

  doc.save(`relatorio_residuos_recife_${new Date().getTime()}.pdf`);
}