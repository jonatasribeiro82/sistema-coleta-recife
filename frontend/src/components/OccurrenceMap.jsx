import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Corrige o ícone do Leaflet no Vite
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function getSafeOccurrences(occurrences) {
  return occurrences
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => ({
      ...item,
      latNum: parseFloat(item.latitude),
      lonNum: parseFloat(item.longitude),
    }))
    .filter((item) => !isNaN(item.latNum) && !isNaN(item.lonNum));
}

function MapAutoCenter({ occurrences, defaultCenter }) {
  const map = useMap();

  useEffect(() => {
    if (!occurrences.length) {
      map.setView(defaultCenter, 12);
      return;
    }

    if (occurrences.length === 1) {
      map.setView([occurrences[0].latNum, occurrences[0].lonNum], 16);
      return;
    }

    const bounds = L.latLngBounds(
      occurrences.map((item) => [item.latNum, item.lonNum])
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [map, occurrences, defaultCenter]);

  return null;
}

function OccurrenceMap({ occurrences, onOpenMedia }) {
  const validOccurrences = getSafeOccurrences(occurrences);
  const defaultCenter = [-8.0476, -34.877]; // Recife

  return (
    <section className="map-section">
      <div className="section-header">
        <div>
          <p className="section-kicker">Visão geográfica</p>
          <h2>Mapa de ocorrências</h2>
        </div>
        <span className="results-pill">{validOccurrences.length} pontos no mapa</span>
      </div>

      <div className="map-card">
        <MapContainer
          center={defaultCenter}
          zoom={12}
          scrollWheelZoom={true}
          className="occurrence-map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapAutoCenter occurrences={validOccurrences} defaultCenter={defaultCenter} />

          {validOccurrences.map((occurrence) => {
            const totalDetections =
              occurrence.total_detections ??
              occurrence.vision_analysis?.summary?.total_detections ??
              occurrence.vision_analysis?.total_detections ??
              0;

            return (
              <Marker
                key={occurrence.occurrence_id}
                position={[occurrence.latNum, occurrence.lonNum]}
                icon={customIcon}
              >
                <Popup>
                  <div className="map-popup" style={{ minWidth: "220px" }}>
                    <strong style={{ display: "block", marginBottom: "8px" }}>
                      ID: {occurrence.occurrence_id}
                    </strong>

                    <p><strong>Status:</strong> {occurrence.status || "N/A"}</p>
                    <p><strong>Prioridade:</strong> {occurrence.priority || "N/A"}</p>
                    <p><strong>Câmera:</strong> {occurrence.camera_id || "N/A"}</p>
                    <p><strong>Detecções:</strong> {totalDetections}</p>
                    <p><strong>Endereço:</strong> {occurrence.address || "N/A"}</p>

                    <button
                      className="popup-button"
                      onClick={() => onOpenMedia(occurrence.occurrence_id)}
                    >
                      Ver mídias
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}

export default OccurrenceMap;