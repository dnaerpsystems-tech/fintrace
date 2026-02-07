/**
 * Add Goal Page
 * Create savings goals with target amount and date
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Target, Car, Home, Plane, GraduationCap, Heart,
  Shield, Armchair, Smartphone, Check, Calendar, IndianRupee
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateGoal } from '@/lib/validators';
import { parseAmount, formatINR } from '@/lib/formatters/currency';
import { calculateGoalProgress } from '@/lib/calculations/budget';
import { useGoals } from '@/db/hooks';
import { GoalStatus } from '@/types';

const goalIcons = [
  { id: 'car', icon: Car, label: 'Car' },
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'travel', icon: Plane, label: 'Travel' },
  { id: 'education', icon: GraduationCap, label: 'Education' },
  { id: 'wedding', icon: Heart, label: 'Wedding' },
  { id: 'emergency', icon: Shield, label: 'Emergency' },
  { id: 'retirement', icon: Armchair, label: 'Retirement' },
  { id: 'gadget', icon: Smartphone, label: 'Gadget' },
  { id: 'custom', icon: Target, label: 'Custom' },
];

const priorityOptions = [
  { id: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { id: 'low', label: 'Low', color: 'bg-blue-100 text-blue-700 border-blue-200' },
];

export default function AddGoalPage() {
  const navigate = useNavigate();
  const { createGoal } = useGoals();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [targetAmountInput, setTargetAmountInput] = useState('');
  const [currentAmountInput, setCurrentAmountInput] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetAmount = parseAmount(targetAmountInput);
  const currentAmount = parseAmount(currentAmountInput);

  // Calculate preview
  const preview = useMemo(() => {
    if (!targetAmount || !targetDate) return null;

    const goal = {
      id: 'preview',
      name,
      targetAmount,
      currentAmount,
      targetDate: new Date(targetDate),
      priority,
    };

    return calculateGoalProgress(goal);
  }, [name, targetAmount, currentAmount, targetDate, priority]);

  const handleSave = async () => {
    // Validate
    const validation = validateGoal({
      name,
      targetAmount,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      priority,
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
      await createGoal({
        userId: 'default-user',
        name,
        description: notes,
        icon: selectedIcon,
        targetAmount,
        currentAmount,
        currency: 'INR',
        targetDate: targetDate,
        startDate: new Date().toISOString().split('T')[0],
        priority,
        status: GoalStatus.ACTIVE,
        color: '#06B6D4',
        autoSaveEnabled: false,
        isFamilyGoal: false,
      });

      navigate('/goals');
    } catch (error) {
      console.error('Error creating goal:', error);
      setErrors({ submit: 'Failed to create goal. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get minimum date (tomorrow)
  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

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
            <h1 className="text-xl font-bold text-gray-900">Add Goal</h1>
            <p className="text-sm text-gray-500">Set a savings target</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Goal Name */}
        <div>
          <Label htmlFor="name" className="text-sm font-medium text-gray-700">
            Goal Name
          </Label>
          <Input
            id="name"
            placeholder="e.g., Dream Car"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            className="mt-1.5"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Goal Icon */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Goal Icon
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {goalIcons.map(({ id, icon: Icon, label }) => {
              const isSelected = selectedIcon === id;

              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedIcon(id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-cyan-50 border-2 border-cyan-500'
                      : 'bg-white border-2 border-gray-200'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isSelected ? 'text-cyan-500' : 'text-gray-500'}`} />
                  <span className={`text-xs ${isSelected ? 'text-cyan-700' : 'text-gray-600'}`}>
                    {label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Target Amount */}
        <div>
          <Label htmlFor="targetAmount" className="text-sm font-medium text-gray-700">
            Target Amount
          </Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <Input
              id="targetAmount"
              type="text"
              inputMode="decimal"
              placeholder="10,00,000"
              value={targetAmountInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetAmountInput(e.target.value)}
              className="pl-8"
            />
          </div>
          {targetAmount > 0 && (
            <p className="text-xs text-gray-500 mt-1">{formatINR(targetAmount)}</p>
          )}
          {errors.targetAmount && <p className="text-red-500 text-xs mt-1">{errors.targetAmount}</p>}
        </div>

        {/* Current Savings */}
        <div>
          <Label htmlFor="currentAmount" className="text-sm font-medium text-gray-700">
            Already Saved (Optional)
          </Label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <Input
              id="currentAmount"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={currentAmountInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentAmountInput(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Target Date */}
        <div>
          <Label htmlFor="targetDate" className="text-sm font-medium text-gray-700">
            Target Date
          </Label>
          <div className="relative mt-1.5">
            <Input
              id="targetDate"
              type="date"
              min={minDate}
              value={targetDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDate(e.target.value)}
              className="pl-10"
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          </div>
          {errors.targetDate && <p className="text-red-500 text-xs mt-1">{errors.targetDate}</p>}
        </div>

        {/* Priority */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-3 block">
            Priority
          </Label>
          <div className="flex gap-3">
            {priorityOptions.map(({ id, label, color }) => {
              const isSelected = priority === id;

              return (
                <motion.button
                  key={id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPriority(id as 'high' | 'medium' | 'low')}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all ${
                    isSelected ? color : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
            Notes (Optional)
          </Label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Why is this goal important to you?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          />
        </div>

        {/* Preview Card */}
        {preview && (
          <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  {(() => {
                    const IconComponent = goalIcons.find(g => g.id === selectedIcon)?.icon || Target;
                    return <IconComponent className="w-6 h-6" />;
                  })()}
                </div>
                <div>
                  <p className="text-cyan-100 text-sm">{name || 'Your Goal'}</p>
                  <p className="text-2xl font-bold">{formatINR(targetAmount)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-cyan-100 text-xs">Monthly Needed</p>
                  <p className="text-lg font-semibold">{formatINR(preview.monthlyNeeded)}</p>
                </div>
                <div>
                  <p className="text-cyan-100 text-xs">Days Left</p>
                  <p className="text-lg font-semibold">{preview.daysLeft} days</p>
                </div>
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
          className="w-full h-12 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold"
          disabled={!name || !targetAmount || !targetDate || isSubmitting}
        >
          {isSubmitting ? 'Creating...' : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Create Goal
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
