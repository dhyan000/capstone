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
export const getDocument = (id) => api.get(`/documents/${id}`);
export const createDocument = (data) => {
    // If it's FormData, let Axios set the correct boundary header
    const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    return api.post('/documents/', data, { headers });
};
export const updateDocument = (id, data) => api.patch(`/documents/${id}`, data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`);

// ── AI ────────────────────────────────────────────────────────────────
export const askAI = (question) => api.post('/ai/ask', { question });

export default api;
