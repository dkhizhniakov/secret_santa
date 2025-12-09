import axios from 'axios';
import { AuthResponse, Group, User, Assignment } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = async (email: string, password: string, name: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/register', { email, password, name });
  return data;
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
  return data;
};

export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/auth/me');
  return data;
};

// Groups
export const getGroups = async (): Promise<Group[]> => {
  const { data } = await api.get<Group[]>('/groups');
  return data;
};

export const getGroup = async (id: string): Promise<Group> => {
  const { data } = await api.get<Group>(`/groups/${id}`);
  return data;
};

export const createGroup = async (group: { name: string; description?: string; budget?: string; eventDate?: string }): Promise<Group> => {
  const { data } = await api.post<Group>('/groups', group);
  return data;
};

export const deleteGroup = async (id: string): Promise<void> => {
  await api.delete(`/groups/${id}`);
};

export const joinGroup = async (codeOrId: string): Promise<Group> => {
  const { data } = await api.post<Group>(`/groups/${codeOrId}/join`);
  return data;
};

export const drawNames = async (id: string): Promise<Group> => {
  const { data } = await api.post<Group>(`/groups/${id}/draw`);
  return data;
};

export const getMyAssignment = async (groupId: string): Promise<Assignment> => {
  const { data } = await api.get<Assignment>(`/groups/${groupId}/my-assignment`);
  return data;
};

export default api;

