import axios from "axios";

const api = axios.create({ 
  baseURL: `http://${window.location.hostname}:8000`, 
  timeout: 15000 
});

export const getOccurrences = async (limit = 20) => {
  const response = await api.get(`/occurrences?limit=${limit}`);
  return response.data;
};

export const getOccurrenceMedia = async (occurrenceId) => {
  const response = await api.get(`/occurrences/${occurrenceId}/media`);
  return response.data;
};

export const filterOccurrences = async ({ status = "", priority = "", camera_id = "", date_start = "", date_end = "", limit = 20 }) => {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);
  if (camera_id) params.append("camera_id", camera_id);
  if (date_start) params.append("date_start", date_start);
  if (date_end) params.append("date_end", date_end);
  if (limit) params.append("limit", String(limit));
  
  const response = await api.get(`/occurrences/filter?${params.toString()}`);
  return response.data;
};

export const uploadOccurrenceImage = async ({ file, camera_id = "", latitude = null, longitude = null, source_type = "manual_upload", reported_by = "frontend_dashboard", run_detection = true }) => {
  const formData = new FormData();
  formData.append("file", file);
  if (camera_id) formData.append("camera_id", camera_id);
  
  // 📍 Agora enviamos as coordenadas para o backend
  if (latitude) formData.append("latitude", String(latitude));
  if (longitude) formData.append("longitude", String(longitude));
  
  formData.append("source_type", source_type);
  formData.append("reported_by", reported_by);
  formData.append("run_detection", String(run_detection));

  const response = await api.post("/occurrences/upload", formData, { headers: { "Content-Type": "multipart/form-data" }});
  return response.data;
};

export default api;