import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://cotizador-automatizado-ozzb.onrender.com/api",
  headers: {
    "Content-Type": "application/json",
  },
});

console.log("================================");
console.log("API CONFIGURADA:", api.defaults.baseURL);
console.log("================================");

api.interceptors.request.use((config) => {
  console.log("SOLICITUD:", config.method?.toUpperCase(), config.baseURL, config.url);
  return config;
});

export default api;
