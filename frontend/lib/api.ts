import axios from 'axios';

// 使用相对路径 /api,由 Next.js 代理转发到后端
const API_URL = '/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

// 公众号API
export const accountsAPI = {
  list: () => api.get('/accounts'),
  create: (data: { name: string; description?: string }) =>
    api.post('/accounts', data),
  get: (id: string) => api.get(`/accounts/${id}`),
  update: (id: string, data: any) => api.put(`/accounts/${id}`, data),
  delete: (id: string) => api.delete(`/accounts/${id}`),
};

// 文章API
export const articlesAPI = {
  list: (params?: { accountId?: string; page?: number; pageSize?: number }) =>
    api.get('/articles', { params }),
  create: (data: { accountId: string; url: string }) =>
    api.post('/articles', data),
  createBatch: (data: { accountId: string; urls: string[] }) =>
    api.post('/articles/batch', data),
  get: (id: string) => api.get(`/articles/${id}`),
  getContent: (id: string) => api.get(`/articles/${id}/content`),
  delete: (id: string) => api.delete(`/articles/${id}`),
  batchDelete: (ids: string[]) => api.post('/articles/batch-delete', { ids }),
};

// 维度API
export const dimensionsAPI = {
  list: (accountId: string) =>
    api.get('/dimensions', { params: { accountId } }),
  create: (data: any) => api.post('/dimensions', data),
  createFromImage: (data: {
    accountId: string;
    name: string;
    imageBase64: string;
  }) => api.post('/dimensions/from-image', data),
  get: (id: string) => api.get(`/dimensions/${id}`),
  update: (id: string, data: any) => api.put(`/dimensions/${id}`, data),
  lock: (id: string) => api.post(`/dimensions/${id}/lock`),
  unlock: (id: string) => api.post(`/dimensions/${id}/unlock`),
  addFields: (id: string, fields: any[]) =>
    api.post(`/dimensions/${id}/add-fields`, { fields }),
  aiGenerateField: (id: string, description: string) =>
    api.post(`/dimensions/${id}/ai-generate-field`, { description }),
  reorder: (accountId: string, templateIds: string[]) =>
    api.post(`/dimensions/reorder`, { templateIds }, { params: { accountId } }),
  delete: (id: string) => api.delete(`/dimensions/${id}`),
};

// 提取API
export const extractionsAPI = {
  extractAll: (articleId: string) =>
    api.post(`/extractions/articles/${articleId}/extract-all`),
  extractOne: (articleId: string, templateId: string) =>
    api.post(`/extractions/articles/${articleId}/templates/${templateId}`),
  getByArticle: (articleId: string) =>
    api.get(`/extractions/articles/${articleId}`),
  getByTemplate: (templateId: string, params?: { page?: number; pageSize?: number }) =>
    api.get(`/extractions/templates/${templateId}`, { params }),
  export: (templateId: string) =>
    api.get(`/extractions/templates/${templateId}/export`),
  delete: (id: string) => api.delete(`/extractions/${id}`),
};

export default api;
