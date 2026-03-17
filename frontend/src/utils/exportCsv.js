function escapeCsvValue(value) {
  if (value === null || value === undefined) return '""';
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

export function exportOccurrencesToCsv(occurrences) {
  if (!occurrences || occurrences.length === 0) {
    alert("Não há ocorrências para exportar.");
    return;
  }

  const headers = [
    "occurrence_id", "created_at", "status", "priority", "severity", "source_type",
    "camera_id", "reported_by", "address", "latitude", "longitude", "total_detections",
    "estimated_volume_label", "annotated_image_path", "image_path"
  ];

  const rows = occurrences.map((item) => [
    item.occurrence_id, item.created_at, item.status, item.priority, item.severity,
    item.source_type, item.camera_id, item.reported_by, item.address, item.latitude,
    item.longitude, item.total_detections, item.estimated_volume_label,
    item.annotated_image_path, item.image_path
  ]);

  const csvContent = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  link.href = url;
  link.setAttribute("download", `waste_occurrences_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}