/**
 * PIN Lock Page
 * Secure app access with PIN entry
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Delete, X, AlertCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  unlockWithPIN,
  unlockWithBiometric,
  getSecurityState,
  isBiometricAvailable,
} from '@/lib/services/securityService';

interface PinLockPageProps {
  onUnlock: () => void;
}

export default function PinLockPage({ onUnlock }: PinLockPageProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  const securityState = getSecurityState();
  const pinLength = 4; // Could be 4 or 6

  // Check biometric availability
  useEffect(() => {
    async function checkBiometric() {
      if (securityState.isBiometricEnabled) {
        const available = await isBiometricAvailable();
        setShowBiometric(available);

        // Auto-trigger biometric on mount
        if (available) {
          handleBiometricAuth();
        }
      }
    }
    checkBiometric();
  }, []);

  // Handle lockout countdown
  useEffect(() => {
    if (securityState.lockoutUntil && securityState.lockoutUntil > Date.now()) {
      setLockoutTime(securityState.lockoutUntil);

      const interval = setInterval(() => {
        if (Date.now() >= securityState.lockoutUntil!) {
          setLockoutTime(null);
          clearInterval(interval);
        } else {
          setLockoutTime(securityState.lockoutUntil);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [securityState.lockoutUntil]);

  const handleKeyPress = useCallback((digit: string) => {
    if (pin.length >= pinLength || lockoutTime) return;

    setError('');
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-submit when PIN is complete
    if (newPin.length === pinLength) {
      handleSubmit(newPin);
    }
  }, [pin, pinLength, lockoutTime]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError('');
  }, []);

  const handleSubmit = async (pinToSubmit: string) => {
    setIsLoading(true);

    const result = await unlockWithPIN(pinToSubmit);

    setIsLoading(false);

    if (result.success) {
      onUnlock();
    } else {
      setError(result.error || 'Incorrect PIN');
      setIsShaking(true);
      setPin('');

      setTimeout(() => setIsShaking(false), 500);

      if (result.remainingAttempts === 0) {
        setLockoutTime(Date.now() + 5 * 60 * 1000);
      }
    }
  };

  const handleBiometricAuth = async () => {
    setIsLoading(true);
    const result = await unlockWithBiometric();
    setIsLoading(false);

    if (result.success) {
      onUnlock();
    } else {
      setError(result.error || 'Biometric authentication failed');
    }
  };

  const getRemainingLockoutTime = () => {
    if (!lockoutTime) return '';
    const remaining = Math.ceil((lockoutTime - Date.now()) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <Lock className="w-10 h-10 text-white" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 className="text-2xl font-bold text-white mb-2">Enter PIN</h1>
        <p className="text-gray-400">
          {lockoutTime
            ? `Too many attempts. Try again in ${getRemainingLockoutTime()}`
            : 'Enter your PIN to unlock FinTrace'
          }
        </p>
      </motion.div>

      {/* PIN Dots */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`flex gap-4 mb-8 ${isShaking ? 'animate-shake' : ''}`}
      >
        {Array.from({ length: pinLength }).map((_, i) => (
          <motion.div
            key={`pin-dot-${i}`}
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < pin.length
                ? 'bg-emerald-500 border-emerald-500 scale-110'
                : 'border-gray-500'
            }`}
            animate={i < pin.length ? { scale: [1, 1.2, 1] } : {}}
          />
        ))}
      </motion.div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-red-400 mb-6"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keypad */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key, index) => {
          if (key === '') {
            return <div key={`key-empty-${index}`} />;
          }

          if (key === 'del') {
            return (
              <motion.button
                key="key-delete"
                whileTap={{ scale: 0.9 }}
                className="w-20 h-20 rounded-full flex items-center justify-center text-gray-400 active:bg-white/10"
                onClick={handleDelete}
                disabled={!!lockoutTime || isLoading}
              >
                <Delete className="w-6 h-6" />
              </motion.button>
            );
          }

          return (
            <motion.button
              key={`key-${key}`}
              whileTap={{ scale: 0.9 }}
              className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-white text-2xl font-medium active:bg-white/20 transition-colors disabled:opacity-50"
              onClick={() => handleKeyPress(key)}
              disabled={!!lockoutTime || isLoading}
            >
              {key}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Biometric Button */}
      {showBiometric && !lockoutTime && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="ghost"
            className="text-gray-400 hover:text-white"
            onClick={handleBiometricAuth}
            disabled={isLoading}
          >
            <Fingerprint className="w-6 h-6 mr-2" />
            Use Biometric
          </Button>
        </motion.div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <motion.div
            className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          />
        </div>
      )}

      {/* Shake Animation Style */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}
