import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Download,
  HelpCircle,
  Lock,
  Moon,
  Settings,
  Share2,
  Star,
  User,
  Wallet,
  Target,
  TrendingDown,
  TrendingUp,
  Calculator,
  Tags,
  FileText,
  Upload,
  Users,
  Info,
  LogOut,
  PiggyBank,
  Brain,
  Mic,
  Camera,
  Shield,
  Receipt,
  Smartphone,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Page } from "@/components/layout/Page";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  description?: string;
  iconColor?: string;
  badge?: string;
  onClick?: () => void;
}

function MenuItem({
  icon: Icon,
  label,
  description,
  iconColor = "bg-primary/10 text-primary",
  badge,
  onClick,
}: MenuItemProps) {
  return (
    <motion.button
      className="ios-list-item w-full"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium">{label}</p>
        {description && <p className="ios-caption">{description}</p>}
      </div>
      {badge && (
        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
          {badge}
        </span>
      )}
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </motion.button>
  );
}

export function MorePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get full name from first and last name
  const getFullName = () => {
    if (!user) return 'Guest User';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || 'Guest User';
  };

  // Get user initials
  const getInitials = () => {
    if (!user?.firstName) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    return firstName.substring(0, 2).toUpperCase();
  };

  return (
    <Page>
      <Header title="More" />

      <div className="px-4 space-y-6 pb-8">
        {/* Install App Banner */}
        <InstallPrompt variant="banner" />

        {/* Profile Card */}
        <motion.div
          className="ios-card p-4 flex items-center gap-4 cursor-pointer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/settings')}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{getInitials()}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{getFullName()}</h3>
            <p className="ios-caption">{user?.email || 'Personal Account'}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>

        {/* Quick Access Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">Quick Access</h3>
          <div className="ios-card divide-y divide-border">
            <MenuItem
              icon={Wallet}
              label="Accounts"
              description="Manage your accounts"
              iconColor="bg-blue-500/10 text-blue-500"
              onClick={() => navigate('/accounts')}
            />
            <MenuItem
              icon={PiggyBank}
              label="Budgets"
              description="Track your spending limits"
              iconColor="bg-violet-500/10 text-violet-500"
              onClick={() => navigate('/budgets')}
            />
            <MenuItem
              icon={Target}
              label="Goals"
              description="Savings goals"
              iconColor="bg-cyan-500/10 text-cyan-500"
              onClick={() => navigate('/goals')}
            />
            <MenuItem
              icon={TrendingDown}
              label="Loans & EMI"
              description="Track loan repayments"
              iconColor="bg-rose-500/10 text-rose-500"
              badge="3 active"
              onClick={() => navigate('/loans')}
            />
          </div>
        </motion.div>

        {/* Tools Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">Tools</h3>
          <div className="ios-card divide-y divide-border">
            <MenuItem
              icon={Brain}
              label="AI Insights"
              description="Smart financial analysis"
              iconColor="bg-violet-500/10 text-violet-500"
              onClick={() => navigate('/insights')}
            />
            <MenuItem
              icon={TrendingUp}
              label="Analytics Dashboard"
              description="Expense charts & trends"
              iconColor="bg-cyan-500/10 text-cyan-500"
              badge="New"
              onClick={() => navigate('/analytics')}
            />
            <MenuItem
              icon={TrendingUp}
              label="Portfolio Tracker"
              description="Track MF, stocks & more"
              iconColor="bg-indigo-500/10 text-indigo-500"
              badge="New"
              onClick={() => navigate('/portfolio')}
            />
            <MenuItem
              icon={Mic}
              label="Voice Entry"
              description="Add transactions by voice"
              iconColor="bg-emerald-500/10 text-emerald-500"
              onClick={() => navigate('/voice-entry')}
            />
            <MenuItem
              icon={Camera}
              label="Scan Receipt"
              description="OCR receipt scanning"
              iconColor="bg-amber-500/10 text-amber-500"
              onClick={() => navigate('/scan-receipt')}
            />
            <MenuItem
              icon={Calculator}
              label="EMI Calculator"
              description="Plan your loans"
              iconColor="bg-blue-500/10 text-blue-500"
              onClick={() => navigate('/emi-calculator')}
            />
            <MenuItem
              icon={FileText}
              label="Tax Summary"
              description="Track 80C, 80D deductions"
              iconColor="bg-green-500/10 text-green-500"
              onClick={() => navigate('/tax-summary')}
            />
            <MenuItem
              icon={TrendingUp}
              label="Net Worth"
              description="Assets vs Liabilities"
              iconColor="bg-emerald-500/10 text-emerald-500"
              onClick={() => navigate('/networth')}
            />
            <MenuItem
              icon={Receipt}
              label="Form 26AS Report"
              description="TDS & tax payment summary"
              iconColor="bg-teal-500/10 text-teal-500"
              onClick={() => navigate('/form-26as')}
            />
            <MenuItem
              icon={Shield}
              label="Credit Score"
              description="Estimate your credit score"
              iconColor="bg-blue-500/10 text-blue-500"
              badge="New"
              onClick={() => navigate('/credit-score')}
            />
            <MenuItem
              icon={Tags}
              label="Categories"
              description="Manage expense categories"
              iconColor="bg-indigo-500/10 text-indigo-500"
              onClick={() => navigate('/categories')}
            />
            <MenuItem
              icon={FileText}
              label="Recurring"
              description="Recurring transactions"
              iconColor="bg-teal-500/10 text-teal-500"
              onClick={() => navigate('/recurring')}
            />
          </div>
        </motion.div>

        {/* Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">Data</h3>
          <div className="ios-card divide-y divide-border">
            <MenuItem
              icon={Download}
              label="Data Management"
              description="Import, export, backup data"
              iconColor="bg-emerald-500/10 text-emerald-500"
              onClick={() => navigate('/data-management')}
            />
            <MenuItem
              icon={Upload}
              label="Import Statement"
              description="Import bank CSV statements"
              iconColor="bg-blue-500/10 text-blue-500"
              onClick={() => navigate('/import-statement')}
            />
            <MenuItem
              icon={CreditCard}
              label="Bank Connections"
              description="Link via Account Aggregator"
              iconColor="bg-sky-500/10 text-sky-500"
              badge="New"
              onClick={() => navigate('/bank-linking')}
            />
            <MenuItem
              icon={Receipt}
              label="GST Invoices"
              description="Track GST for business"
              iconColor="bg-orange-500/10 text-orange-500"
              badge="Business"
              onClick={() => navigate('/gst-invoices')}
            />
          </div>
        </motion.div>

        {/* Settings Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">Settings</h3>
          <div className="ios-card divide-y divide-border">
            <MenuItem
              icon={Bell}
              label="Notifications"
              description="View and manage alerts"
              iconColor="bg-orange-500/10 text-orange-500"
              onClick={() => navigate('/notifications')}
            />
            <MenuItem
              icon={Bell}
              label="Push Notifications"
              description="Bill reminders, budget alerts"
              iconColor="bg-amber-500/10 text-amber-500"
              onClick={() => navigate('/notification-settings')}
            />
            <MenuItem
              icon={Lock}
              label="Security"
              description="PIN, Biometric lock"
              iconColor="bg-red-500/10 text-red-500"
              onClick={() => navigate('/settings/security')}
            />
            <MenuItem
              icon={Moon}
              label="Appearance"
              description="Theme, Dark mode"
              iconColor="bg-purple-500/10 text-purple-500"
              onClick={() => navigate('/theme')}
            />
            <MenuItem
              icon={Settings}
              label="Preferences"
              description="Currency, Date format"
              iconColor="bg-gray-500/10 text-gray-500"
              onClick={() => navigate('/settings')}
            />
          </div>
        </motion.div>

        {/* Family Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">Family</h3>
          <div className="ios-card divide-y divide-border">
            <MenuItem
              icon={Users}
              label="Family Sharing"
              description="Share with family members"
              iconColor="bg-pink-500/10 text-pink-500"
              onClick={() => navigate('/family')}
            />
          </div>
        </motion.div>

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="ios-caption uppercase tracking-wide px-4 mb-2">Support</h3>
          <div className="ios-card divide-y divide-border">
            <MenuItem
              icon={HelpCircle}
              label="Help & FAQ"
              iconColor="bg-cyan-500/10 text-cyan-500"
            />
            <MenuItem
              icon={Share2}
              label="Share FinTrace"
              iconColor="bg-pink-500/10 text-pink-500"
            />
            <MenuItem
              icon={Star}
              label="Rate Us"
              description="Love the app? Rate us!"
              iconColor="bg-yellow-500/10 text-yellow-500"
            />
            <MenuItem
              icon={Info}
              label="About"
              description="Version 1.0.0"
              iconColor="bg-gray-500/10 text-gray-500"
            />
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="ios-card">
            <MenuItem
              icon={LogOut}
              label="Logout"
              iconColor="bg-red-500/10 text-red-500"
              onClick={handleLogout}
            />
          </div>
        </motion.div>

        {/* Version */}
        <motion.div
          className="text-center py-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <p className="ios-caption">FinTrace v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">Made with ❤️ in India</p>
        </motion.div>
      </div>
    </Page>
  );
}

export default MorePage;
