import api from './api';

// Administración de empresas (solo SUPERADMIN)

// Listado paginado: { data: [{ id, name, location, pageUrl, photoUrl, isActive, usersCount }], meta }
export const listCompanies = async (page = 1, limit = 10) => {
  const { data } = await api.get('/companies', { params: { page, limit } });
  return data;
};

// Crear empresa + su primer ADMIN:
// { name, location, pageUrl?, photoUrl?, admin: { username, password } }
export const createCompany = async (company) => {
  const { data } = await api.post('/companies', company);
  return data;
};

// Editar (o reactivar con { isActive: true })
export const updateCompany = async (id, company) => {
  const { data } = await api.put(`/companies/${id}`, company);
  return data;
};

// Desactivar (soft delete): sus usuarios pierden el acceso
export const deleteCompany = async (id) => {
  const { data } = await api.delete(`/companies/${id}`);
  return data;
};
