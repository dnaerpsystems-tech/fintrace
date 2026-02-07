/**
 * Push Notification Service
 * Handles bill reminders, budget alerts, and other notifications
 */

// ============================================
// Types
// ============================================

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface ScheduledNotification {
  id: string;
  type: 'bill_reminder' | 'budget_alert' | 'goal_milestone' | 'loan_emi' | 'investment_update' | 'custom';
  payload: NotificationPayload;
  scheduledAt: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  entityId?: string; // Related entity (bill ID, budget ID, etc.)
  isActive: boolean;
  lastTriggered?: Date;
}

export interface NotificationPreferences {
  enabled: boolean;
  billReminders: boolean;
  billReminderDays: number; // Days before due date
  budgetAlerts: boolean;
  budgetAlertThreshold: number; // Percentage (e.g., 80 for 80%)
  goalMilestones: boolean;
  loanEMIReminders: boolean;
  emiReminderDays: number;
  dailySummary: boolean;
  dailySummaryTime: string; // HH:mm format
  weeklySummary: boolean;
  weeklySummaryDay: number; // 0-6
}

// ============================================
// Default Preferences
// ============================================

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  billReminders: true,
  billReminderDays: 3,
  budgetAlerts: true,
  budgetAlertThreshold: 80,
  goalMilestones: true,
  loanEMIReminders: true,
  emiReminderDays: 3,
  dailySummary: false,
  dailySummaryTime: '09:00',
  weeklySummary: true,
  weeklySummaryDay: 0, // Sunday
};

// ============================================
// Permission & Support Check
// ============================================

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

// ============================================
// Local Notifications
// ============================================

export async function showNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    // Try to use service worker for persistent notifications
    const registration = await navigator.serviceWorker.ready;
    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag,
      data: payload.data,
      requireInteraction: payload.requireInteraction,
    };
    await registration.showNotification(payload.title, options);
    return true;
  } catch {
    // Fallback to basic notification
    new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      tag: payload.tag,
      data: payload.data,
    });
    return true;
  }
}

// ============================================
// Notification Templates
// ============================================

export function createBillReminderNotification(
  billName: string,
  amount: number,
  dueDate: Date,
  daysUntilDue: number
): NotificationPayload {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100);

  let body: string;
  if (daysUntilDue === 0) {
    body = `${billName} of ${formattedAmount} is due today!`;
  } else if (daysUntilDue === 1) {
    body = `${billName} of ${formattedAmount} is due tomorrow`;
  } else {
    body = `${billName} of ${formattedAmount} is due in ${daysUntilDue} days`;
  }

  return {
    title: 'Bill Reminder',
    body,
    icon: '/icons/bill-reminder.png',
    tag: `bill-${billName}`,
    data: { type: 'bill_reminder', billName, amount, dueDate: dueDate.toISOString() },
    actions: [
      { action: 'pay', title: 'Mark as Paid' },
      { action: 'snooze', title: 'Remind Later' },
    ],
    requireInteraction: daysUntilDue <= 1,
  };
}

export function createBudgetAlertNotification(
  categoryName: string,
  spent: number,
  budget: number,
  percentUsed: number
): NotificationPayload {
  const formatAmount = (amt: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt / 100);

  let title: string;
  let body: string;

  if (percentUsed >= 100) {
    title = 'Budget Exceeded!';
    body = `You've exceeded your ${categoryName} budget. Spent ${formatAmount(spent)} of ${formatAmount(budget)}`;
  } else if (percentUsed >= 90) {
    title = 'Budget Almost Exhausted';
    body = `${categoryName}: ${percentUsed.toFixed(0)}% used. Only ${formatAmount(budget - spent)} remaining`;
  } else {
    title = 'Budget Alert';
    body = `${categoryName}: You've used ${percentUsed.toFixed(0)}% of your budget`;
  }

  return {
    title,
    body,
    icon: '/icons/budget-alert.png',
    tag: `budget-${categoryName}`,
    data: { type: 'budget_alert', categoryName, spent, budget, percentUsed },
    requireInteraction: percentUsed >= 100,
  };
}

export function createGoalMilestoneNotification(
  goalName: string,
  currentAmount: number,
  targetAmount: number,
  percentComplete: number
): NotificationPayload {
  const formatAmount = (amt: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt / 100);

  let title: string;
  let body: string;

  if (percentComplete >= 100) {
    title = 'Goal Achieved!';
    body = `Congratulations! You've reached your ${goalName} goal of ${formatAmount(targetAmount)}!`;
  } else if (percentComplete >= 75) {
    title = 'Almost There!';
    body = `${goalName}: ${percentComplete.toFixed(0)}% complete. Just ${formatAmount(targetAmount - currentAmount)} to go!`;
  } else if (percentComplete >= 50) {
    title = 'Halfway There!';
    body = `${goalName}: You're ${percentComplete.toFixed(0)}% of the way to your goal!`;
  } else {
    title = 'Goal Progress';
    body = `${goalName}: ${percentComplete.toFixed(0)}% complete`;
  }

  return {
    title,
    body,
    icon: '/icons/goal-milestone.png',
    tag: `goal-${goalName}`,
    data: { type: 'goal_milestone', goalName, currentAmount, targetAmount, percentComplete },
  };
}

export function createEMIReminderNotification(
  loanName: string,
  emiAmount: number,
  dueDate: Date,
  daysUntilDue: number
): NotificationPayload {
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(emiAmount / 100);

  let body: string;
  if (daysUntilDue === 0) {
    body = `${loanName} EMI of ${formattedAmount} is due today!`;
  } else if (daysUntilDue === 1) {
    body = `${loanName} EMI of ${formattedAmount} is due tomorrow`;
  } else {
    body = `${loanName} EMI of ${formattedAmount} is due in ${daysUntilDue} days`;
  }

  return {
    title: 'EMI Reminder',
    body,
    icon: '/icons/emi-reminder.png',
    tag: `emi-${loanName}`,
    data: { type: 'loan_emi', loanName, emiAmount, dueDate: dueDate.toISOString() },
    actions: [
      { action: 'pay', title: 'Mark as Paid' },
      { action: 'view', title: 'View Details' },
    ],
    requireInteraction: daysUntilDue <= 1,
  };
}

export function createDailySummaryNotification(
  todaySpent: number,
  todayIncome: number,
  transactionCount: number
): NotificationPayload {
  const formatAmount = (amt: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.abs(amt) / 100);

  const netChange = todayIncome - todaySpent;

  return {
    title: 'Daily Summary',
    body: `Today: ${formatAmount(todaySpent)} spent, ${formatAmount(todayIncome)} earned. ${transactionCount} transactions.`,
    icon: '/icons/summary.png',
    tag: 'daily-summary',
    data: { type: 'daily_summary', todaySpent, todayIncome, transactionCount },
  };
}

// ============================================
// Preferences Management
// ============================================

const PREFERENCES_KEY = 'notification_preferences';

export function getPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(prefs: Partial<NotificationPreferences>): void {
  const current = getPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
}

// ============================================
// Scheduled Notifications Storage
// ============================================

const SCHEDULED_KEY = 'scheduled_notifications';

export function getScheduledNotifications(): ScheduledNotification[] {
  try {
    const stored = localStorage.getItem(SCHEDULED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((n: any) => ({
        ...n,
        scheduledAt: new Date(n.scheduledAt),
        lastTriggered: n.lastTriggered ? new Date(n.lastTriggered) : undefined,
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

export function saveScheduledNotifications(notifications: ScheduledNotification[]): void {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(notifications));
}

export function scheduleNotification(notification: Omit<ScheduledNotification, 'id'>): ScheduledNotification {
  const scheduled: ScheduledNotification = {
    ...notification,
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  const all = getScheduledNotifications();
  all.push(scheduled);
  saveScheduledNotifications(all);

  return scheduled;
}

export function cancelScheduledNotification(id: string): void {
  const all = getScheduledNotifications();
  const filtered = all.filter(n => n.id !== id);
  saveScheduledNotifications(filtered);
}

export function updateScheduledNotification(id: string, updates: Partial<ScheduledNotification>): void {
  const all = getScheduledNotifications();
  const updated = all.map(n => n.id === id ? { ...n, ...updates } : n);
  saveScheduledNotifications(updated);
}

// ============================================
// Check & Trigger Due Notifications
// ============================================

export async function checkAndTriggerNotifications(): Promise<number> {
  const prefs = getPreferences();
  if (!prefs.enabled) return 0;
  if (Notification.permission !== 'granted') return 0;

  const scheduled = getScheduledNotifications();
  const now = new Date();
  let triggered = 0;

  for (const notification of scheduled) {
    if (!notification.isActive) continue;
    if (notification.scheduledAt > now) continue;

    // Check if already triggered recently
    if (notification.lastTriggered) {
      const hoursSinceLastTrigger = (now.getTime() - notification.lastTriggered.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrigger < 12) continue; // Don't repeat within 12 hours
    }

    // Show the notification
    const shown = await showNotification(notification.payload);
    if (shown) {
      triggered++;

      // Update last triggered time
      if (notification.recurring) {
        updateScheduledNotification(notification.id, {
          lastTriggered: now,
          scheduledAt: calculateNextTrigger(notification.recurring),
        });
      } else {
        // One-time notification - mark as inactive
        updateScheduledNotification(notification.id, {
          isActive: false,
          lastTriggered: now,
        });
      }
    }
  }

  return triggered;
}

function calculateNextTrigger(recurring: ScheduledNotification['recurring']): Date {
  if (!recurring) return new Date();

  const now = new Date();
  const next = new Date(now);

  switch (recurring.frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      if (recurring.dayOfWeek !== undefined) {
        const daysUntilTarget = (recurring.dayOfWeek - next.getDay() + 7) % 7;
        next.setDate(next.getDate() + daysUntilTarget);
      }
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      if (recurring.dayOfMonth) {
        next.setDate(recurring.dayOfMonth);
      }
      break;
  }

  return next;
}

// ============================================
// Service Worker Registration
// ============================================

export async function registerNotificationServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/notification-sw.js');
    console.log('Notification service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Failed to register notification service worker:', error);
    return null;
  }
}

// ============================================
// Initialize Background Check
// ============================================

let checkInterval: NodeJS.Timeout | null = null;

export function startNotificationChecker(intervalMinutes = 15): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  // Check immediately
  checkAndTriggerNotifications();

  // Check periodically
  checkInterval = setInterval(() => {
    checkAndTriggerNotifications();
  }, intervalMinutes * 60 * 1000);
}

export function stopNotificationChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

// ============================================
// Export Service
// ============================================

export const pushNotificationService = {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  showNotification,
  getPreferences,
  savePreferences,
  scheduleNotification,
  cancelScheduledNotification,
  checkAndTriggerNotifications,
  startNotificationChecker,
  stopNotificationChecker,
  registerNotificationServiceWorker,
  // Templates
  createBillReminderNotification,
  createBudgetAlertNotification,
  createGoalMilestoneNotification,
  createEMIReminderNotification,
  createDailySummaryNotification,
};
