import { api } from "./api";
export const getMyProfile = () => api.get("/api/doctors/me");
export const updateMyProfile = (payload) => api.put("/api/doctors/me", payload);
