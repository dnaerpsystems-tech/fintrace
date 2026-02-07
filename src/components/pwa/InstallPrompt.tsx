/**
 * PWA Install Prompt Component
 * Shows install button and handles installation flow
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Monitor, Share, Plus, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { pwaInstallService } from '@/lib/services/pwaInstallService';

interface InstallPromptProps {
  variant?: 'button' | 'banner' | 'card';
  className?: string;
}

export function InstallPrompt({ variant = 'button', className = '' }: InstallPromptProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | null>(null);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(pwaInstallService.isInstalled());

    // Subscribe to install state changes
    const unsubscribe = pwaInstallService.subscribe((installable) => {
      setCanInstall(installable);
    });

    return unsubscribe;
  }, []);

  const handleInstallClick = async () => {
    setInstalling(true);
    const result = await pwaInstallService.promptInstall();
    setInstalling(false);

    if (result === 'unavailable') {
      // Show manual instructions
      setShowDialog(true);
    } else {
      setInstallResult(result);
      if (result === 'accepted') {
        setIsInstalled(true);
      }
    }
  };

  const instructions = pwaInstallService.getInstructions();

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Button variant
  if (variant === 'button') {
    return (
      <>
        <Button
          onClick={canInstall ? handleInstallClick : () => setShowDialog(true)}
          disabled={installing}
          className={`gap-2 ${className}`}
          variant={canInstall ? 'default' : 'outline'}
        >
          {installing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            >
              <Download className="w-4 h-4" />
            </motion.div>
          ) : (
            <Download className="w-4 h-4" />
          )}
          Install App
        </Button>

        <InstallDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          instructions={instructions}
          canInstall={canInstall}
          onInstall={handleInstallClick}
        />
      </>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <AnimatePresence>
        {(canInstall || !isInstalled) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-xl ${className}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Install FinTrace</p>
                  <p className="text-sm text-emerald-100">Quick access from your home screen</p>
                </div>
              </div>
              <Button
                onClick={canInstall ? handleInstallClick : () => setShowDialog(true)}
                disabled={installing}
                size="sm"
                className="bg-white text-emerald-600 hover:bg-emerald-50"
              >
                {installing ? 'Installing...' : 'Install'}
              </Button>
            </div>

            <InstallDialog
              open={showDialog}
              onOpenChange={setShowDialog}
              instructions={instructions}
              canInstall={canInstall}
              onInstall={handleInstallClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <>
        <Card className={`p-4 border-emerald-200 bg-emerald-50/50 ${className}`}>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl">
              <Smartphone className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Install FinTrace App</h3>
              <p className="text-sm text-gray-600 mb-3">
                Add to your home screen for quick access and offline support
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={canInstall ? handleInstallClick : () => setShowDialog(true)}
                  disabled={installing}
                  size="sm"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {installing ? 'Installing...' : 'Install Now'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <InstallDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          instructions={instructions}
          canInstall={canInstall}
          onInstall={handleInstallClick}
        />
      </>
    );
  }

  return null;
}

// Install Dialog with platform-specific instructions
interface InstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructions: ReturnType<typeof pwaInstallService.getInstructions>;
  canInstall: boolean;
  onInstall: () => void;
}

function InstallDialog({ open, onOpenChange, instructions, canInstall, onInstall }: InstallDialogProps) {
  const platformIcons = {
    ios: Smartphone,
    android: Smartphone,
    desktop: Monitor,
    unknown: Smartphone
  };

  const PlatformIcon = platformIcons[instructions.platform];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Download className="w-5 h-5 text-emerald-600" />
            </div>
            Install FinTrace
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {canInstall ? (
            // Native install available
            <div className="text-center py-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-4 bg-emerald-50 rounded-2xl inline-block mb-4"
              >
                <PlatformIcon className="w-12 h-12 text-emerald-600" />
              </motion.div>
              <p className="text-gray-600 mb-4">
                Install FinTrace for quick access and offline support
              </p>
              <Button onClick={onInstall} className="w-full gap-2">
                <Download className="w-4 h-4" />
                Install Now
              </Button>
            </div>
          ) : (
            // Manual instructions
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <PlatformIcon className="w-8 h-8 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900 capitalize">
                    {instructions.platform === 'unknown' ? 'Your Device' : instructions.platform}
                  </p>
                  <p className="text-sm text-gray-500">Follow these steps to install</p>
                </div>
              </div>

              <div className="space-y-3">
                {instructions.instructions.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-gray-700 text-sm">{step}</p>
                  </motion.div>
                ))}
              </div>

              {instructions.platform === 'ios' && (
                <div className="flex items-center gap-2 text-sm text-gray-500 p-3 bg-amber-50 rounded-xl">
                  <Share className="w-4 h-4" />
                  <span>Look for the</span>
                  <Share className="w-4 h-4" />
                  <span>Share button, then scroll to find "Add to Home Screen"</span>
                </div>
              )}
            </div>
          )}

          {/* Benefits */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Benefits of installing:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Works offline',
                'Quick access',
                'Push notifications',
                'Full screen mode'
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InstallPrompt;
