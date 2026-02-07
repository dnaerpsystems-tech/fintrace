/**
 * FinTrace API Client
 * Tier-one implementation with JWT handling, refresh token rotation,
 * offline detection, and comprehensive error handling
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

// =============================================================================
// Constants
// =============================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_VERSION = '/api/v1';
const TIMEOUT = 30000; // 30 seconds

// Storage keys
const ACCESS_TOKEN_KEY = 'fintrace_access_token';
const REFRESH_TOKEN_KEY = 'fintrace_refresh_token';
const USER_KEY = 'fintrace_user';

// =============================================================================
// Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  currency?: string;
  timezone?: string;
}

// =============================================================================
// Token Management
// =============================================================================

export const tokenManager = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getUser(): User | null {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as User;
    } catch {
      return null;
    }
  },

  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },
};

// =============================================================================
// Online/Offline Detection
// =============================================================================

export const networkStatus = {
  _listeners: new Set<(online: boolean) => void>(),

  isOnline(): boolean {
    return navigator.onLine;
  },

  subscribe(callback: (online: boolean) => void): () => void {
    this._listeners.add(callback);

    const handleOnline = () => callback(true);
    const handleOffline = () => callback(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      this._listeners.delete(callback);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
};

// =============================================================================
// API Error Handling
// =============================================================================

export class ApiRequestError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  field?: string;
  isNetworkError: boolean;
  isAuthError: boolean;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
    field?: string
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.field = field;
    this.isNetworkError = code === 'NETWORK_ERROR' || code === 'TIMEOUT';
    this.isAuthError = status === 401 || status === 403;
  }
}

function handleApiError(error: AxiosError<ApiResponse>): never {
  if (error.code === 'ECONNABORTED') {
    throw new ApiRequestError(
      'Request timed out. Please try again.',
      'TIMEOUT',
      0
    );
  }

  if (!error.response) {
    throw new ApiRequestError(
      'Network error. Please check your connection.',
      'NETWORK_ERROR',
      0
    );
  }

  const { status, data } = error.response;
  const apiError = data?.error;

  throw new ApiRequestError(
    apiError?.message || 'An unexpected error occurred',
    apiError?.code || 'UNKNOWN_ERROR',
    status,
    apiError?.details,
    apiError?.field
  );
}

// =============================================================================
// Refresh Token Logic
// =============================================================================

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeToTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function notifyRefreshSubscribers(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenManager.getRefreshToken();
  if (!refreshToken) return null;

  try {
    // Use a separate axios instance to avoid interceptor loops
    const response = await axios.post<ApiResponse<{ tokens: AuthTokens }>>(
      `${API_BASE_URL}${API_VERSION}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    if (response.data.success && response.data.data?.tokens) {
      const { tokens } = response.data.data;
      tokenManager.setTokens(tokens);
      return tokens.accessToken;
    }

    return null;
  } catch {
    // Refresh failed - clear tokens and redirect to login
    tokenManager.clearTokens();
    window.dispatchEvent(new CustomEvent('auth:logout'));
    return null;
  }
}

// =============================================================================
// Axios Instance
// =============================================================================

const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}${API_VERSION}`,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For CSRF cookies
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check if we're online
    if (!networkStatus.isOnline()) {
      return Promise.reject(
        new ApiRequestError(
          'You are offline. Please check your connection.',
          'OFFLINE',
          0
        )
      );
    }

    // Add access token if available
    const token = tokenManager.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        const newToken = await refreshAccessToken();
        isRefreshing = false;

        if (newToken) {
          notifyRefreshSubscribers(newToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }

          return apiClient(originalRequest);
        }

        // Token refresh failed
        return Promise.reject(
          new ApiRequestError(
            'Session expired. Please log in again.',
            'SESSION_EXPIRED',
            401
          )
        );
      }

      // Queue requests while refreshing
      return new Promise((resolve) => {
        subscribeToTokenRefresh((token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          resolve(apiClient(originalRequest));
        });
      });
    }

    return handleApiError(error);
  }
);

// =============================================================================
// API Methods
// =============================================================================

export const api = {
  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new ApiRequestError(
        response.data.error?.message || 'Request failed',
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }
    return response.data.data as T;
  },

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await apiClient.post<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new ApiRequestError(
        response.data.error?.message || 'Request failed',
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }
    return response.data.data as T;
  },

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await apiClient.put<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new ApiRequestError(
        response.data.error?.message || 'Request failed',
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }
    return response.data.data as T;
  },

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
    if (!response.data.success) {
      throw new ApiRequestError(
        response.data.error?.message || 'Request failed',
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }
    return response.data.data as T;
  },

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<ApiResponse<T>>(url, config);
    if (!response.data.success) {
      throw new ApiRequestError(
        response.data.error?.message || 'Request failed',
        response.data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }
    return response.data.data as T;
  },

  /**
   * Upload file
   */
  async upload<T>(
    url: string,
    file: File,
    fieldName = 'file',
    additionalData?: Record<string, string>
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        formData.append(key, value);
      }
    }

    const response = await apiClient.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.success) {
      throw new ApiRequestError(
        response.data.error?.message || 'Upload failed',
        response.data.error?.code || 'UPLOAD_ERROR',
        response.status
      );
    }

    return response.data.data as T;
  },
};

// =============================================================================
// Exports
// =============================================================================

export { apiClient };
export default api;
