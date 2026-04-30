import axios from "axios";

// Updated to localhost to match your Django Site domain configuration
const BASE_URL = "http://localhost:8000"; 

const API = axios.create({
  baseURL: `${BASE_URL}/api/`,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access (e.g., redirect to login)
    }
    return Promise.reject(error);
  }
);

export default API;