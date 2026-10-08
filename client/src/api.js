import axios from 'axios';

// In dev, the Vite dev server and the API run as separate processes on
// separate ports, so default to localhost:4001. In a production build
// (e.g. deployed on Render), the Express server serves this built app
// itself, so the API is same-origin - an empty base URL means "this origin".
const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4001' : '');

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('documind_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { API_URL };
