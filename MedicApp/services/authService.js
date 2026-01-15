import { api } from "./api";

export function registerDoctor(payload) {
  return api.post("/api/auth/register", payload);
}
export function loginDoctor(payload) {
  return api.post("/api/auth/login", payload);
}