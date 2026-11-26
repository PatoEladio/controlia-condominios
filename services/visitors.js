import api from './api';

export const getTotalQty = async () => {
  const { data } = await api.get('/visitors/getTotalQty');
  return data;
};

export const getTodayQty = async () => {
  const { data } = await api.get('/visitors/getTodayQty');
  return data;
};

export const getInsideQty = async () => {
  const { data } = await api.get('/visitors/getInsideQty');
  return data;
};

export const getLastVisitors = async () => {
  const { data } = await api.get('/visitors/lastVisitors');
  return data;
};

// Paginado en la API: devuelve { data, meta: { total, page, limit, totalPages, ... } }
// El PROPIETARIO recibe solo los accesos de sus departamentos
export const findAllByDate = async (startDate, endDate, page = 1, limit = 10, search, status) => {
  const params = { page, limit };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (search) params.search = search;
  if (status) params.status = status;
  const { data } = await api.get('/visitors/findAllByDate', { params });
  return data;
};

// Reporte por rango de fechas (ADMIN / SUPERADMIN)
// → { range, summary, byDay: [{date,total,arrived}], byDepartment: [{department,total,arrived}], data, truncated }
export const getVisitorsReport = async (startDate, endDate) => {
  const { data } = await api.get('/visitors/report', { params: { startDate, endDate } });
  return data;
};

export const createVisitor = async (visitor) => {
  const { data } = await api.post('/visitors', visitor);
  return data;
};

export const updateVisitor = async (id, visitor) => {
  const { data } = await api.put(`/visitors/${id}`, visitor);
  return data;
};

export const deleteVisitor = async (id) => {
  const { data } = await api.delete(`/visitors/${id}`);
  return data;
};

// Portería paso 1: consulta si el RUN tiene visita hoy (no modifica nada)
// → { action: 'ENTRY' | 'EXIT', visitor, availableCards: number[], totalCards }
export const checkVisitor = async (run) => {
  const { data } = await api.get('/visitors/check', { params: { run } });
  return data;
};

// Portería paso 2: confirma la entrada (con tarjeta) o la salida
// → { action: 'ENTRY' | 'EXIT', visitor }
export const validateVisitor = async (run, cardNumber) => {
  const body = { run };
  if (cardNumber !== undefined && cardNumber !== null) body.cardNumber = cardNumber;
  const { data } = await api.put('/visitors/validate', body);
  return data;
};


