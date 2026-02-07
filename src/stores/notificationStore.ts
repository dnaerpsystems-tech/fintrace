/**
 * Notification Store
 * Manages notification state and local notification triggers
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  notificationApi,
  type Notification,
  type NotificationSettings,
  type NotificationType,
  type NotificationPriority,
} from '@/lib/api/notificationApi';
import { networkStatus } from '@/lib/api/client';

// =============================================================================
// Types
// =============================================================================

export interface LocalNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority: NotificationPriority;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationState {
  // Remote notifications
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;

  // Local notifications (for offline use)
  localNotifications: LocalNotification[];

  // Settings
  settings: NotificationSettings | null;

  // Push
  pushPermission: NotificationPermission | 'unsupported';
  pushToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  fetchNotifications: (params?: { page?: number; unreadOnly?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  addLocalNotification: (notification: Omit<LocalNotification, 'id' | 'isRead' | 'createdAt'>) => void;
  clearLocalNotifications: () => void;
  clearError: () => void;
}

// =============================================================================
// Default Settings
// =============================================================================

const defaultSettings: NotificationSettings = {
  pushEnabled: false,
  emailEnabled: true,
  emailDigest: 'weekly',
  emiReminders: true,
  emiReminderDays: 3,
  budgetAlerts: true,
  budgetAlertThreshold: 80,
  goalMilestones: true,
  lowBalanceAlerts: true,
  lowBalanceThreshold: 100000, // ₹1000 in paise
  billReminders: true,
  investmentUpdates: true,
  familyNotifications: true,
  securityAlerts: true,
};

// =============================================================================
// Store
// =============================================================================

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      error: null,
      localNotifications: [],
      settings: null,
      pushPermission: 'unsupported',
      pushToken: null,

      /**
       * Initialize notification store
       */
      initialize: async () => {
        // Check push permission
        const { permission } = notificationApi.checkNotificationSupport();
        set({ pushPermission: permission });

        // Fetch notifications if online
        if (networkStatus.isOnline()) {
          try {
            await get().fetchNotifications();
            await get().fetchSettings();
          } catch (error) {
            console.error('Failed to initialize notifications:', error);
          }
        }
      },

      /**
       * Fetch notifications from server
       */
      fetchNotifications: async (params) => {
        set({ isLoading: true, error: null });

        try {
          const response = await notificationApi.getNotifications(params);
          set({
            notifications: response.notifications,
            unreadCount: response.unreadCount,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch notifications',
          });
        }
      },

      /**
       * Mark notification as read
       */
      markAsRead: async (id) => {
        try {
          // Optimistic update
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
            localNotifications: state.localNotifications.map((n) =>
              n.id === id ? { ...n, isRead: true } : n
            ),
          }));

          // Sync with server if online
          if (networkStatus.isOnline()) {
            await notificationApi.markAsRead(id);
          }
        } catch (error) {
          console.error('Failed to mark notification as read:', error);
        }
      },

      /**
       * Mark all notifications as read
       */
      markAllAsRead: async () => {
        try {
          set((state) => ({
            notifications: state.notifications.map((n) => ({
              ...n,
              isRead: true,
              readAt: new Date().toISOString(),
            })),
            unreadCount: 0,
            localNotifications: state.localNotifications.map((n) => ({
              ...n,
              isRead: true,
            })),
          }));

          if (networkStatus.isOnline()) {
            await notificationApi.markAllAsRead();
          }
        } catch (error) {
          console.error('Failed to mark all as read:', error);
        }
      },

      /**
       * Delete a notification
       */
      deleteNotification: async (id) => {
        try {
          set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
            localNotifications: state.localNotifications.filter((n) => n.id !== id),
          }));

          if (networkStatus.isOnline()) {
            await notificationApi.deleteNotification(id);
          }
        } catch (error) {
          console.error('Failed to delete notification:', error);
        }
      },

      /**
       * Clear all notifications
       */
      clearAll: async () => {
        try {
          set({ notifications: [], localNotifications: [], unreadCount: 0 });

          if (networkStatus.isOnline()) {
            await notificationApi.clearAllNotifications();
          }
        } catch (error) {
          console.error('Failed to clear notifications:', error);
        }
      },

      /**
       * Fetch notification settings
       */
      fetchSettings: async () => {
        try {
          const settings = await notificationApi.getSettings();
          set({ settings });
        } catch {
          // Use default settings if fetch fails
          set({ settings: defaultSettings });
        }
      },

      /**
       * Update notification settings
       */
      updateSettings: async (updates) => {
        try {
          const currentSettings = get().settings || defaultSettings;
          const newSettings = { ...currentSettings, ...updates };

          set({ settings: newSettings });

          if (networkStatus.isOnline()) {
            await notificationApi.updateSettings(updates);
          }
        } catch (error) {
          console.error('Failed to update settings:', error);
        }
      },

      /**
       * Request push notification permission
       */
      requestPushPermission: async () => {
        try {
          const permission = await notificationApi.requestPushPermission();
          set({ pushPermission: permission });
          return permission === 'granted';
        } catch {
          return false;
        }
      },

      /**
       * Add a local notification (for offline or triggered alerts)
       */
      addLocalNotification: (notification) => {
        const newNotification: LocalNotification = {
          ...notification,
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          localNotifications: [newNotification, ...state.localNotifications],
          unreadCount: state.unreadCount + 1,
        }));

        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/icons/icon-192.png',
            tag: newNotification.id,
          });
        }
      },

      /**
       * Clear local notifications
       */
      clearLocalNotifications: () => {
        set({ localNotifications: [] });
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'fintrace-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        localNotifications: state.localNotifications,
        settings: state.settings,
        pushToken: state.pushToken,
      }),
    }
  )
);

// =============================================================================
// Notification Triggers (Local)
// =============================================================================

/**
 * Check and trigger EMI reminder notifications
 */
export async function checkEMIReminders(): Promise<void> {
  const store = useNotificationStore.getState();
  const settings = store.settings;

  if (!settings?.emiReminders) return;

  // Import dynamically to avoid circular dependencies
  const { db } = await import('@/db');
  const loans = await db.loans.filter((l) => l.status === 'active').toArray();

  const today = new Date();
  const reminderDate = new Date();
  reminderDate.setDate(today.getDate() + (settings.emiReminderDays || 3));

  for (const loan of loans) {
    // Check if EMI is due within reminder period
    // This is simplified - in production, you'd check the actual EMI schedule
    const emiDay = loan.emiDay || 1;
    const nextEmiDate = new Date(today.getFullYear(), today.getMonth(), emiDay);

    if (nextEmiDate < today) {
      nextEmiDate.setMonth(nextEmiDate.getMonth() + 1);
    }

    if (nextEmiDate <= reminderDate) {
      store.addLocalNotification({
        type: 'emi_reminder',
        title: 'EMI Payment Due Soon',
        message: `Your ${loan.type} loan EMI of ₹${(loan.emiAmount / 100).toLocaleString('en-IN')} is due on ${nextEmiDate.toLocaleDateString('en-IN')}`,
        priority: 'high',
        data: { loanId: loan.id },
        actionUrl: `/loans/${loan.id}`,
      });
    }
  }
}

/**
 * Check and trigger budget alert notifications
 */
export async function checkBudgetAlerts(): Promise<void> {
  const store = useNotificationStore.getState();
  const settings = store.settings;

  if (!settings?.budgetAlerts) return;

  const { getBudgetAlerts } = await import('@/lib/services/budgetService');
  const alerts = await getBudgetAlerts('default-user');

  for (const alert of alerts) {
    if (alert.percentage >= (settings.budgetAlertThreshold || 80)) {
      store.addLocalNotification({
        type: 'budget_alert',
        title: 'Budget Alert',
        message: alert.message,
        priority: alert.type === 'over' ? 'high' : 'medium',
        data: { budgetId: alert.budgetId },
        actionUrl: '/budgets',
      });
    }
  }
}

/**
 * Check and trigger low balance notifications
 */
export async function checkLowBalanceAlerts(): Promise<void> {
  const store = useNotificationStore.getState();
  const settings = store.settings;

  if (!settings?.lowBalanceAlerts) return;

  const { db } = await import('@/db');
  const accounts = await db.accounts
    .filter((a) => !a.isArchived && a.includeInTotal)
    .toArray();

  const threshold = settings.lowBalanceThreshold || 100000; // ₹1000 default

  for (const account of accounts) {
    if (account.balance < threshold && account.balance > 0) {
      store.addLocalNotification({
        type: 'low_balance',
        title: 'Low Balance Alert',
        message: `${account.name} balance is low: ₹${(account.balance / 100).toLocaleString('en-IN')}`,
        priority: 'medium',
        data: { accountId: account.id },
        actionUrl: '/accounts',
      });
    }
  }
}

/**
 * Check and trigger goal milestone notifications
 */
export async function checkGoalMilestones(): Promise<void> {
  const store = useNotificationStore.getState();
  const settings = store.settings;

  if (!settings?.goalMilestones) return;

  const { db } = await import('@/db');
  const goals = await db.goals.filter((g) => g.status === 'active').toArray();

  const milestones = [25, 50, 75, 90, 100];

  for (const goal of goals) {
    const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);

    for (const milestone of milestones) {
      if (progress >= milestone) {
        // Check if we already notified for this milestone
        const notificationKey = `goal-milestone-${goal.id}-${milestone}`;
        const existingNotification = store.localNotifications.find(
          (n) => n.data?.notificationKey === notificationKey
        );

        if (!existingNotification) {
          store.addLocalNotification({
            type: 'goal_milestone',
            title: progress >= 100 ? 'Goal Achieved!' : 'Goal Milestone Reached',
            message:
              progress >= 100
                ? `Congratulations! You've reached your "${goal.name}" goal!`
                : `You've reached ${milestone}% of your "${goal.name}" goal!`,
            priority: progress >= 100 ? 'high' : 'medium',
            data: { goalId: goal.id, milestone, notificationKey },
            actionUrl: `/goals/${goal.id}`,
          });
        }
      }
    }
  }
}

/**
 * Run all notification checks
 */
export async function runNotificationChecks(): Promise<void> {
  try {
    await Promise.all([
      checkEMIReminders(),
      checkBudgetAlerts(),
      checkLowBalanceAlerts(),
      checkGoalMilestones(),
    ]);
  } catch (error) {
    console.error('Error running notification checks:', error);
  }
}

// =============================================================================
// Selectors
// =============================================================================

export const selectUnreadCount = (state: NotificationState) => state.unreadCount;
export const selectNotifications = (state: NotificationState) => [
  ...state.localNotifications,
  ...state.notifications,
].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
export const selectSettings = (state: NotificationState) => state.settings;

export default useNotificationStore;
