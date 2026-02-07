/**
 * Family Settings Page
 * Manage family sharing preferences and permissions
 * Tier-One Standards: Complete family settings management
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  Eye,
  Bell,
  CreditCard,
  Target,
  PiggyBank,
  TrendingUp,
  UserPlus,
  Trash2,
  Crown,
  ChevronRight,
  Info,
  AlertTriangle,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Header } from '@/components/layout/Header';
import { Page } from '@/components/layout/Page';
import { useFamilyStore } from '@/stores/familyStore';

// =============================================================================
// Types
// =============================================================================

interface FamilySettings {
  // Visibility Settings
  showAccountBalances: boolean;
  showTransactionDetails: boolean;
  showBudgetProgress: boolean;
  showGoalProgress: boolean;
  showInvestments: boolean;
  showLoans: boolean;

  // Permission Settings
  allowMembersToAddTransactions: boolean;
  allowMembersToCreateBudgets: boolean;
  allowMembersToCreateGoals: boolean;
  requireApprovalForLargeTransactions: boolean;
  largeTransactionThreshold: number; // in paise

  // Notification Settings
  notifyOnMemberTransactions: boolean;
  notifyOnBudgetAlerts: boolean;
  notifyOnGoalMilestones: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;

  // Privacy Settings
  hideFromFamilyAccounts: string[]; // Account IDs to hide
  privateTransactionCategories: string[]; // Category IDs that are private
}

const defaultSettings: FamilySettings = {
  showAccountBalances: true,
  showTransactionDetails: true,
  showBudgetProgress: true,
  showGoalProgress: true,
  showInvestments: false,
  showLoans: false,
  allowMembersToAddTransactions: true,
  allowMembersToCreateBudgets: false,
  allowMembersToCreateGoals: true,
  requireApprovalForLargeTransactions: false,
  largeTransactionThreshold: 500000, // ₹5000
  notifyOnMemberTransactions: true,
  notifyOnBudgetAlerts: true,
  notifyOnGoalMilestones: true,
  dailySummary: false,
  weeklySummary: true,
  hideFromFamilyAccounts: [],
  privateTransactionCategories: [],
};

// =============================================================================
// Components
// =============================================================================

function SettingToggle({
  icon: Icon,
  iconColor,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SettingItem({
  icon: Icon,
  iconColor,
  title,
  description,
  onClick,
  value,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  description?: string;
  onClick?: () => void;
  value?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 py-3 w-full text-left hover:bg-gray-50 rounded-lg px-2 -mx-2"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-500">{value}</span>}
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function FamilySettingsPage() {
  const navigate = useNavigate();

  // Store
  const family = useFamilyStore((s) => s.family);
  const members = useFamilyStore((s) => s.members);
  const isLoading = useFamilyStore((s) => s.isLoading);
  const leaveFamily = useFamilyStore((s) => s.leaveFamily);

  // Compute current user role based on members list
  // For now, default to 'owner' - in production, check against auth user ID and members
  const [currentUserRole] = useState<'owner' | 'admin' | 'member'>('owner');

  // Local state
  const [settings, setSettings] = useState<FamilySettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load settings
  useEffect(() => {
    // In production, load from API
    const savedSettings = localStorage.getItem('fintrace-family-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch {
        // Use defaults
      }
    }
  }, []);

  // Update setting
  const updateSetting = <K extends keyof FamilySettings>(
    key: K,
    value: FamilySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In production, save to API
      localStorage.setItem('fintrace-family-settings', JSON.stringify(settings));
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle leave family
  const handleLeaveFamily = async () => {
    try {
      await leaveFamily();
      navigate('/more');
    } catch (error) {
      console.error('Failed to leave family:', error);
    }
  };

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';

  // No family
  if (!family) {
    return (
      <Page>
        <Header
          title="Family Settings"
          showBack
        />

        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-pink-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Family Yet</h3>
          <p className="text-gray-500 mb-4">
            Create or join a family to share finances with your loved ones.
          </p>
          <Button
            onClick={() => navigate('/family')}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Get Started
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Header
        title="Family Settings"
        showBack
        rightActions={
          hasChanges && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          )
        }
      />

      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Family Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-pink-500" />
              {family.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Members</span>
              <span className="font-medium">{members.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Your Role</span>
              <span className="flex items-center gap-1 font-medium">
                {currentUserRole === 'owner' && <Crown className="w-4 h-4 text-amber-500" />}
                {currentUserRole?.charAt(0).toUpperCase() + currentUserRole?.slice(1)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Visibility Settings */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Visibility
          </h3>
          <Card>
            <CardContent className="divide-y divide-gray-100">
              <SettingToggle
                icon={CreditCard}
                iconColor="bg-blue-100 text-blue-600"
                title="Show Account Balances"
                description="Family members can see your account balances"
                checked={settings.showAccountBalances}
                onCheckedChange={(checked) => updateSetting('showAccountBalances', checked)}
              />
              <SettingToggle
                icon={Eye}
                iconColor="bg-purple-100 text-purple-600"
                title="Show Transaction Details"
                description="Family members can see your transactions"
                checked={settings.showTransactionDetails}
                onCheckedChange={(checked) => updateSetting('showTransactionDetails', checked)}
              />
              <SettingToggle
                icon={PiggyBank}
                iconColor="bg-emerald-100 text-emerald-600"
                title="Show Budget Progress"
                description="Share budget tracking with family"
                checked={settings.showBudgetProgress}
                onCheckedChange={(checked) => updateSetting('showBudgetProgress', checked)}
              />
              <SettingToggle
                icon={Target}
                iconColor="bg-cyan-100 text-cyan-600"
                title="Show Goals"
                description="Share savings goals with family"
                checked={settings.showGoalProgress}
                onCheckedChange={(checked) => updateSetting('showGoalProgress', checked)}
              />
              <SettingToggle
                icon={TrendingUp}
                iconColor="bg-indigo-100 text-indigo-600"
                title="Show Investments"
                description="Share investment portfolio with family"
                checked={settings.showInvestments}
                onCheckedChange={(checked) => updateSetting('showInvestments', checked)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Permission Settings (Admin only) */}
        {isAdmin && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
              Permissions
            </h3>
            <Card>
              <CardContent className="divide-y divide-gray-100">
                <SettingToggle
                  icon={CreditCard}
                  iconColor="bg-green-100 text-green-600"
                  title="Allow Member Transactions"
                  description="Members can add transactions for the family"
                  checked={settings.allowMembersToAddTransactions}
                  onCheckedChange={(checked) => updateSetting('allowMembersToAddTransactions', checked)}
                />
                <SettingToggle
                  icon={PiggyBank}
                  iconColor="bg-violet-100 text-violet-600"
                  title="Allow Member Budgets"
                  description="Members can create family budgets"
                  checked={settings.allowMembersToCreateBudgets}
                  onCheckedChange={(checked) => updateSetting('allowMembersToCreateBudgets', checked)}
                />
                <SettingToggle
                  icon={Target}
                  iconColor="bg-teal-100 text-teal-600"
                  title="Allow Member Goals"
                  description="Members can create family goals"
                  checked={settings.allowMembersToCreateGoals}
                  onCheckedChange={(checked) => updateSetting('allowMembersToCreateGoals', checked)}
                />
                <SettingToggle
                  icon={Shield}
                  iconColor="bg-amber-100 text-amber-600"
                  title="Approval for Large Transactions"
                  description="Require admin approval for big expenses"
                  checked={settings.requireApprovalForLargeTransactions}
                  onCheckedChange={(checked) => updateSetting('requireApprovalForLargeTransactions', checked)}
                />
                {settings.requireApprovalForLargeTransactions && (
                  <div className="py-3 pl-13">
                    <Label className="text-sm text-gray-600">Threshold Amount</Label>
                    <Select
                      value={settings.largeTransactionThreshold.toString()}
                      onValueChange={(value) => updateSetting('largeTransactionThreshold', Number.parseInt(value))}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100000">₹1,000</SelectItem>
                        <SelectItem value="250000">₹2,500</SelectItem>
                        <SelectItem value="500000">₹5,000</SelectItem>
                        <SelectItem value="1000000">₹10,000</SelectItem>
                        <SelectItem value="2500000">₹25,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notification Settings */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
            Notifications
          </h3>
          <Card>
            <CardContent className="divide-y divide-gray-100">
              <SettingToggle
                icon={Bell}
                iconColor="bg-orange-100 text-orange-600"
                title="Member Transactions"
                description="Notify when family members add transactions"
                checked={settings.notifyOnMemberTransactions}
                onCheckedChange={(checked) => updateSetting('notifyOnMemberTransactions', checked)}
              />
              <SettingToggle
                icon={AlertTriangle}
                iconColor="bg-red-100 text-red-600"
                title="Budget Alerts"
                description="Notify on family budget warnings"
                checked={settings.notifyOnBudgetAlerts}
                onCheckedChange={(checked) => updateSetting('notifyOnBudgetAlerts', checked)}
              />
              <SettingToggle
                icon={Target}
                iconColor="bg-emerald-100 text-emerald-600"
                title="Goal Milestones"
                description="Celebrate family goal achievements"
                checked={settings.notifyOnGoalMilestones}
                onCheckedChange={(checked) => updateSetting('notifyOnGoalMilestones', checked)}
              />
              <SettingToggle
                icon={Info}
                iconColor="bg-blue-100 text-blue-600"
                title="Weekly Summary"
                description="Get weekly family finance summary"
                checked={settings.weeklySummary}
                onCheckedChange={(checked) => updateSetting('weeklySummary', checked)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wide px-1">
            Danger Zone
          </h3>
          <Card className="border-red-200">
            <CardContent className="pt-4">
              <Button
                variant="outline"
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Leave Family
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                You will lose access to shared data
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Family Confirmation */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Family?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{family.name}"? You will lose access to all shared
              budgets, goals, and family transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveFamily}
              className="bg-red-500 hover:bg-red-600"
            >
              Leave Family
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
