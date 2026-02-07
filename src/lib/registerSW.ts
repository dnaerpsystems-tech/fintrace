/**
 * Service Worker Registration for FinTrace PWA
 * Handles registration, updates, and offline support
 */

export interface RegisterSWOptions {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
}

let registration: ServiceWorkerRegistration | undefined;

export async function registerSW(options: RegisterSWOptions = {}): Promise<void> {
  const {
    immediate = false,
    onNeedRefresh,
    onOfflineReady,
    onRegistered,
    onRegisterError,
  } = options;

  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers are not supported in this browser.');
    return;
  }

  try {
    // Wait for the page to load before registering the service worker
    if (document.readyState === 'loading') {
      await new Promise<void>((resolve) => {
        window.addEventListener('DOMContentLoaded', () => resolve());
      });
    }

    // Register the service worker
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'classic',
    });

    onRegistered?.(registration);

    // Check for updates immediately if requested
    if (immediate) {
      await registration.update();
    }

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration?.installing;

      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content is available, prompt user to refresh
            console.log('New content is available; please refresh.');
            onNeedRefresh?.();
          } else {
            // Content is cached for offline use
            console.log('Content is cached for offline use.');
            onOfflineReady?.();
          }
        }
      });
    });

    // Listen for controller change (when skipWaiting is called)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

  } catch (error) {
    console.error('Service Worker registration failed:', error);
    onRegisterError?.(error);
  }
}

/**
 * Update the service worker immediately
 */
export async function updateSW(reloadPage = true): Promise<void> {
  if (!registration) {
    console.warn('No service worker registered');
    return;
  }

  try {
    await registration.update();

    const waitingWorker = registration.waiting;
    if (waitingWorker) {
      // Tell the waiting service worker to take control
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });

      if (reloadPage) {
        // Wait a moment for the new service worker to take control, then reload
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }
  } catch (error) {
    console.error('Failed to update service worker:', error);
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterSW(): Promise<boolean> {
  if (!registration) {
    return false;
  }

  try {
    return await registration.unregister();
  } catch (error) {
    console.error('Failed to unregister service worker:', error);
    return false;
  }
}

/**
 * Check if the app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  return 'BeforeInstallPromptEvent' in window;
}

// Store the install prompt event for later use
let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * Listen for the install prompt event
 */
export function listenForInstallPrompt(
  callback?: (event: BeforeInstallPromptEvent) => void
): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Store the event for later use
    deferredPrompt = e as BeforeInstallPromptEvent;
    // Notify the callback
    callback?.(deferredPrompt);
  });
}

/**
 * Prompt the user to install the PWA
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!deferredPrompt) {
    console.log('Install prompt not available');
    return null;
  }

  // Show the install prompt
  await deferredPrompt.prompt();

  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;

  // Clear the deferred prompt
  deferredPrompt = null;

  return outcome;
}

/**
 * Check if an install prompt is available
 */
export function hasInstallPrompt(): boolean {
  return deferredPrompt !== null;
}
