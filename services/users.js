import api from './api';

// Listado paginado de usuarios (ADMIN): { data, meta } con los departamentos de cada usuario
export const listUsers = async (page = 1, limit = 10) => {
  const { data } = await api.get('/users', { params: { page, limit } });
  return data;
};

// Editar usuario: { username?, password?, profileId?, departmentIds? } (solo lo que se envía se actualiza)
export const updateUser = async (id, user) => {
  const { data } = await api.put(`/users/${id}`, user);
  return data;
};

// Eliminar usuario (soft delete: queda deshabilitado y pierde el acceso)
export const deleteUser = async (id) => {
  const { data } = await api.delete(`/users/${id}`);
  return data;
};

// Crear usuario (ADMIN): { username, password, profileId, departmentIds? } (departmentIds obligatorio para PROPIETARIO)
export const registerUser = async (user) => {
  const { data } = await api.post('/auth/register', user);
  return data;
};
