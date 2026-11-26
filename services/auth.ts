import api from './api';

export interface UserProfile {
  id: string;
  name: 'SUPERADMIN' | 'ADMIN' | 'PROPIETARIO' | 'CONSERJE' | string;
}

export interface UserDepartment {
  id: string;
  name: string;
  location?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  profile?: UserProfile;
  // Departamentos asignados al usuario (uno o más). El PROPIETARIO crea accesos solo en estos.
  departments?: UserDepartment[];
  // Empresa del usuario (viene en el login y en /auth/me) con su configuración:
  //  - cardsEnabled:     portería entrega tarjetas
  //  - allowsDateRange:  los accesos pueden valer por un período con inicio y término (arriendos)
  company?: {
    id: string;
    name: string;
    cardsEnabled?: boolean;
    requiresApproval?: boolean;
    allowsDateRange?: boolean;
  };
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post('/auth/login', { username, password });
  if (data?.access_token && typeof window !== 'undefined') {
    localStorage.setItem('token', data.access_token);
    if (data?.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }
  }
  return data;
};

// Datos actuales del usuario y su empresa. Sirve para reflejar cambios de configuración de la empresa
// (por ejemplo si usa tarjetas o no) sin que el usuario tenga que volver a iniciar sesión.
export const fetchMe = async (): Promise<AuthUser> => {
  const { data } = await api.get('/auth/me');
  if (typeof window !== 'undefined' && data) {
    localStorage.setItem('user', JSON.stringify(data));
  }
  return data;
};

export const logout = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const getCurrentUser = (): AuthUser | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
  return null;
};

