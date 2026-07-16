import axios from 'axios';
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://fitness-club-backend.vercel.app/'
});
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
export default API;
