import api from './api';

// Perfiles disponibles (ADMIN, RRHH, CONSERJE...): { data, meta }
export const getProfiles = async () => {
  const { data } = await api.get('/profiles/findAll', { params: { limit: 100 } });
  return data;
};
