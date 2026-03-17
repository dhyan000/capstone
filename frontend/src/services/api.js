import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ── Auth ──────────────────────────────────────────────────────────────
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// ── Documents ─────────────────────────────────────────────────────────
export const getDocuments = (params) => api.get('/documents/', { params });
export const getDocumentById = (id) => api.get(`/documents/${id}`);
export const createDocument = (data) => {
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    return api.post('/documents/', data, { headers });
};
export const updateDocument = (id, data) => api.patch(`/documents/${id}`, data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// Fetch the raw file blob for in-browser viewing
export const getDocumentFile = (id) =>
    api.get(`/documents/${id}/file`, {
        responseType: 'blob',
        validateStatus: () => true,
    });

// Ask a question about one specific document
export const askDocumentAI = (id, question) =>
    api.post(`/documents/${id}/ask`, { question });

// Knowledge graph data
export const getKnowledgeGraph = () => api.get('/documents/graph');

// ── AI ────────────────────────────────────────────────────────────────
export const askAI = (question) => api.post('/ai/ask', { question });

// ── Stats ─────────────────────────────────────────────────────────────
export const getDashboardStats = () => api.get('/stats/dashboard');

export default api;
