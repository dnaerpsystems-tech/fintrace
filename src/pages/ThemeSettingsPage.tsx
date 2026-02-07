/**
 * Theme Settings Page
 * Dark mode toggle and appearance customization
 */

import { useState, useEffect } from 'react';
import { Page, Header } from '@/components/layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { motion } from 'framer-motion';
import {
  themeService,
  type ThemeMode,
  type ThemePreferences,
  ACCENT_COLORS,
} from '@/lib/services/themeService';
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  Type,
  Sparkles,
  Check,
  Eye
} from 'lucide-react';

export default function ThemeSettingsPage() {
  const [preferences, setPreferences] = useState<ThemePreferences>(
    themeService.getThemePreferences()
  );

  useEffect(() => {
    themeService.applyAllPreferences(preferences);
  }, [preferences]);

  const handleModeChange = (mode: ThemeMode) => {
    const updated = themeService.saveThemePreferences({ mode });
    setPreferences(updated);
  };

  const handleAccentChange = (accentColor: string) => {
    const updated = themeService.saveThemePreferences({ accentColor });
    setPreferences(updated);
  };

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    const updated = themeService.saveThemePreferences({ fontSize });
    setPreferences(updated);
  };

  const handleReducedMotionChange = (reducedMotion: boolean) => {
    const updated = themeService.saveThemePreferences({ reducedMotion });
    setPreferences(updated);
  };

  const resolvedTheme = themeService.getResolvedTheme(preferences.mode);

  return (
    <Page>
      <Header title="Appearance" showBack />

      <div className="px-4 pb-24 space-y-6">
        {/* Theme Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-500" />
              Theme Mode
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <ThemeModeButton
                mode="light"
                currentMode={preferences.mode}
                icon={Sun}
                label="Light"
                onClick={() => handleModeChange('light')}
              />
              <ThemeModeButton
                mode="dark"
                currentMode={preferences.mode}
                icon={Moon}
                label="Dark"
                onClick={() => handleModeChange('dark')}
              />
              <ThemeModeButton
                mode="system"
                currentMode={preferences.mode}
                icon={Monitor}
                label="System"
                onClick={() => handleModeChange('system')}
              />
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              {preferences.mode === 'system'
                ? `Currently using ${resolvedTheme} mode based on system preference`
                : `${preferences.mode.charAt(0).toUpperCase() + preferences.mode.slice(1)} mode is active`
              }
            </p>
          </Card>
        </motion.div>

        {/* Accent Color */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-pink-500" />
              Accent Color
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleAccentChange(color.value)}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    preferences.accentColor === color.value
                      ? 'border-gray-900 dark:border-white'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: color.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {color.name}
                  </span>
                  {preferences.accentColor === color.value && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-5 h-5 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-white dark:text-gray-900" />
                    </motion.div>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Font Size */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Type className="w-5 h-5 text-blue-500" />
              Font Size
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <FontSizeButton
                size="small"
                currentSize={preferences.fontSize}
                label="Small"
                preview="Aa"
                onClick={() => handleFontSizeChange('small')}
              />
              <FontSizeButton
                size="medium"
                currentSize={preferences.fontSize}
                label="Medium"
                preview="Aa"
                onClick={() => handleFontSizeChange('medium')}
              />
              <FontSizeButton
                size="large"
                currentSize={preferences.fontSize}
                label="Large"
                preview="Aa"
                onClick={() => handleFontSizeChange('large')}
              />
            </div>
          </Card>
        </motion.div>

        {/* Motion Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Reduce Motion</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minimize animations throughout the app
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.reducedMotion}
                onCheckedChange={handleReducedMotionChange}
              />
            </div>
          </Card>
        </motion.div>

        {/* Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Preview</h3>

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                  F
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">FinTrace</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Personal Finance</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100">₹1,25,000</p>
                </div>
                <div className="p-3 bg-emerald-500 text-white rounded-lg">
                  <p className="text-xs opacity-80">Savings</p>
                  <p className="font-bold">₹25,000</p>
                </div>
              </div>

              <Button className="w-full">
                Sample Button
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </Page>
  );
}

// ============================================
// Sub-components
// ============================================

function ThemeModeButton({
  mode,
  currentMode,
  icon: Icon,
  label,
  onClick,
}: {
  mode: ThemeMode;
  currentMode: ThemeMode;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  const isSelected = mode === currentMode;

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <Icon className={`w-6 h-6 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`} />
      <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
        >
          <Check className="w-2.5 h-2.5 text-white" />
        </motion.div>
      )}
    </button>
  );
}

function FontSizeButton({
  size,
  currentSize,
  label,
  preview,
  onClick,
}: {
  size: 'small' | 'medium' | 'large';
  currentSize: 'small' | 'medium' | 'large';
  label: string;
  preview: string;
  onClick: () => void;
}) {
  const isSelected = size === currentSize;

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <span className={`font-bold ${sizeClasses[size]} ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
        {preview}
      </span>
      <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </span>
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
        >
          <Check className="w-2.5 h-2.5 text-white" />
        </motion.div>
      )}
    </button>
  );
}
