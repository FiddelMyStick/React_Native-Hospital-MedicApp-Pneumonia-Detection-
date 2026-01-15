import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "http://192.168.43.136:5000";

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem("token");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // If body is NOT FormData, set Content-Type to json
  // If it IS FormData, fetch will set it automatically with boundary
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error(`Network error calling ${API_URL}${path}:`, err);
    throw new Error(`Network request failed: ${err.message} (url=${API_URL}${path})`);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    console.warn('Could not parse JSON response', err, text);
  }

  if (!response.ok) throw new Error(data?.message || `API error: ${response.status}`);
  return data;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  put: (path, body) => request(path, {
    method: "PUT",
    body: body instanceof FormData ? body : JSON.stringify(body)
  }),
  del: (path) => request(path, { method: "DELETE" }),
};
