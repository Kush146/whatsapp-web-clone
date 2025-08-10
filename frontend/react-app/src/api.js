// src/api.js
import axios from 'axios';

// Read from env, strip trailing slashes, fallback to local dev
const fromEnv = (process.env.REACT_APP_API_BASE || '').replace(/\/+$/, '');
export const API_BASE = fromEnv || 'http://localhost:5001/api';

// Helpful to verify in prod builds
// eslint-disable-next-line no-console
console.log('API_BASE =', API_BASE);

const api = axios.create({
  baseURL: API_BASE,
});

// Endpoints (baseURL already contains /api)
export const getConversations   = () => api.get('/messages/conversations');
export const getMessagesByUser  = (wa_id) => api.get('/messages/by-user', { params: { wa_id } });
export const sendMessage        = (payload) => api.post('/messages', payload);
export const deleteMessage      = (id) => api.delete(`/messages/${id}`);

export default api;
