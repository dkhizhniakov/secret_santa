import axios from 'axios';
import { Raffle, User, Assignment } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

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
export const getMe = async (): Promise<User> => {
  const { data } = await api.get<User>('/auth/me');
  return data;
};

export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};

// Raffles
export const getRaffles = async (): Promise<Raffle[]> => {
  const { data } = await api.get<Raffle[]>('/raffles');
  return data;
};

export const getRaffle = async (id: string): Promise<Raffle> => {
  const { data } = await api.get<Raffle>(`/raffles/${id}`);
  return data;
};

export const createRaffle = async (raffle: { name: string; description?: string; avatarUrl?: string; budget?: string; eventDate?: string }): Promise<Raffle> => {
  const { data } = await api.post<Raffle>('/raffles', raffle);
  return data;
};

// Upload avatar
export const uploadAvatar = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const { data } = await api.post<{ url: string }>('/upload/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const deleteRaffle = async (id: string): Promise<void> => {
  await api.delete(`/raffles/${id}`);
};

export const joinRaffle = async (codeOrId: string): Promise<Raffle> => {
  const { data } = await api.post<Raffle>(`/raffles/${codeOrId}/join`);
  return data;
};

export const drawNames = async (id: string): Promise<Raffle> => {
  const { data } = await api.post<Raffle>(`/raffles/${id}/draw`);
  return data;
};

export const getMyAssignment = async (raffleId: string): Promise<Assignment> => {
  const { data } = await api.get<Assignment>(`/raffles/${raffleId}/my-assignment`);
  return data;
};

export default api;
