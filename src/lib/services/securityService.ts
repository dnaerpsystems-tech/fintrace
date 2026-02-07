/**
 * Security Service - Tier-One Security Management
 * Handles PIN, biometric authentication, and app lock
 */

import { validatePIN } from '@/lib/validators';

// ==================== TYPES ====================

export interface SecurityState {
  isPinEnabled: boolean;
  isBiometricEnabled: boolean;
  isLocked: boolean;
  lastUnlockTime: number | null;
  failedAttempts: number;
  lockoutUntil: number | null;
}

export interface PinSetupResult {
  success: boolean;
  error?: string;
}

export interface UnlockResult {
  success: boolean;
  error?: string;
  remainingAttempts?: number;
}

// ==================== CONSTANTS ====================

const SECURITY_STORAGE_KEY = 'fintrace_security_state';
const PIN_HASH_KEY = 'fintrace_pin_hash';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ==================== CRYPTO UTILITIES ====================

/**
 * Hash a PIN using SHA-256
 */
async function hashPIN(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'fintrace_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against stored hash
 */
async function verifyPIN(pin: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPIN(pin);
  return inputHash === storedHash;
}

// ==================== STATE MANAGEMENT ====================

/**
 * Get current security state
 */
export function getSecurityState(): SecurityState {
  try {
    const stored = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading security state:', error);
  }

  return {
    isPinEnabled: false,
    isBiometricEnabled: false,
    isLocked: false,
    lastUnlockTime: null,
    failedAttempts: 0,
    lockoutUntil: null,
  };
}

/**
 * Save security state
 */
function saveSecurityState(state: SecurityState): void {
  localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Check if app should be locked
 */
export function shouldLockApp(): boolean {
  const state = getSecurityState();

  if (!state.isPinEnabled) {
    return false;
  }

  if (state.isLocked) {
    return true;
  }

  // Check auto-lock timeout
  if (state.lastUnlockTime) {
    const elapsed = Date.now() - state.lastUnlockTime;
    if (elapsed > AUTO_LOCK_TIMEOUT_MS) {
      lockApp();
      return true;
    }
  }

  return false;
}

/**
 * Lock the app
 */
export function lockApp(): void {
  const state = getSecurityState();
  saveSecurityState({
    ...state,
    isLocked: true,
  });
}

// ==================== PIN MANAGEMENT ====================

/**
 * Set up a new PIN
 */
export async function setupPIN(pin: string, confirmPin: string): Promise<PinSetupResult> {
  // Validate PIN
  const validation = validatePIN(pin, confirmPin);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors[0]?.message || 'Invalid PIN',
    };
  }

  try {
    // Hash and store PIN
    const hashedPin = await hashPIN(pin);
    localStorage.setItem(PIN_HASH_KEY, hashedPin);

    // Update security state
    const state = getSecurityState();
    saveSecurityState({
      ...state,
      isPinEnabled: true,
      isLocked: false,
      lastUnlockTime: Date.now(),
      failedAttempts: 0,
      lockoutUntil: null,
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting up PIN:', error);
    return {
      success: false,
      error: 'Failed to set up PIN. Please try again.',
    };
  }
}

/**
 * Change existing PIN
 */
export async function changePIN(
  currentPin: string,
  newPin: string,
  confirmNewPin: string
): Promise<PinSetupResult> {
  // Verify current PIN first
  const unlockResult = await unlockWithPIN(currentPin);
  if (!unlockResult.success) {
    return {
      success: false,
      error: 'Current PIN is incorrect',
    };
  }

  // Set up new PIN
  return setupPIN(newPin, confirmNewPin);
}

/**
 * Unlock app with PIN
 */
export async function unlockWithPIN(pin: string): Promise<UnlockResult> {
  const state = getSecurityState();

  // Check if in lockout
  if (state.lockoutUntil && Date.now() < state.lockoutUntil) {
    const remainingSeconds = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
    return {
      success: false,
      error: `Too many attempts. Try again in ${remainingSeconds} seconds.`,
    };
  }

  // Get stored hash
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  if (!storedHash) {
    return {
      success: false,
      error: 'PIN not set up',
    };
  }

  // Verify PIN
  const isValid = await verifyPIN(pin, storedHash);

  if (isValid) {
    // Success - reset state
    saveSecurityState({
      ...state,
      isLocked: false,
      lastUnlockTime: Date.now(),
      failedAttempts: 0,
      lockoutUntil: null,
    });

    return { success: true };
  }

  // Failed attempt
  const newFailedAttempts = state.failedAttempts + 1;
  const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;

  if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
    // Lockout
    saveSecurityState({
      ...state,
      failedAttempts: newFailedAttempts,
      lockoutUntil: Date.now() + LOCKOUT_DURATION_MS,
    });

    return {
      success: false,
      error: 'Too many failed attempts. Please wait 5 minutes.',
      remainingAttempts: 0,
    };
  }

  saveSecurityState({
    ...state,
    failedAttempts: newFailedAttempts,
  });

  return {
    success: false,
    error: `Incorrect PIN. ${remainingAttempts} attempts remaining.`,
    remainingAttempts,
  };
}

/**
 * Disable PIN
 */
export async function disablePIN(currentPin: string): Promise<PinSetupResult> {
  // Verify current PIN first
  const unlockResult = await unlockWithPIN(currentPin);
  if (!unlockResult.success) {
    return {
      success: false,
      error: 'Incorrect PIN',
    };
  }

  // Remove PIN
  localStorage.removeItem(PIN_HASH_KEY);

  // Update state
  const state = getSecurityState();
  saveSecurityState({
    ...state,
    isPinEnabled: false,
    isBiometricEnabled: false,
    isLocked: false,
    failedAttempts: 0,
    lockoutUntil: null,
  });

  return { success: true };
}

// ==================== BIOMETRIC AUTHENTICATION ====================

/**
 * Check if biometric is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    return false;
  }

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * Enable biometric authentication
 */
export async function enableBiometric(): Promise<PinSetupResult> {
  const state = getSecurityState();

  if (!state.isPinEnabled) {
    return {
      success: false,
      error: 'PIN must be enabled first',
    };
  }

  const available = await isBiometricAvailable();
  if (!available) {
    return {
      success: false,
      error: 'Biometric authentication is not available on this device',
    };
  }

  saveSecurityState({
    ...state,
    isBiometricEnabled: true,
  });

  return { success: true };
}

/**
 * Disable biometric authentication
 */
export function disableBiometric(): void {
  const state = getSecurityState();
  saveSecurityState({
    ...state,
    isBiometricEnabled: false,
  });
}

/**
 * Unlock with biometric
 */
export async function unlockWithBiometric(): Promise<UnlockResult> {
  const state = getSecurityState();

  if (!state.isBiometricEnabled) {
    return {
      success: false,
      error: 'Biometric authentication is not enabled',
    };
  }

  try {
    // Use WebAuthn for biometric
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        rpId: window.location.hostname,
      },
    });

    if (credential) {
      saveSecurityState({
        ...state,
        isLocked: false,
        lastUnlockTime: Date.now(),
        failedAttempts: 0,
      });

      return { success: true };
    }

    return {
      success: false,
      error: 'Biometric verification failed',
    };
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: 'Biometric authentication cancelled or failed',
    };
  }
}

// ==================== ACTIVITY TRACKING ====================

/**
 * Update last activity time
 */
export function updateLastActivity(): void {
  const state = getSecurityState();
  if (state.isPinEnabled && !state.isLocked) {
    saveSecurityState({
      ...state,
      lastUnlockTime: Date.now(),
    });
  }
}

/**
 * Reset security (for testing/emergency)
 */
export function resetSecurity(): void {
  localStorage.removeItem(SECURITY_STORAGE_KEY);
  localStorage.removeItem(PIN_HASH_KEY);
}

// ==================== EXPORTS ====================

export const securityService = {
  getSecurityState,
  shouldLockApp,
  lockApp,
  setupPIN,
  changePIN,
  unlockWithPIN,
  disablePIN,
  isBiometricAvailable,
  enableBiometric,
  disableBiometric,
  unlockWithBiometric,
  updateLastActivity,
  resetSecurity,
};

export default securityService;
