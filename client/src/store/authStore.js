import { create } from 'zustand';
import api from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('faji_token'),
  loading: true,

  init: async () => {
    const token = localStorage.getItem('faji_token');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('faji_token');
      set({ token: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('faji_token', data.token);
    set({ token: data.token, user: data.user });
  },

  // Registration no longer returns a token — account is pending admin approval.
  // Returns the response data so the UI can display the success message.
  register: async (form) => {
    const { data } = await api.post('/auth/register', form);
    return data; // { message: 'Registration successful! Your account is pending...' }
  },

  logout: () => {
    localStorage.removeItem('faji_token');
    set({ user: null, token: null });
  },
}));



// import { create } from 'zustand';
// import api from '../services/api';

// export const useAuthStore = create((set) => ({
//   user: null,
//   token: localStorage.getItem('faji_token'),
//   loading: true,

//   init: async () => {
//     const token = localStorage.getItem('faji_token');
//     if (!token) return set({ loading: false });
//     try {
//       const { data } = await api.get('/auth/me');
//       set({ user: data, loading: false });
//     } catch {
//       localStorage.removeItem('faji_token');
//       set({ token: null, loading: false });
//     }
//   },

//   login: async (email, password) => {
//     const { data } = await api.post('/auth/login', { email, password });
//     localStorage.setItem('faji_token', data.token);
//     set({ token: data.token, user: data.user });
//   },

//   register: async (form) => {
//     const { data } = await api.post('/auth/register', form);
//     localStorage.setItem('faji_token', data.token);
//     set({ token: data.token, user: data.user });
//   },

//   logout: () => {
//     localStorage.removeItem('faji_token');
//     set({ user: null, token: null });
//   },
// }));
