import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PageProps {
  children: ReactNode;
  className?: string;
  onRefresh?: () => Promise<void>;
  enablePullToRefresh?: boolean;
}

const PULL_THRESHOLD = 80;

export function Page({
  children,
  className,
  onRefresh,
  enablePullToRefresh = false,
}: PageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const pullY = useMotionValue(0);
  const pullProgress = useTransform(pullY, [0, PULL_THRESHOLD], [0, 1]);
  const pullRotation = useTransform(pullY, [0, PULL_THRESHOLD], [0, 180]);

  const handleTouchStart = useCallback(() => {
    if (!enablePullToRefresh || isRefreshing) return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setIsPulling(true);
    }
  }, [enablePullToRefresh, isRefreshing]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling || isRefreshing) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - (e.target as HTMLElement).getBoundingClientRect().top;

      if (deltaY > 0 && containerRef.current?.scrollTop === 0) {
        const newPullY = Math.min(deltaY * 0.5, PULL_THRESHOLD * 1.5);
        pullY.set(newPullY);
      }
    },
    [isPulling, isRefreshing, pullY]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullY.get() >= PULL_THRESHOLD && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      animate(pullY, PULL_THRESHOLD, { duration: 0.2 });

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullY, 0, { duration: 0.3 });
      }
    } else {
      animate(pullY, 0, { duration: 0.3 });
    }
  }, [isPulling, pullY, onRefresh, isRefreshing]);

  return (
    <div className={cn("page-container relative", className)}>
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && (
        <motion.div
          className="ptr-indicator absolute left-0 right-0 top-0 flex items-center justify-center overflow-hidden"
          style={{ height: pullY }}
        >
          {isRefreshing ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          ) : (
            <motion.div
              style={{ rotate: pullRotation, opacity: pullProgress }}
            >
              <Loader2 className="w-6 h-6 text-muted-foreground" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Scrollable content */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scrollbar-hide"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <motion.div style={{ y: enablePullToRefresh ? pullY : 0 }}>
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export default Page;
