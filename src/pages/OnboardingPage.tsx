/**
 * Onboarding Page
 * Beautiful multi-step onboarding for new users
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Target,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';

// Account types for onboarding
const accountTypes = [
  { id: 'bank', name: 'Bank Account', icon: '🏦', color: 'bg-blue-100' },
  { id: 'cash', name: 'Cash', icon: '💵', color: 'bg-green-100' },
  { id: 'credit', name: 'Credit Card', icon: '💳', color: 'bg-purple-100' },
  { id: 'wallet', name: 'Digital Wallet', icon: '📱', color: 'bg-orange-100' },
];

// Common goals
const commonGoals = [
  { id: 'emergency', name: 'Emergency Fund', icon: '🛡️', amount: 100000 },
  { id: 'vacation', name: 'Vacation', icon: '✈️', amount: 50000 },
  { id: 'car', name: 'New Car', icon: '🚗', amount: 500000 },
  { id: 'home', name: 'Home Down Payment', icon: '🏠', amount: 1000000 },
  { id: 'education', name: 'Education', icon: '📚', amount: 200000 },
  { id: 'wedding', name: 'Wedding', icon: '💒', amount: 500000 },
];

interface OnboardingAccount {
  type: string;
  name: string;
  balance: string;
}

interface OnboardingGoal {
  id: string;
  name: string;
  amount: number;
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Onboarding data
  const [accounts, setAccounts] = useState<OnboardingAccount[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoal[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState('50000');

  const steps = [
    { title: 'Welcome', subtitle: 'Get started with FinTrace' },
    { title: 'Add Accounts', subtitle: 'Track your money across accounts' },
    { title: 'Set Goals', subtitle: 'What are you saving for?' },
    { title: 'Monthly Budget', subtitle: 'Set your spending limit' },
    { title: "You're all set!", subtitle: 'Start your financial journey' },
  ];

  const addAccount = (type: string) => {
    const typeInfo = accountTypes.find((t) => t.id === type);
    setAccounts([
      ...accounts,
      {
        type,
        name: typeInfo?.name || type,
        balance: '',
      },
    ]);
  };

  const updateAccountBalance = (index: number, balance: string) => {
    const updated = [...accounts];
    updated[index].balance = balance;
    setAccounts(updated);
  };

  const removeAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const toggleGoal = (goal: (typeof commonGoals)[0]) => {
    const exists = selectedGoals.find((g) => g.id === goal.id);
    if (exists) {
      setSelectedGoals(selectedGoals.filter((g) => g.id !== goal.id));
    } else {
      setSelectedGoals([
        ...selectedGoals,
        { id: goal.id, name: goal.name, amount: goal.amount },
      ]);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      // TODO: Send onboarding data to API
      // await api.post('/onboarding', { accounts, goals: selectedGoals, monthlyBudget });

      // For now, just simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      navigate('/', { replace: true });
    } catch (error) {
      console.error('Onboarding failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return accounts.length > 0;
      case 2:
        return true; // Goals are optional
      case 3:
        return Number(monthlyBudget) > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <span className="text-5xl font-bold text-white">₹</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome, {user?.firstName || 'there'}!
            </h1>
            <p className="text-gray-600 text-lg mb-8">
              Let's set up your personal finance tracker in just a few steps.
            </p>
            <div className="space-y-4 text-left max-w-xs mx-auto">
              {[
                'Track expenses & income',
                'Set budgets & goals',
                'Get AI-powered insights',
                'Secure offline access',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Wallet className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Add Your Accounts</h2>
            <p className="text-gray-600 text-center mb-6">
              Start by adding at least one account to track your money.
            </p>

            {/* Added Accounts */}
            {accounts.length > 0 && (
              <div className="space-y-3 mb-6">
                {accounts.map((account, index) => {
                  const typeInfo = accountTypes.find((t) => t.id === account.type);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
                    >
                      <div className={`w-12 h-12 ${typeInfo?.color} rounded-xl flex items-center justify-center text-2xl`}>
                        {typeInfo?.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{account.name}</p>
                        <Input
                          type="number"
                          placeholder="Balance (optional)"
                          value={account.balance}
                          onChange={(e) => updateAccountBalance(index, e.target.value)}
                          className="h-9 mt-1 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => removeAccount(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Account Type Selector */}
            <div className="grid grid-cols-2 gap-3">
              {accountTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => addAccount(type.id)}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className={`w-10 h-10 ${type.color} rounded-xl flex items-center justify-center text-xl`}>
                    {type.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{type.name}</p>
                    <p className="text-xs text-gray-500">Add account</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <div className="w-16 h-16 bg-amber-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Target className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Set Your Goals</h2>
            <p className="text-gray-600 text-center mb-6">
              What are you saving for? Select one or more goals.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {commonGoals.map((goal) => {
                const isSelected = selectedGoals.some((g) => g.id === goal.id);
                return (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal)}
                    className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-100 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-3xl mb-2">{goal.icon}</span>
                    <p className="font-medium text-gray-900 text-sm">{goal.name}</p>
                    <p className="text-xs text-gray-500">
                      ₹{(goal.amount / 1000).toFixed(0)}K
                    </p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button className="mt-4 w-full p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-emerald-300 hover:text-emerald-600 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Custom Goal
            </button>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">💰</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Monthly Budget</h2>
            <p className="text-gray-600 mb-8">
              How much do you want to spend each month?
            </p>

            <div className="max-w-xs mx-auto">
              <Label className="text-gray-700">Monthly Spending Limit</Label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                  ₹
                </span>
                <Input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  className="pl-10 h-14 text-2xl font-bold text-center rounded-xl"
                  placeholder="50000"
                />
              </div>

              <div className="flex gap-2 mt-4">
                {['30000', '50000', '75000', '100000'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setMonthlyBudget(amount)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      monthlyBudget === amount
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    ₹{(Number(amount) / 1000).toFixed(0)}K
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Check className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">You're All Set!</h2>
            <p className="text-gray-600 text-lg mb-8">
              Your FinTrace account is ready. Start tracking your finances today!
            </p>

            {/* Summary */}
            <div className="bg-gray-50 rounded-2xl p-6 text-left max-w-xs mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Accounts</span>
                <span className="font-semibold text-gray-900">{accounts.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Goals</span>
                <span className="font-semibold text-gray-900">{selectedGoals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Monthly Budget</span>
                <span className="font-semibold text-gray-900">
                  ₹{Number(monthlyBudget).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Progress */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">
            Step {step + 1} of {steps.length}
          </span>
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip
          </button>
        </div>
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-emerald-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-auto">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="p-6 flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="h-12 px-6 rounded-xl border-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Button
          onClick={() => {
            if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              handleComplete();
            }
          }}
          disabled={!canProceed() || isLoading}
          className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : step === steps.length - 1 ? (
            <>
              Get Started
              <ChevronRight className="w-5 h-5 ml-1" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
