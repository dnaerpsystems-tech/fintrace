/**
 * Auth Provider Component
 * Initializes authentication state on app load
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsReady(true);
    };

    init();
  }, [initialize]);

  // Show splash screen while initializing
  if (!isReady || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-pulse">
            <span className="text-4xl font-bold text-white">₹</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">FinTrace</h1>
          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
