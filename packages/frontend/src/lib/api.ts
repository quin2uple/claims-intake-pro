import axios from 'axios';
import type { Case, CasesResponse, Stats } from '@/types';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const casesApi = {
  getAll: async (params?: {
    status?: string;
    source?: string;
    brand?: string;
    deadlineDays?: number;
    page?: number;
    limit?: number;
  }): Promise<CasesResponse> => {
    const response = await api.get('/cases', { params });
    return response.data;
  },

  getById: async (id: number): Promise<{ case: Case; activity: any[] }> => {
    const response = await api.get(`/cases/${id}`);
    return response.data;
  },

  updateStatus: async (
    id: number,
    data: {
      status: string;
      notes?: string;
      userName?: string;
      duplicateOf?: number;
    }
  ): Promise<{ case: Case }> => {
    const response = await api.patch(`/cases/${id}/status`, data);
    return response.data;
  },

  create: async (data: {
    brand: string;
    caseTitle: string;
    sourceUrl: string;
    deadline?: string;
    description?: string;
    userName?: string;
  }): Promise<{ case: Case }> => {
    const response = await api.post('/cases', data);
    return response.data;
  },

  delete: async (id: number, userName?: string): Promise<void> => {
    await api.delete(`/cases/${id}`, { data: { userName } });
  },
};

export const statsApi = {
  get: async (): Promise<Stats> => {
    const response = await api.get('/stats');
    return response.data;
  },

  getScrapeHistory: async (limit?: number): Promise<{ scrapes: any[] }> => {
    const response = await api.get('/stats/scrapes', { params: { limit } });
    return response.data;
  },
};

export default api;
