import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('faji_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      const hadToken = !!localStorage.getItem('faji_token');
      localStorage.removeItem('faji_token');
      // Only redirect to login if the user had an active session (token expired)
      // Don't redirect guests making public API calls that happen to return 401
      if (hadToken) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;




// // src/services/api.js
// import axios from 'axios';

// const api = axios.create({ baseURL: '/api' });

// api.interceptors.request.use(cfg => {
//   const token = localStorage.getItem('faji_token');
//   if (token) cfg.headers.Authorization = `Bearer ${token}`;
//   return cfg;
// });

// api.interceptors.response.use(
//   r => r,
//   err => {
//     if (err.response?.status === 401) {
//       localStorage.removeItem('faji_token');
//       window.location.href = '/login';
//     }
//     return Promise.reject(err);
//   }
// );

// export default api;
