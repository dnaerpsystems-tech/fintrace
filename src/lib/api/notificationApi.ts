/**
 * Notification API - Server-side Notifications Management
 * Tier-One Standards: Complete notification system with push support
 */

import { apiClient } from './client';

// =============================================================================
// Types
// =============================================================================

export type NotificationType =
  | 'emi_reminder'
  | 'budget_alert'
  | 'goal_milestone'
  | 'low_balance'
  | 'bill_due'
  | 'investment_update'
  | 'family_invite'
  | 'sync_complete'
  | 'security_alert'
  | 'system';

export type NotificationPriority = 'high' | 'medium' | 'low';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  isRead: boolean;
  readAt: string | null;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface NotificationSettings {
  // Push notifications
  pushEnabled: boolean;
  pushToken?: string;

  // Email notifications
  emailEnabled: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';

  // Notification types
  emiReminders: boolean;
  emiReminderDays: number; // Days before due date
  budgetAlerts: boolean;
  budgetAlertThreshold: number; // Percentage (e.g., 80 = 80%)
  goalMilestones: boolean;
  lowBalanceAlerts: boolean;
  lowBalanceThreshold: number; // Amount in paise
  billReminders: boolean;
  investmentUpdates: boolean;
  familyNotifications: boolean;
  securityAlerts: boolean;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  pages: number;
}

export interface RegisterPushTokenRequest {
  token: string;
  platform: 'web' | 'android' | 'ios';
  deviceId?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get user's notifications
 */
export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  type?: NotificationType;
  unreadOnly?: boolean;
}): Promise<NotificationListResponse> {
  const response = await apiClient.get<NotificationListResponse>(
    '/api/v1/notifications',
    { params }
  );
  return response.data;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await apiClient.get<{ count: number }>(
    '/api/v1/notifications/unread-count'
  );
  return response.data.count;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  await apiClient.put(`/api/v1/notifications/${notificationId}/read`);
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  await apiClient.put('/api/v1/notifications/read-all');
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await apiClient.delete(`/api/v1/notifications/${notificationId}`);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await apiClient.delete('/api/v1/notifications');
}

/**
 * Get notification settings
 */
export async function getSettings(): Promise<NotificationSettings> {
  const response = await apiClient.get<NotificationSettings>(
    '/api/v1/notifications/settings'
  );
  return response.data;
}

/**
 * Update notification settings
 */
export async function updateSettings(
  settings: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  const response = await apiClient.put<NotificationSettings>(
    '/api/v1/notifications/settings',
    settings
  );
  return response.data;
}

/**
 * Register push notification token
 */
export async function registerPushToken(
  request: RegisterPushTokenRequest
): Promise<void> {
  await apiClient.post('/api/v1/notifications/push-token', request);
}

/**
 * Unregister push notification token
 */
export async function unregisterPushToken(token: string): Promise<void> {
  await apiClient.delete('/api/v1/notifications/push-token', {
    data: { token },
  });
}

/**
 * Create a local notification (for testing or offline use)
 */
export async function createNotification(
  request: CreateNotificationRequest
): Promise<Notification> {
  const response = await apiClient.post<Notification>(
    '/api/v1/notifications',
    request
  );
  return response.data;
}

/**
 * Check if notifications are available
 */
export function checkNotificationSupport(): {
  push: boolean;
  permission: NotificationPermission | 'unsupported';
} {
  const pushSupported = 'Notification' in window && 'serviceWorker' in navigator;

  let permission: NotificationPermission | 'unsupported' = 'unsupported';
  if (pushSupported) {
    permission = Notification.permission;
  }

  return {
    push: pushSupported,
    permission,
  };
}

/**
 * Request push notification permission
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// =============================================================================
// Export
// =============================================================================

export const notificationApi = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getSettings,
  updateSettings,
  registerPushToken,
  unregisterPushToken,
  createNotification,
  checkNotificationSupport,
  requestPushPermission,
};

export default notificationApi;
