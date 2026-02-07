/**
 * Add Budget Page
 * Create category budgets with period selection
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Check, AlertCircle, ShoppingBag, Utensils, Car,
  Home, Zap, Smartphone, Heart, GraduationCap, Plane, Gift,
  Film, Music, Gamepad2, Coffee, Shirt, Wrench, MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { validateBudget } from '@/lib/validators';
import { parseAmount, formatINR } from '@/lib/formatters/currency';
import { useBudgets, useCategories } from '@/db/hooks';
import { CategoryType } from '@/types';

const categoryIcons: Record<string, React.ElementType> = {
  shopping: ShoppingBag,
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Zap,
  phone: Smartphone,
  health: Heart,
  education: GraduationCap,
  travel: Plane,
  gifts: Gift,
  entertainment: Film,
  music: Music,
  gaming: Gamepad2,
  coffee: Coffee,
  clothing: Shirt,
  maintenance: Wrench,
  other: MoreHorizontal,
};

const periodOptions = [
  { id: 'weekly', label: 'Weekly', description: 'Reset every Monday' },
  { id: 'monthly', label: 'Monthly', description: 'Reset on the 1st' },
  { id: 'yearly', label: 'Yearly', description: 'Reset on Jan 1st' },
];

export default function AddBudgetPage() {
  const navigate = useNavigate();
  const { createBudget } = useBudgets();
  const { expenseCategories } = useCategories();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [carryOver, setCarryOver] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amount = parseAmount(amountInput);

  // Get selected category
  const selectedCategory = useMemo(() => {
    return expenseCategories.find(c => c.id === selectedCategoryId);
  }, [expenseCategories, selectedCategoryId]);

  // Calculate daily/weekly allowance
  const allowance = useMemo(() => {
    if (!amount) return null;

    switch (period) {
      case 'weekly':
        return { daily: Math.floor(amount / 7), label: '/day' };
      case 'monthly':
        return { daily: Math.floor(amount / 30), label: '/day' };
      case 'yearly':
        return { daily: Math.floor(amount / 12), label: '/month' };
      default:
        return null;
    }
  }, [amount, period]);

  const handleSave = async () => {
    // Validate
    const validation = validateBudget({
      categoryId: selectedCategoryId,
      amount,
      period,
      alertThreshold,
    });

    if (!validation.isValid) {
      const errorMap: Record<string, string> = {};
      for (const error of validation.errors) {
        errorMap[error.field] = error.message;
      }
      setErrors(errorMap);
      return;
    }

    setIsSubmitting(true);

    // Get period dates
    const now = new Date();
    let startDate: string;
    let endDate: string | undefined;

    if (period === 'weekly') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      startDate = monday.toISOString().split('T')[0];

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      endDate = sunday.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = firstDay.toISOString().split('T')[0];

      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate = lastDay.toISOString().split('T')[0];
    } else {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      startDate = firstDay.toISOString().split('T')[0];

      const lastDay = new Date(now.getFullYear(), 11, 31);
      endDate = lastDay.toISOString().split('T')[0];
    }

    try {
      await createBudget({
        userId: 'default-user',
        name: selectedCategory?.name || 'Budget',
        categoryId: selectedCategoryId,
        categoryIds: [selectedCategoryId],
        accountIds: [],
        amount,
        spent: 0,
        period,
        startDate,
        endDate,
        alertThreshold,
        alertAt: [50, 80, 100],
        rollover: carryOver,
        rolloverAmount: 0,
        carryOver,
        isArchived: false,
        isFamilyBudget: false,
        color: selectedCategory?.color || '#10B981',
      });

      navigate('/budgets');
    } catch (error) {
      console.error('Error creating budget:', error);
      setErrors({ submit: 'Failed to create budget. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Add Budget</h1>
            <p className="text-sm text-gray-500">Set spending limits</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Period Selection */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Budget Period
          </Label>
          <Tabs value={period} onValueChange={(v: string) => setPeriod(v as 'weekly' | 'monthly' | 'yearly')}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Category Selection */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Category
          </Label>
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {expenseCategories.map((category) => {
              const Icon = categoryIcons[category.icon] || MoreHorizontal;
              const isSelected = selectedCategoryId === category.id;

              return (
                <motion.button
                  key={category.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-violet-50 border-2 border-violet-500'
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: category.color }} />
                  </div>
                  <span className={`text-xs text-center font-medium truncate w-full ${
                    isSelected ? 'text-violet-700' : 'text-gray-600'
                  }`}>
                    {category.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>}
        </div>

        {/* Budget Amount */}
        <div>
          <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
            Budget Amount ({period === 'yearly' ? 'per year' : period === 'weekly' ? 'per week' : 'per month'})
          </Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <Input
              id="amount"
              type="text"
              inputMode="decimal"
              placeholder="10,000"
              value={amountInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountInput(e.target.value)}
              className="pl-8 text-lg"
            />
          </div>
          {allowance && (
            <p className="text-sm text-gray-500 mt-1">
              That's {formatINR(allowance.daily)}{allowance.label}
            </p>
          )}
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}

          {/* Quick Amount Buttons */}
          <div className="flex gap-2 mt-3">
            {[5000, 10000, 15000, 25000].map((val) => (
              <button
                key={val}
                onClick={() => setAmountInput((val).toString())}
                className="px-3 py-1.5 text-sm font-medium bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                {formatINR(val * 100, { compact: true, showSymbol: false })}
              </button>
            ))}
          </div>
        </div>

        {/* Alert Threshold */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-gray-700">Alert Threshold</Label>
            <span className="text-sm font-semibold text-violet-600">{alertThreshold}%</span>
          </div>
          <Slider
            value={[alertThreshold]}
            onValueChange={(value: number[]) => setAlertThreshold(value[0])}
            min={50}
            max={100}
            step={5}
            className="py-4"
          />
          <p className="text-xs text-gray-500">
            Get notified when you've spent {alertThreshold}% of your budget
          </p>
        </div>

        {/* Preview Card */}
        {selectedCategory && amount > 0 && (
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const Icon = categoryIcons[selectedCategory.icon] || MoreHorizontal;
                  return (
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                  );
                })()}
                <div>
                  <p className="text-violet-100 text-sm">{selectedCategory.name}</p>
                  <p className="text-2xl font-bold">{formatINR(amount)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-white/20">
                <AlertCircle className="w-4 h-4 text-violet-200" />
                <p className="text-sm text-violet-100">
                  Alert at {formatINR(amount * alertThreshold / 100)} spent
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <p className="text-red-500 text-sm text-center">{errors.submit}</p>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full h-12 bg-violet-500 hover:bg-violet-600 text-white font-semibold"
          disabled={!selectedCategoryId || !amount || isSubmitting}
        >
          {isSubmitting ? 'Creating...' : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Create Budget
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
