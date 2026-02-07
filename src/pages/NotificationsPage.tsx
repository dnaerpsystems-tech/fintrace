/**
 * Notifications Page
 * Displays all notifications with management features
 * Tier-One Standards: Complete UI with settings integration
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Settings,
  AlertTriangle,
  CreditCard,
  Target,
  Wallet,
  TrendingUp,
  Users,
  Shield,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { useNotificationStore, selectNotifications, runNotificationChecks } from '@/stores/notificationStore';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationType, NotificationSettings } from '@/lib/api/notificationApi';

// =============================================================================
// Constants
// =============================================================================

const notificationIcons: Record<NotificationType, React.ElementType> = {
  emi_reminder: CreditCard,
  budget_alert: AlertTriangle,
  goal_milestone: Target,
  low_balance: Wallet,
  bill_due: CreditCard,
  investment_update: TrendingUp,
  family_invite: Users,
  sync_complete: RefreshCw,
  security_alert: Shield,
  system: Bell,
};

const notificationColors: Record<NotificationType, string> = {
  emi_reminder: 'bg-blue-100 text-blue-600',
  budget_alert: 'bg-orange-100 text-orange-600',
  goal_milestone: 'bg-emerald-100 text-emerald-600',
  low_balance: 'bg-red-100 text-red-600',
  bill_due: 'bg-purple-100 text-purple-600',
  investment_update: 'bg-cyan-100 text-cyan-600',
  family_invite: 'bg-pink-100 text-pink-600',
  sync_complete: 'bg-gray-100 text-gray-600',
  security_alert: 'bg-red-100 text-red-600',
  system: 'bg-gray-100 text-gray-600',
};

// =============================================================================
// Components
// =============================================================================

function NotificationCard({
  notification,
  onMarkRead,
  onDelete,
  onClick,
}: {
  notification: {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
    priority?: string;
  };
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (url?: string) => void;
}) {
  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass = notificationColors[notification.type] || 'bg-gray-100 text-gray-600';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`p-4 border-b border-gray-100 ${
        notification.isRead ? 'bg-white' : 'bg-blue-50/50'
      }`}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onClick(notification.actionUrl)}
        >
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}`}>
              {notification.title}
            </h4>
            {!notification.isRead && (
              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            {notification.priority === 'high' && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                High Priority
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {!notification.isRead && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Mark as read"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-red-500"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsSheet({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings | null;
  onUpdateSettings: (updates: Partial<NotificationSettings>) => void;
}) {
  const [localSettings, setLocalSettings] = useState<NotificationSettings | null>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!localSettings) return null;

  const handleToggle = (key: keyof NotificationSettings, value: boolean) => {
    setLocalSettings((prev) => prev ? { ...prev, [key]: value } : null);
    onUpdateSettings({ [key]: value });
  };

  const handleSliderChange = (key: keyof NotificationSettings, value: number[]) => {
    setLocalSettings((prev) => prev ? { ...prev, [key]: value[0] } : null);
    onUpdateSettings({ [key]: value[0] });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Notification Settings</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4 overflow-y-auto pb-20">
          {/* Push Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Push Notifications
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Push Notifications</p>
                <p className="text-sm text-gray-500">Receive alerts on your device</p>
              </div>
              <Switch
                checked={localSettings.pushEnabled}
                onCheckedChange={(checked) => handleToggle('pushEnabled', checked)}
              />
            </div>
          </div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Email Notifications
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive updates via email</p>
              </div>
              <Switch
                checked={localSettings.emailEnabled}
                onCheckedChange={(checked) => handleToggle('emailEnabled', checked)}
              />
            </div>
            {localSettings.emailEnabled && (
              <div>
                <Label>Email Digest Frequency</Label>
                <Select
                  value={localSettings.emailDigest}
                  onValueChange={(value) => {
                    setLocalSettings((prev) => prev ? { ...prev, emailDigest: value as 'none' | 'daily' | 'weekly' } : null);
                    onUpdateSettings({ emailDigest: value as 'none' | 'daily' | 'weekly' });
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Digest</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Alert Types */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Alert Types
            </h3>

            {/* EMI Reminders */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">EMI Reminders</p>
                  <p className="text-sm text-gray-500">Get notified before EMI due dates</p>
                </div>
                <Switch
                  checked={localSettings.emiReminders}
                  onCheckedChange={(checked) => handleToggle('emiReminders', checked)}
                />
              </div>
              {localSettings.emiReminders && (
                <div className="pl-4 border-l-2 border-gray-200">
                  <Label className="text-sm text-gray-600">
                    Remind {localSettings.emiReminderDays} days before
                  </Label>
                  <Slider
                    value={[localSettings.emiReminderDays]}
                    min={1}
                    max={7}
                    step={1}
                    onValueChange={(value) => handleSliderChange('emiReminderDays', value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Budget Alerts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Budget Alerts</p>
                  <p className="text-sm text-gray-500">Alert when nearing budget limit</p>
                </div>
                <Switch
                  checked={localSettings.budgetAlerts}
                  onCheckedChange={(checked) => handleToggle('budgetAlerts', checked)}
                />
              </div>
              {localSettings.budgetAlerts && (
                <div className="pl-4 border-l-2 border-gray-200">
                  <Label className="text-sm text-gray-600">
                    Alert at {localSettings.budgetAlertThreshold}% of budget
                  </Label>
                  <Slider
                    value={[localSettings.budgetAlertThreshold]}
                    min={50}
                    max={100}
                    step={5}
                    onValueChange={(value) => handleSliderChange('budgetAlertThreshold', value)}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Goal Milestones */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Goal Milestones</p>
                <p className="text-sm text-gray-500">Celebrate savings achievements</p>
              </div>
              <Switch
                checked={localSettings.goalMilestones}
                onCheckedChange={(checked) => handleToggle('goalMilestones', checked)}
              />
            </div>

            {/* Low Balance */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Low Balance Alerts</p>
                  <p className="text-sm text-gray-500">Alert when account balance is low</p>
                </div>
                <Switch
                  checked={localSettings.lowBalanceAlerts}
                  onCheckedChange={(checked) => handleToggle('lowBalanceAlerts', checked)}
                />
              </div>
              {localSettings.lowBalanceAlerts && (
                <div className="pl-4 border-l-2 border-gray-200">
                  <Label className="text-sm text-gray-600">
                    Alert below ₹{(localSettings.lowBalanceThreshold / 100).toLocaleString('en-IN')}
                  </Label>
                  <Slider
                    value={[localSettings.lowBalanceThreshold / 100]}
                    min={100}
                    max={10000}
                    step={100}
                    onValueChange={(value) => handleSliderChange('lowBalanceThreshold', [value[0] * 100])}
                    className="mt-2"
                  />
                </div>
              )}
            </div>

            {/* Other Toggles */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Investment Updates</p>
                <p className="text-sm text-gray-500">Portfolio value changes</p>
              </div>
              <Switch
                checked={localSettings.investmentUpdates}
                onCheckedChange={(checked) => handleToggle('investmentUpdates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Family Notifications</p>
                <p className="text-sm text-gray-500">Family member activities</p>
              </div>
              <Switch
                checked={localSettings.familyNotifications}
                onCheckedChange={(checked) => handleToggle('familyNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-sm text-gray-500">Login and security events</p>
              </div>
              <Switch
                checked={localSettings.securityAlerts}
                onCheckedChange={(checked) => handleToggle('securityAlerts', checked)}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function NotificationsPage() {
  const navigate = useNavigate();

  // Store
  const notifications = useNotificationStore(selectNotifications);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const settings = useNotificationStore((s) => s.settings);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const updateSettings = useNotificationStore((s) => s.updateSettings);
  const initialize = useNotificationStore((s) => s.initialize);

  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await runNotificationChecks();
    setIsRefreshing(false);
  };

  // Handle notification click
  const handleNotificationClick = (url?: string) => {
    if (url) {
      navigate(url);
    }
  };

  return (
    <Page>
      <Header
        title="Notifications"
        showBack
        rightActions={
          <div className="flex items-center gap-1">
            <motion.button
              onClick={handleRefresh}
              className="p-2 rounded-full hover:bg-gray-100"
              whileTap={{ scale: 0.9 }}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
            <motion.button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-gray-100"
              whileTap={{ scale: 0.9 }}
            >
              <Settings className="w-5 h-5 text-gray-600" />
            </motion.button>
          </div>
        }
      />

      {/* Actions Bar */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <span className="text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-sm"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear all
            </Button>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BellOff className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No notifications
            </h3>
            <p className="text-gray-500 mb-4">
              You're all caught up! We'll notify you when something important happens.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Alerts
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification as any}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
                onClick={handleNotificationClick}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Settings Sheet */}
      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* Clear Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Notifications</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your notifications. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                clearAll();
                setShowClearConfirm(false);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
