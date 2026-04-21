import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT interceptor
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('graviq_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for auth errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);

    if (error.response?.status === 401 && hadAuthHeader) {
      localStorage.removeItem('graviq_token');
      localStorage.removeItem('graviq_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
