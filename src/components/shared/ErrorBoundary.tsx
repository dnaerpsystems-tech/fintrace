/**
 * Error Boundary Component
 * Tier-One Standards: Enhanced error handling with retry, logging, and fallback options
 */

import type React from 'react';
import { Component, type ReactNode, useCallback, useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Bug,
  WifiOff,
  ServerCrash,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onRetry?: () => void;
  showHomeButton?: boolean;
  maxRetries?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

type ErrorType = 'network' | 'server' | 'validation' | 'unknown';

// =============================================================================
// Helper Functions
// =============================================================================

function getErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  if (
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('fetch') ||
    message.includes('connection')
  ) {
    return 'network';
  }

  if (
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503') ||
    message.includes('server')
  ) {
    return 'server';
  }

  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return 'validation';
  }

  return 'unknown';
}

function getErrorIcon(type: ErrorType): React.ElementType {
  switch (type) {
    case 'network':
      return WifiOff;
    case 'server':
      return ServerCrash;
    case 'validation':
      return AlertCircle;
    default:
      return Bug;
  }
}

function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case 'network':
      return 'Connection Problem';
    case 'server':
      return 'Server Error';
    case 'validation':
      return 'Invalid Data';
    default:
      return 'Something Went Wrong';
  }
}

function getErrorDescription(type: ErrorType): string {
  switch (type) {
    case 'network':
      return 'Please check your internet connection and try again.';
    case 'server':
      return 'Our servers are having trouble. Please try again in a moment.';
    case 'validation':
      return 'There was a problem with the data. Please refresh and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// =============================================================================
// Error Boundary Class Component
// =============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to analytics/monitoring in production
    if (import.meta.env.PROD) {
      // Could integrate with Sentry, LogRocket, etc.
      console.error('[Error Tracking]', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached`);
      return;
    }

    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prev.retryCount + 1,
    }));

    this.props.onRetry?.();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, showHomeButton = true, maxRetries = 3 } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const errorType = error ? getErrorType(error) : 'unknown';
      const ErrorIcon = getErrorIcon(errorType);
      const canRetry = retryCount < maxRetries;

      return (
        <ErrorDisplay
          error={error}
          errorInfo={errorInfo}
          errorType={errorType}
          ErrorIcon={ErrorIcon}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
          canRetry={canRetry}
          retryCount={retryCount}
          maxRetries={maxRetries}
          showHomeButton={showHomeButton}
        />
      );
    }

    return children;
  }
}

// =============================================================================
// Error Display Component (Functional for animations)
// =============================================================================

interface ErrorDisplayProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorType: ErrorType;
  ErrorIcon: React.ElementType;
  onRetry: () => void;
  onGoHome: () => void;
  canRetry: boolean;
  retryCount: number;
  maxRetries: number;
  showHomeButton: boolean;
}

function ErrorDisplay({
  error,
  errorInfo,
  errorType,
  ErrorIcon,
  onRetry,
  onGoHome,
  canRetry,
  retryCount,
  maxRetries,
  showHomeButton,
}: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    // Small delay for visual feedback
    await new Promise((resolve) => setTimeout(resolve, 300));
    onRetry();
    setIsRetrying(false);
  }, [onRetry]);

  const iconColors: Record<ErrorType, string> = {
    network: 'bg-orange-100 text-orange-500',
    server: 'bg-red-100 text-red-500',
    validation: 'bg-yellow-100 text-yellow-600',
    unknown: 'bg-gray-100 text-gray-500',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center"
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${iconColors[errorType]}`}
      >
        <ErrorIcon className="w-10 h-10" />
      </motion.div>

      {/* Title */}
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        {getErrorTitle(errorType)}
      </h2>

      {/* Description */}
      <p className="text-gray-500 mb-6 max-w-sm">
        {getErrorDescription(errorType)}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {canRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-emerald-500 hover:bg-emerald-600 min-w-[140px]"
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Try Again
          </Button>
        )}

        {showHomeButton && (
          <Button onClick={onGoHome} variant="outline">
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        )}
      </div>

      {/* Retry Counter */}
      {retryCount > 0 && (
        <p className="text-xs text-gray-400 mb-4">
          Retry attempt {retryCount} of {maxRetries}
        </p>
      )}

      {/* Error Details Toggle */}
      {error && import.meta.env.DEV && (
        <div className="w-full max-w-md">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-1 text-sm text-gray-400 hover:text-gray-600 mx-auto"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Details
              </>
            )}
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-gray-50 rounded-xl text-left overflow-hidden"
              >
                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Error Message
                  </p>
                  <p className="text-sm text-red-600 font-mono break-words">
                    {error.message}
                  </p>
                </div>

                {error.stack && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Stack Trace
                    </p>
                    <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Component Stack
                    </p>
                    <pre className="text-xs text-gray-600 font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// =============================================================================
// Inline Error Component (for smaller error states)
// =============================================================================

interface InlineErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({
  message = 'Something went wrong',
  onRetry,
  className = '',
}: InlineErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onRetry();
    setIsRetrying(false);
  };

  return (
    <div className={`flex items-center justify-center gap-3 p-4 bg-red-50 rounded-xl ${className}`}>
      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRetry}
          disabled={isRetrying}
          className="text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          {isRetrying ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center p-8 text-center ${className}`}
    >
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm mb-4 max-w-xs">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="bg-emerald-500 hover:bg-emerald-600">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

// =============================================================================
// HOC
// =============================================================================

/**
 * withErrorBoundary HOC
 * Wraps a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
