import { api } from "./api";

export const createPatient = (payload) => api.post("/api/patients", payload);
export const getPatients = () => api.get("/api/patients");
export const getPatientById = (id) => api.get(`/api/patients/${id}`);
export const updatePatient = (id, payload) => api.put(`/api/patients/${id}`, payload);
export const deletePatient = (id) => api.del(`/api/patients/${id}`);
export const getHomePatients = () => api.get("/api/patients/home");
export const attachScanToPatient = (patientId, formData) => api.post(`/api/patients/${patientId}/scans`, formData);
export const getPatientScans = (patientId) => api.get(`/api/patients/${patientId}/scans`);
export const updateScan = (patientId, scanId, body) => api.put(`/api/patients/${patientId}/scans/${scanId}`, body);
export const deleteScan = (patientId, scanId) => api.del(`/api/patients/${patientId}/scans/${scanId}`);
export const rerunScan = (patientId, scanId, body) => api.post(`/api/patients/${patientId}/scans/${scanId}/rerun`, body || {});

