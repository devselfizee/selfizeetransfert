import { create } from 'zustand';
import { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isInitialized: boolean;
  setAuth: (user: User, token: string) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
  setInitialized: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isInitialized: false,

  setAuth: (user: User, token: string) => {
    set({ user, token });
  },

  setToken: (token: string) => {
    set({ token });
  },

  clearAuth: () => {
    set({ user: null, token: null });
  },

  setInitialized: () => {
    set({ isInitialized: true });
  },
}));
