/**
 * Add Account Page
 * Create new accounts with type selection and validation
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Building2, Wallet, CreditCard, PiggyBank,
  TrendingUp, Check, Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { validateAccount } from '@/lib/validators';
import { parseAmount, formatINR } from '@/lib/formatters/currency';
import { useAccounts } from '@/db/hooks';
import { AccountType } from '@/types';

const accountTypes = [
  { type: AccountType.BANK, label: 'Bank Account', icon: Building2, color: '#3B82F6' },
  { type: AccountType.CASH, label: 'Cash', icon: Wallet, color: '#10B981' },
  { type: AccountType.CREDIT_CARD, label: 'Credit Card', icon: CreditCard, color: '#F97316' },
  { type: AccountType.WALLET, label: 'Digital Wallet', icon: PiggyBank, color: '#8B5CF6' },
  { type: AccountType.INVESTMENT, label: 'Investment', icon: TrendingUp, color: '#06B6D4' },
];

const accountColors = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F97316', // Orange
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export default function AddAccountPage() {
  const navigate = useNavigate();
  const { createAccount } = useAccounts();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType>(AccountType.BANK);
  const [balanceInput, setBalanceInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(accountColors[0]);
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const balance = parseAmount(balanceInput);

  const handleSave = async () => {
    // Validate
    const validation = validateAccount({
      name,
      type: selectedType as 'bank' | 'cash' | 'credit_card' | 'wallet' | 'investment',
      balance,
      color: selectedColor,
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

    try {
      const accountBalance = selectedType === AccountType.CREDIT_CARD ? -balance : balance;
      await createAccount({
        userId: 'default-user',
        name,
        type: selectedType,
        balance: accountBalance,
        initialBalance: accountBalance,
        currency: 'INR',
        color: selectedColor,
        icon: accountTypes.find(t => t.type === selectedType)?.icon.name || 'Wallet',
        isDefault,
        isArchived: false,
        isFamilyShared: false,
        includeInTotal,
        sortOrder: 0,
      });

      navigate('/accounts');
    } catch (error) {
      console.error('Error creating account:', error);
      setErrors({ submit: 'Failed to create account. Please try again.' });
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
            <h1 className="text-xl font-bold text-gray-900">Add Account</h1>
            <p className="text-sm text-gray-500">Track your money</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Account Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Account Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., HDFC Savings"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="mt-1.5"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Account Type */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Account Type
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {accountTypes.map(({ type, label, icon: Icon, color }) => {
              const isSelected = selectedType === type;

              return (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSelectedType(type);
                    setSelectedColor(color);
                  }}
                  className={`p-4 rounded-xl flex items-center gap-3 transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-2 border-emerald-500'
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
          {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type}</p>}
        </div>

        {/* Balance */}
        <div>
          <Label htmlFor="balance" className="text-sm font-medium text-gray-700">
            {selectedType === AccountType.CREDIT_CARD ? 'Outstanding Amount' : 'Current Balance'}
          </Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <Input
              id="balance"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={balanceInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBalanceInput(e.target.value)}
              className="pl-8"
            />
          </div>
          {balance > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {selectedType === AccountType.CREDIT_CARD
                ? `You owe ${formatINR(balance)}`
                : formatINR(balance)
              }
            </p>
          )}
        </div>

        {/* Color */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              <span>Account Color</span>
            </div>
          </Label>
          <div className="flex flex-wrap gap-3">
            {accountColors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-full transition-all ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && (
                  <Check className="w-5 h-5 text-white mx-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Include in Total</p>
                <p className="text-sm text-gray-500">Count in net worth calculation</p>
              </div>
              <Switch
                checked={includeInTotal}
                onCheckedChange={setIncludeInTotal}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Set as Default</p>
                <p className="text-sm text-gray-500">Use for new transactions</p>
              </div>
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Error */}
        {errors.submit && (
          <p className="text-red-500 text-sm text-center">{errors.submit}</p>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
          disabled={!name || isSubmitting}
        >
          {isSubmitting ? 'Creating...' : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Create Account
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
