/**
 * Security Settings Page
 * PIN setup, change, disable and biometric toggle
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Lock, Fingerprint, Shield, Eye, EyeOff,
  Check, X, AlertTriangle, KeyRound, Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  setupPIN,
  changePIN,
  disablePIN,
  enableBiometric,
  disableBiometric,
  getSecurityState,
  isBiometricAvailable,
} from '@/lib/services/securityService';

type Mode = 'main' | 'setup' | 'change' | 'disable' | 'confirm';

export default function SecuritySettingsPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('main');
  const [securityState, setSecurityState] = useState(getSecurityState());
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // PIN input states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
    }
    checkBiometric();
    setSecurityState(getSecurityState());
  }, []);

  const resetInputs = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setShowPin(false);
  };

  const handleSetupPIN = async () => {
    setIsLoading(true);
    setError('');

    const result = await setupPIN(newPin, confirmPin);

    setIsLoading(false);

    if (result.success) {
      setSecurityState(getSecurityState());
      setMode('main');
      resetInputs();
    } else {
      setError(result.error || 'Failed to set up PIN');
    }
  };

  const handleChangePIN = async () => {
    setIsLoading(true);
    setError('');

    const result = await changePIN(currentPin, newPin, confirmPin);

    setIsLoading(false);

    if (result.success) {
      setSecurityState(getSecurityState());
      setMode('main');
      resetInputs();
    } else {
      setError(result.error || 'Failed to change PIN');
    }
  };

  const handleDisablePIN = async () => {
    setIsLoading(true);
    setError('');

    const result = await disablePIN(currentPin);

    setIsLoading(false);

    if (result.success) {
      setSecurityState(getSecurityState());
      setMode('main');
      resetInputs();
    } else {
      setError(result.error || 'Failed to disable PIN');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      const result = await enableBiometric();
      if (result.success) {
        setSecurityState(getSecurityState());
      } else {
        setError(result.error || 'Failed to enable biometric');
      }
    } else {
      disableBiometric();
      setSecurityState(getSecurityState());
    }
  };

  const renderPinInput = (
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    label: string
  ) => (
    <div className="mb-4">
      <Label className="text-sm font-medium text-gray-700 mb-2 block">{label}</Label>
      <div className="relative">
        <input
          type={showPin ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={value}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onChange(val);
          }}
          placeholder={placeholder}
          className="w-full h-12 px-4 pr-12 text-xl tracking-[0.5em] font-mono bg-gray-100 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
        />
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );

  // Main Settings View
  if (mode === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
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
              <h1 className="text-xl font-bold text-gray-900">Security</h1>
              <p className="text-sm text-gray-500">Protect your financial data</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Security Status */}
          <Card className={securityState.isPinEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50'}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                securityState.isPinEnabled ? 'bg-emerald-100' : 'bg-gray-200'
              }`}>
                <Shield className={`w-6 h-6 ${
                  securityState.isPinEnabled ? 'text-emerald-500' : 'text-gray-500'
                }`} />
              </div>
              <div>
                <p className={`font-semibold ${securityState.isPinEnabled ? 'text-emerald-700' : 'text-gray-700'}`}>
                  {securityState.isPinEnabled ? 'App is Protected' : 'App is Not Protected'}
                </p>
                <p className="text-sm text-gray-500">
                  {securityState.isPinEnabled
                    ? 'PIN lock is enabled'
                    : 'Enable PIN lock to secure your data'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PIN Settings */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              PIN Lock
            </h3>
            <Card>
              <CardContent className="p-0 divide-y divide-gray-100">
                {!securityState.isPinEnabled ? (
                  <button
                    className="w-full p-4 flex items-center gap-4 text-left"
                    onClick={() => {
                      resetInputs();
                      setMode('setup');
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Set Up PIN</p>
                      <p className="text-sm text-gray-500">Create a 4 or 6 digit PIN</p>
                    </div>
                    <KeyRound className="w-5 h-5 text-gray-400" />
                  </button>
                ) : (
                  <>
                    <button
                      className="w-full p-4 flex items-center gap-4 text-left"
                      onClick={() => {
                        resetInputs();
                        setMode('change');
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <KeyRound className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Change PIN</p>
                        <p className="text-sm text-gray-500">Update your existing PIN</p>
                      </div>
                    </button>

                    <button
                      className="w-full p-4 flex items-center gap-4 text-left"
                      onClick={() => {
                        resetInputs();
                        setMode('disable');
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <X className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-red-600">Disable PIN</p>
                        <p className="text-sm text-gray-500">Remove PIN protection</p>
                      </div>
                    </button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Biometric Settings */}
          {biometricAvailable && securityState.isPinEnabled && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Biometric
              </h3>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Biometric Unlock</p>
                    <p className="text-sm text-gray-500">Use Face ID or Touch ID</p>
                  </div>
                  <Switch
                    checked={securityState.isBiometricEnabled}
                    onCheckedChange={handleBiometricToggle}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Security Tips</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600">
                  <li>Use a unique PIN that's hard to guess</li>
                  <li>Don't use birthdays or sequential numbers</li>
                  <li>Enable biometric for quick, secure access</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Setup/Change/Disable PIN Views
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => {
              setMode('main');
              resetInputs();
            }}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {mode === 'setup' && 'Set Up PIN'}
              {mode === 'change' && 'Change PIN'}
              {mode === 'disable' && 'Disable PIN'}
            </h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              {/* Setup PIN Form */}
              {mode === 'setup' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-lg font-semibold">Create Your PIN</h2>
                    <p className="text-gray-500 text-sm">Enter a 4 or 6 digit PIN</p>
                  </div>

                  {renderPinInput(newPin, setNewPin, '••••', 'Enter PIN')}
                  {renderPinInput(confirmPin, setConfirmPin, '••••', 'Confirm PIN')}

                  {error && (
                    <p className="text-red-500 text-sm mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </p>
                  )}

                  <Button
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
                    onClick={handleSetupPIN}
                    disabled={newPin.length < 4 || confirmPin.length < 4 || isLoading}
                  >
                    {isLoading ? 'Setting up...' : 'Set PIN'}
                  </Button>
                </>
              )}

              {/* Change PIN Form */}
              {mode === 'change' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <KeyRound className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-lg font-semibold">Change Your PIN</h2>
                    <p className="text-gray-500 text-sm">Enter your current PIN and new PIN</p>
                  </div>

                  {renderPinInput(currentPin, setCurrentPin, '••••', 'Current PIN')}
                  {renderPinInput(newPin, setNewPin, '••••', 'New PIN')}
                  {renderPinInput(confirmPin, setConfirmPin, '••••', 'Confirm New PIN')}

                  {error && (
                    <p className="text-red-500 text-sm mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </p>
                  )}

                  <Button
                    className="w-full h-12 bg-blue-500 hover:bg-blue-600"
                    onClick={handleChangePIN}
                    disabled={currentPin.length < 4 || newPin.length < 4 || confirmPin.length < 4 || isLoading}
                  >
                    {isLoading ? 'Changing...' : 'Change PIN'}
                  </Button>
                </>
              )}

              {/* Disable PIN Form */}
              {mode === 'disable' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-lg font-semibold">Disable PIN</h2>
                    <p className="text-gray-500 text-sm">Enter your current PIN to disable protection</p>
                  </div>

                  {renderPinInput(currentPin, setCurrentPin, '••••', 'Current PIN')}

                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-4">
                    <p className="text-red-700 text-sm">
                      <strong>Warning:</strong> Disabling PIN will remove all security protection from your app. Anyone with access to your phone will be able to view your financial data.
                    </p>
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {error}
                    </p>
                  )}

                  <Button
                    className="w-full h-12 bg-red-500 hover:bg-red-600"
                    onClick={handleDisablePIN}
                    disabled={currentPin.length < 4 || isLoading}
                  >
                    {isLoading ? 'Disabling...' : 'Disable PIN'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
