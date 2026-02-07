/**
 * PWA Update Prompt Component
 * Shows when a new version of the app is available
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UpdatePromptProps {
  className?: string;
}

// Global state for update availability
let updateAvailable = false;
let swRegistration: ServiceWorkerRegistration | null = null;
const updateCallbacks: Set<(available: boolean) => void> = new Set();

// Initialize update listener
export function initUpdateListener(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      swRegistration = registration;

      // Check for updates periodically (every 60 minutes)
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      // Listen for new service worker waiting
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              updateAvailable = true;
              notifyUpdateCallbacks();
            }
          });
        }
      });
    });

    // Handle controller change (when user accepts update)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload the page when the new service worker takes control
      window.location.reload();
    });
  }
}

function notifyUpdateCallbacks(): void {
  updateCallbacks.forEach(callback => callback(updateAvailable));
}

export function subscribeToUpdates(callback: (available: boolean) => void): () => void {
  updateCallbacks.add(callback);
  callback(updateAvailable);
  return () => updateCallbacks.delete(callback);
}

export function applyUpdate(): void {
  if (swRegistration?.waiting) {
    // Tell the waiting service worker to take control
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function UpdatePrompt({ className = '' }: UpdatePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUpdates((available) => {
      if (available && !dismissed) {
        setShowPrompt(true);
      }
    });
    return unsubscribe;
  }, [dismissed]);

  const handleUpdate = () => {
    setUpdating(true);
    applyUpdate();
    // The page will reload when the new service worker takes control
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className={`fixed bottom-20 left-4 right-4 z-50 ${className}`}
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex-shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Update Available
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  A new version of FinTrace is ready to install
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <Button
                    onClick={handleUpdate}
                    disabled={updating}
                    size="sm"
                    className="gap-2"
                  >
                    {updating ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {updating ? 'Updating...' : 'Update Now'}
                  </Button>

                  <Button
                    onClick={handleDismiss}
                    variant="ghost"
                    size="sm"
                  >
                    Later
                  </Button>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Toast-style update prompt (alternative)
export function UpdateToast() {
  const [showToast, setShowToast] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToUpdates((available) => {
      setShowToast(available);
    });
    return unsubscribe;
  }, []);

  const handleUpdate = () => {
    setUpdating(true);
    applyUpdate();
  };

  return (
    <AnimatePresence>
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-4 right-4 z-50"
        >
          <div className="bg-emerald-600 text-white rounded-xl p-3 shadow-lg flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">New version available!</span>
            </div>
            <Button
              onClick={handleUpdate}
              disabled={updating}
              size="sm"
              variant="secondary"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              {updating ? 'Updating...' : 'Refresh'}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default UpdatePrompt;
