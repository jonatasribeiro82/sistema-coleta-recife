import axios from "axios";

const getApiBaseUrl = () => {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase && typeof envBase === "string" && envBase.trim()) {
    return envBase.replace(/\/$/, "");
  }

  return `http://${window.location.hostname}:8000`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 15000,
});

export const getOccurrences = async (limit = 20) => {
  const response = await api.get("/occurrences", {
    params: { limit },
  });
  return response.data;
};

export const getOccurrenceMedia = async (occurrenceId) => {
  const response = await api.get(`/occurrences/${occurrenceId}/media`);
  return response.data;
};

export const filterOccurrences = async ({
  status = "",
  priority = "",
  camera_id = "",
  date_start = "",
  date_end = "",
  limit = 20,
}) => {
  const params = {};

  if (status) params.status = status;
  if (priority) params.priority = priority;
  if (camera_id) params.camera_id = camera_id;
  if (date_start) params.date_start = date_start;
  if (date_end) params.date_end = date_end;
  if (limit) params.limit = limit;

  const response = await api.get("/occurrences/filter", { params });
  return response.data;
};

export const uploadOccurrenceImage = async ({
  file,
  camera_id = "",
  latitude = null,
  longitude = null,
  accuracy = null,
  source_type = "manual_upload",
  reported_by = "frontend_dashboard",
  run_detection = true,
}) => {
  const formData = new FormData();
  formData.append("file", file);

  if (camera_id) formData.append("camera_id", camera_id);

  if (latitude !== null && latitude !== undefined) {
    formData.append("latitude", String(latitude));
  }

  if (longitude !== null && longitude !== undefined) {
    formData.append("longitude", String(longitude));
  }

  if (accuracy !== null && accuracy !== undefined) {
    formData.append("accuracy", String(accuracy));
  }

  formData.append("source_type", source_type);
  formData.append("reported_by", reported_by);
  formData.append("run_detection", String(run_detection));

  const response = await api.post("/occurrences/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
};

export default api;