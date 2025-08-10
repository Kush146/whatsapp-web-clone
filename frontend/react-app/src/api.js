// src/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5001",
});

export const getConversations = () => api.get("/api/messages/conversations");
export const getMessagesByUser = (wa_id) =>
  api.get(`/api/messages/by-user`, { params: { wa_id } });
export const sendMessage = (payload) => api.post("/api/messages", payload);
export const deleteMessage = (id) => api.delete(`/api/messages/${id}`);
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';
