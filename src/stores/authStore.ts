/**
 * FinTrace Auth Store
 * Tier-one Zustand store for authentication state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  api,
  tokenManager,
  type AuthTokens,
  type User,
  type LoginCredentials,
  type RegisterData,
  ApiRequestError,
} from '@/lib/api/client';

// =============================================================================
// Types
// =============================================================================

export interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
}

interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  message: string;
}

// =============================================================================
// Store
// =============================================================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,

      /**
       * Initialize auth state on app load
       * Checks for existing tokens and validates session
       */
      initialize: async () => {
        const accessToken = tokenManager.getAccessToken();

        if (!accessToken) {
          set({ isInitialized: true, isAuthenticated: false, user: null });
          return;
        }

        try {
          set({ isLoading: true });

          // Fetch current user to validate token
          const user = await api.get<User>('/users/me');

          tokenManager.setUser(user);
          set({
            user,
            isAuthenticated: true,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          // Token invalid - clear and reset
          tokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isInitialized: true,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * Login with email and password
       */
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post<LoginResponse>('/auth/login', credentials);

          tokenManager.setTokens(response.tokens);
          tokenManager.setUser(response.user);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? error.message
              : 'Login failed. Please try again.';

          set({
            isLoading: false,
            error: message,
          });

          throw error;
        }
      },

      /**
       * Register a new user
       */
      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.post<RegisterResponse>('/auth/register', data);

          tokenManager.setTokens(response.tokens);
          tokenManager.setUser(response.user);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? error.message
              : 'Registration failed. Please try again.';

          set({
            isLoading: false,
            error: message,
          });

          throw error;
        }
      },

      /**
       * Logout and clear all auth data
       */
      logout: async () => {
        set({ isLoading: true });

        try {
          // Call logout endpoint to invalidate refresh token
          await api.post('/auth/logout');
        } catch {
          // Ignore errors - we're logging out anyway
        } finally {
          tokenManager.clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      /**
       * Request password reset email
       */
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          await api.post('/auth/forgot-password', { email });
          set({ isLoading: false });
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? error.message
              : 'Failed to send reset email. Please try again.';

          set({
            isLoading: false,
            error: message,
          });

          throw error;
        }
      },

      /**
       * Reset password with token
       */
      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          await api.post('/auth/reset-password', { token, password });
          set({ isLoading: false });
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? error.message
              : 'Failed to reset password. Please try again.';

          set({
            isLoading: false,
            error: message,
          });

          throw error;
        }
      },

      /**
       * Verify email with token
       */
      verifyEmail: async (token: string) => {
        set({ isLoading: true, error: null });

        try {
          await api.post('/auth/verify-email', { token });

          // Update user if logged in
          const { user } = get();
          if (user) {
            set({
              user: { ...user },
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? error.message
              : 'Failed to verify email. Please try again.';

          set({
            isLoading: false,
            error: message,
          });

          throw error;
        }
      },

      /**
       * Refresh user data from server
       */
      refreshUser: async () => {
        if (!get().isAuthenticated) return;

        try {
          const user = await api.get<User>('/users/me');
          tokenManager.setUser(user);
          set({ user });
        } catch {
          // Token might be invalid
          await get().logout();
        }
      },

      /**
       * Update user profile
       */
      updateProfile: async (data: Partial<User>) => {
        set({ isLoading: true, error: null });

        try {
          const updatedUser = await api.put<User>('/users/me', data);
          tokenManager.setUser(updatedUser);
          set({
            user: updatedUser,
            isLoading: false,
          });
        } catch (error) {
          const message =
            error instanceof ApiRequestError
              ? error.message
              : 'Failed to update profile. Please try again.';

          set({
            isLoading: false,
            error: message,
          });

          throw error;
        }
      },

      /**
       * Clear error state
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'fintrace-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// =============================================================================
// Selectors
// =============================================================================

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectIsInitialized = (state: AuthState) => state.isInitialized;
export const selectError = (state: AuthState) => state.error;

// =============================================================================
// Listen for logout events
// =============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}

export default useAuthStore;
