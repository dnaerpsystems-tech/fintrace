/**
 * PWA Install Service
 * Manages the app installation prompt for Progressive Web App
 */

// Store the deferred prompt for later use
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Callbacks for state changes
type InstallStateCallback = (canInstall: boolean) => void;
const callbacks: Set<InstallStateCallback> = new Set();

// Check if app is already installed
export function isAppInstalled(): boolean {
  // Check if running in standalone mode (installed PWA)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check for iOS standalone mode
  if ((window.navigator as any).standalone === true) {
    return true;
  }

  return false;
}

// Check if install prompt is available
export function canInstall(): boolean {
  return deferredPrompt !== null && !isAppInstalled();
}

// Subscribe to install state changes
export function subscribeToInstallState(callback: InstallStateCallback): () => void {
  callbacks.add(callback);
  // Immediately call with current state
  callback(canInstall());

  return () => {
    callbacks.delete(callback);
  };
}

// Notify all subscribers of state change
function notifySubscribers(): void {
  const installable = canInstall();
  callbacks.forEach(callback => callback(installable));
}

// Initialize the install prompt listener
export function initPWAInstall(): void {
  // Listen for the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e as BeforeInstallPromptEvent;
    // Notify subscribers
    notifySubscribers();

    console.log('[PWA] Install prompt available');
  });

  // Listen for successful installation
  window.addEventListener('appinstalled', () => {
    // Clear the deferred prompt
    deferredPrompt = null;
    // Notify subscribers
    notifySubscribers();

    console.log('[PWA] App installed successfully');
  });

  // Check display mode changes
  window.matchMedia('(display-mode: standalone)').addEventListener('change', () => {
    notifySubscribers();
  });
}

// Trigger the install prompt
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return 'unavailable';
  }

  // Show the install prompt
  deferredPrompt.prompt();

  // Wait for the user's response
  const { outcome } = await deferredPrompt.userChoice;

  console.log('[PWA] User response:', outcome);

  // Clear the deferred prompt (can only be used once)
  deferredPrompt = null;
  notifySubscribers();

  return outcome;
}

// Get install instructions for different platforms
export function getInstallInstructions(): {
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  instructions: string[];
} {
  const userAgent = navigator.userAgent.toLowerCase();

  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return {
      platform: 'ios',
      instructions: [
        'Tap the Share button in Safari',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" to install FinTrace'
      ]
    };
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return {
      platform: 'android',
      instructions: [
        'Tap the menu button (three dots)',
        'Tap "Add to Home Screen" or "Install App"',
        'Follow the prompts to install'
      ]
    };
  }

  // Desktop (Chrome, Edge, etc.)
  if (/chrome|edge|opera/.test(userAgent)) {
    return {
      platform: 'desktop',
      instructions: [
        'Click the install icon in the address bar',
        'Or use the menu and select "Install FinTrace"',
        'Click "Install" in the dialog'
      ]
    };
  }

  return {
    platform: 'unknown',
    instructions: [
      'Check your browser menu for an "Install" or "Add to Home Screen" option'
    ]
  };
}

// Type definition for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend Window interface
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export const pwaInstallService = {
  init: initPWAInstall,
  isInstalled: isAppInstalled,
  canInstall,
  promptInstall,
  subscribe: subscribeToInstallState,
  getInstructions: getInstallInstructions
};
