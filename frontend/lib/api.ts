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
  register: (data: { email: string; password: string; name: string }): Promise<any> =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }): Promise<any> =>
    api.post('/auth/login', data),
};

// 公众号API
export const accountsAPI = {
  list: (): Promise<any> => api.get('/accounts'),
  create: (data: { name: string; description?: string }): Promise<any> =>
    api.post('/accounts', data),
  get: (id: string): Promise<any> => api.get(`/accounts/${id}`),
  update: (id: string, data: any): Promise<any> => api.put(`/accounts/${id}`, data),
  delete: (id: string): Promise<any> => api.delete(`/accounts/${id}`),
};

// 文章API
export const articlesAPI = {
  list: (params?: { accountId?: string; page?: number; pageSize?: number }): Promise<any> =>
    api.get('/articles', { params }),
  create: (data: { accountId: string; url: string }): Promise<any> =>
    api.post('/articles', data),
  createBatch: (data: { accountId: string; urls: string[] }): Promise<any> =>
    api.post('/articles/batch', data),
  get: (id: string): Promise<any> => api.get(`/articles/${id}`),
  getContent: (id: string): Promise<any> => api.get(`/articles/${id}/content`),
  delete: (id: string): Promise<any> => api.delete(`/articles/${id}`),
  batchDelete: (ids: string[]): Promise<any> => api.post('/articles/batch-delete', { ids }),
};

// 维度API
export const dimensionsAPI = {
  list: (accountId: string): Promise<any> =>
    api.get('/dimensions', { params: { accountId } }),
  create: (data: any): Promise<any> => api.post('/dimensions', data),
  createFromImage: (data: {
    accountId: string;
    name: string;
    imageBase64: string;
  }): Promise<any> => api.post('/dimensions/from-image', data),
  get: (id: string): Promise<any> => api.get(`/dimensions/${id}`),
  update: (id: string, data: any): Promise<any> => api.put(`/dimensions/${id}`, data),
  lock: (id: string): Promise<any> => api.post(`/dimensions/${id}/lock`),
  unlock: (id: string): Promise<any> => api.post(`/dimensions/${id}/unlock`),
  addFields: (id: string, fields: any[]): Promise<any> =>
    api.post(`/dimensions/${id}/add-fields`, { fields }),
  aiGenerateField: (id: string, description: string): Promise<any> =>
    api.post(`/dimensions/${id}/ai-generate-field`, { description }),
  reorder: (accountId: string, templateIds: string[]): Promise<any> =>
    api.post(`/dimensions/reorder`, { templateIds }, { params: { accountId } }),
  delete: (id: string): Promise<any> => api.delete(`/dimensions/${id}`),
};

// 提取API
export const extractionsAPI = {
  extractAll: (articleId: string): Promise<any> =>
    api.post(`/extractions/articles/${articleId}/extract-all`),
  extractOne: (articleId: string, templateId: string): Promise<any> =>
    api.post(`/extractions/articles/${articleId}/templates/${templateId}`),
  getByArticle: (articleId: string): Promise<any> =>
    api.get(`/extractions/articles/${articleId}`),
  getByTemplate: (templateId: string, params?: { page?: number; pageSize?: number; keyword?: string }): Promise<any> =>
    api.get(`/extractions/templates/${templateId}`, { params }),
  export: (templateId: string): Promise<any> =>
    api.get(`/extractions/templates/${templateId}/export`),
  delete: (id: string): Promise<any> => api.delete(`/extractions/${id}`),
};

export default api;
