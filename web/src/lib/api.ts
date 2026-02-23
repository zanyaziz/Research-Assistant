import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const topicsApi = {
  list: () => api.get('/topics').then((r) => r.data),
  get: (id: string) => api.get(`/topics/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/topics', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/topics/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/topics/${id}`),
  runNow: (id: string) => api.post(`/topics/${id}/run`).then((r) => r.data),
};

export const briefsApi = {
  list: (params?: Record<string, string>) => api.get('/briefs', { params }).then((r) => r.data),
  today: () => api.get('/briefs/today').then((r) => r.data),
  get: (id: string) => api.get(`/briefs/${id}`).then((r) => r.data),
};

export const digestsApi = {
  list: () => api.get('/digests').then((r) => r.data),
  latest: () => api.get('/digests/latest').then((r) => r.data),
  getByDate: (date: string) => api.get(`/digests/${date}`).then((r) => r.data),
};

export const runsApi = {
  list: (params?: Record<string, string>) => api.get('/runs', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/runs/${id}`).then((r) => r.data),
};

export const adaptersApi = {
  list: () => api.get('/adapters').then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get('/settings').then((r) => r.data),
};

export const searchApi = {
  search: (q: string) => api.get('/search', { params: { q } }).then((r) => r.data),
};
