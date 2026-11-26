import axios from 'axios';

// 1. Crear la instancia personalizada
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 10000, // Cancela la petición si tarda más de 10 segundos
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// 2. Interceptor de Peticiones (Request): Inyecta el token automáticamente
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Interceptor de Respuestas (Response): Manejo centralizado de errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        console.warn('Sesión expirada o no autorizada. Redirigiendo al login...');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else if (error.response.status === 500) {
        console.error('Error interno del servidor.');
      }
    } else if (error.request) {
      console.error('No se pudo conectar con el servidor.');
    }
    return Promise.reject(error);
  }
);


export default api;

