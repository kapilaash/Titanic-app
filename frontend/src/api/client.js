import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error(
    'REACT_APP_API_BASE_URL is missing. Create .env.development and .env.production in the frontend folder.'
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        status: error.response?.status,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default api;
