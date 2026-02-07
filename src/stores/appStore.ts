/**
 * Global App Store with Zustand
 * Centralized state management with persistence
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ==================== TYPES ====================
interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  locale: string;
  showBalances: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  autoLockTimeout: number; // minutes
}

interface AppState {
  // User
  user: User | null;
  isAuthenticated: boolean;

  // Settings
  settings: AppSettings;

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleBalanceVisibility: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ==================== DEFAULT VALUES ====================
const defaultSettings: AppSettings = {
  theme: 'system',
  currency: 'INR',
  locale: 'en-IN',
  showBalances: true,
  biometricEnabled: false,
  pinEnabled: false,
  autoLockTimeout: 5,
};

const defaultUser: User = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
};

// ==================== STORE ====================
export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial State
      user: defaultUser,
      isAuthenticated: true,
      settings: defaultSettings,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set((state) => {
        state.user = user;
        state.isAuthenticated = user !== null;
      }),

      updateSettings: (newSettings) => set((state) => {
        state.settings = { ...state.settings, ...newSettings };
      }),

      toggleBalanceVisibility: () => set((state) => {
        state.settings.showBalances = !state.settings.showBalances;
      }),

      setLoading: (loading) => set((state) => {
        state.isLoading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      }),

      clearError: () => set((state) => {
        state.error = null;
      }),

      reset: () => set((state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.settings = defaultSettings;
        state.error = null;
      }),
    })),
    {
      name: 'fintrace-app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        settings: state.settings,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ==================== SELECTORS ====================
export const useUser = () => useAppStore((state) => state.user);
export const useSettings = () => useAppStore((state) => state.settings);
export const useShowBalances = () => useAppStore((state) => state.settings.showBalances);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
