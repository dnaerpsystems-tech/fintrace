/**
 * Notification Settings Page
 * Configure push notification preferences for reminders and alerts
 */

import { useState, useEffect } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import {
  Bell,
  BellOff,
  BellRing,
  Calendar,
  CreditCard,
  Target,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Smartphone,
  Info
} from 'lucide-react';
import {
  pushNotificationService,
  type NotificationPreferences,
} from '@/lib/services/pushNotificationService';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function NotificationSettingsPage() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    pushNotificationService.getPreferences()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermissionStatus(pushNotificationService.getPermissionStatus());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const granted = await pushNotificationService.requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    setIsRequesting(false);
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    pushNotificationService.savePreferences(updated);
  };

  const handleTestNotification = async () => {
    const payload = pushNotificationService.createBillReminderNotification(
      'Test Bill',
      500000, // 5000 INR in paise
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      3
    );
    await pushNotificationService.showNotification(payload);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const getPermissionUI = () => {
    switch (permissionStatus) {
      case 'granted':
        return (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div className="flex-1">
              <p className="font-medium text-emerald-800">Notifications Enabled</p>
              <p className="text-sm text-emerald-600">You'll receive reminders and alerts</p>
            </div>
          </div>
        );
      case 'denied':
        return (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <BellOff className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Notifications Blocked</p>
              <p className="text-sm text-red-600">
                Please enable notifications in your browser settings
              </p>
            </div>
          </div>
        );
      case 'unsupported':
        return (
          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Not Supported</p>
              <p className="text-sm text-amber-600">
                Your browser doesn't support push notifications
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <Bell className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <p className="font-medium text-blue-800">Enable Notifications</p>
              <p className="text-sm text-blue-600">
                Get reminders for bills, budgets, and more
              </p>
            </div>
            <Button onClick={handleRequestPermission} disabled={isRequesting}>
              {isRequesting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <BellRing className="w-4 h-4 mr-2" />
              )}
              Enable
            </Button>
          </div>
        );
    }
  };

  return (
    <Page>
      <Header title="Notification Settings" showBack />

      <div className="px-4 pb-24 space-y-6">
        {/* Permission Status */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {getPermissionUI()}
        </motion.div>

        {/* Master Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium">All Notifications</h3>
                <p className="text-sm text-gray-500">Master switch for all alerts</p>
              </div>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => handlePreferenceChange('enabled', checked)}
              disabled={permissionStatus !== 'granted'}
            />
          </div>
        </Card>

        {/* Bill Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-medium">Bill Reminders</h3>
                  <p className="text-sm text-gray-500">Get reminded before bills are due</p>
                </div>
              </div>
              <Switch
                checked={preferences.billReminders}
                onCheckedChange={(checked) => handlePreferenceChange('billReminders', checked)}
                disabled={!preferences.enabled || permissionStatus !== 'granted'}
              />
            </div>

            {preferences.billReminders && (
              <div className="pl-13 space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">
                    Remind me {preferences.billReminderDays} day(s) before due date
                  </Label>
                  <Slider
                    value={[preferences.billReminderDays]}
                    onValueChange={([value]) => handlePreferenceChange('billReminderDays', value)}
                    min={1}
                    max={7}
                    step={1}
                    className="mt-2"
                    disabled={!preferences.enabled}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 day</span>
                    <span>7 days</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Budget Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-medium">Budget Alerts</h3>
                  <p className="text-sm text-gray-500">Get alerted when nearing budget limits</p>
                </div>
              </div>
              <Switch
                checked={preferences.budgetAlerts}
                onCheckedChange={(checked) => handlePreferenceChange('budgetAlerts', checked)}
                disabled={!preferences.enabled || permissionStatus !== 'granted'}
              />
            </div>

            {preferences.budgetAlerts && (
              <div className="pl-13 space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">
                    Alert when {preferences.budgetAlertThreshold}% of budget is used
                  </Label>
                  <Slider
                    value={[preferences.budgetAlertThreshold]}
                    onValueChange={([value]) => handlePreferenceChange('budgetAlertThreshold', value)}
                    min={50}
                    max={100}
                    step={5}
                    className="mt-2"
                    disabled={!preferences.enabled}
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Goal Milestones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Goal Milestones</h3>
                  <p className="text-sm text-gray-500">Celebrate your savings progress</p>
                </div>
              </div>
              <Switch
                checked={preferences.goalMilestones}
                onCheckedChange={(checked) => handlePreferenceChange('goalMilestones', checked)}
                disabled={!preferences.enabled || permissionStatus !== 'granted'}
              />
            </div>
          </Card>
        </motion.div>

        {/* EMI Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Loan EMI Reminders</h3>
                  <p className="text-sm text-gray-500">Never miss an EMI payment</p>
                </div>
              </div>
              <Switch
                checked={preferences.loanEMIReminders}
                onCheckedChange={(checked) => handlePreferenceChange('loanEMIReminders', checked)}
                disabled={!preferences.enabled || permissionStatus !== 'granted'}
              />
            </div>

            {preferences.loanEMIReminders && (
              <div className="pl-13 space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">
                    Remind me {preferences.emiReminderDays} day(s) before EMI due date
                  </Label>
                  <Slider
                    value={[preferences.emiReminderDays]}
                    onValueChange={([value]) => handlePreferenceChange('emiReminderDays', value)}
                    min={1}
                    max={7}
                    step={1}
                    className="mt-2"
                    disabled={!preferences.enabled}
                  />
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Summary Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            Summary Notifications
          </h3>

          <div className="space-y-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Daily Summary</h4>
                  <p className="text-sm text-gray-500">Get a daily spending summary</p>
                </div>
                <Switch
                  checked={preferences.dailySummary}
                  onCheckedChange={(checked) => handlePreferenceChange('dailySummary', checked)}
                  disabled={!preferences.enabled || permissionStatus !== 'granted'}
                />
              </div>
              {preferences.dailySummary && (
                <div className="mt-3">
                  <Label className="text-sm text-gray-600">Time</Label>
                  <Select
                    value={preferences.dailySummaryTime}
                    onValueChange={(value) => handlePreferenceChange('dailySummaryTime', value)}
                    disabled={!preferences.enabled}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['08:00', '09:00', '10:00', '18:00', '19:00', '20:00', '21:00'].map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Weekly Summary</h4>
                  <p className="text-sm text-gray-500">Get a weekly spending report</p>
                </div>
                <Switch
                  checked={preferences.weeklySummary}
                  onCheckedChange={(checked) => handlePreferenceChange('weeklySummary', checked)}
                  disabled={!preferences.enabled || permissionStatus !== 'granted'}
                />
              </div>
              {preferences.weeklySummary && (
                <div className="mt-3">
                  <Label className="text-sm text-gray-600">Day of Week</Label>
                  <Select
                    value={preferences.weeklySummaryDay.toString()}
                    onValueChange={(value) => handlePreferenceChange('weeklySummaryDay', Number.parseInt(value))}
                    disabled={!preferences.enabled}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Card>
          </div>
        </motion.div>

        {/* Test Notification */}
        {permissionStatus === 'granted' && preferences.enabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Test Notification</h4>
                  <p className="text-sm text-gray-500">Send a test notification</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleTestNotification}
                  disabled={testSent}
                >
                  {testSent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
                      Sent
                    </>
                  ) : (
                    'Send Test'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Info Card */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">How it works</h4>
              <p className="text-sm text-blue-700 mt-1">
                Notifications are sent based on your recurring transactions, budget settings,
                and loan EMI schedules. Make sure to add your bills and set up budgets for
                the best experience.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}
