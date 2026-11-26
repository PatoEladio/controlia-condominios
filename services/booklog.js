import api from './api';

// Novedades del libro. date: YYYY-MM-DD (opcional, sin fecha trae todas)
export const getBooklog = async (date) => {
  const params = {};
  if (date) params.date = date;
  const { data } = await api.get('/booklog', { params });
  return data;
};

// Registrar novedad: { action: 'Pasa policía preguntando por...' }
export const createBooklog = async (booklog) => {
  const { data } = await api.post('/booklog', booklog);
  return data;
};
