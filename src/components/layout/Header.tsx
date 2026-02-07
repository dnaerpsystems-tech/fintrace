import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightActions?: ReactNode;
  className?: string;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export function Header({
  title,
  showBack = false,
  rightActions,
  className,
  scrollContainerRef,
}: HeaderProps) {
  const navigate = useNavigate();

  // Use scroll position to animate header
  const { scrollY } = useScroll({
    container: scrollContainerRef,
  });

  // Transform values based on scroll
  const titleScale = useTransform(scrollY, [0, 50], [1, 0.85]);
  const titleY = useTransform(scrollY, [0, 50], [0, -8]);
  const headerBackground = useTransform(
    scrollY,
    [0, 50],
    ["hsl(var(--background) / 0)", "hsl(var(--background) / 0.8)"]
  );
  const headerBorder = useTransform(
    scrollY,
    [0, 50],
    ["hsl(var(--border) / 0)", "hsl(var(--border) / 1)"]
  );

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <motion.header
      className={cn(
        "sticky top-0 z-40 backdrop-blur-xl",
        className
      )}
      style={{
        backgroundColor: headerBackground,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: headerBorder,
      }}
    >
      {/* Compact header row */}
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Back button */}
        <div className="flex items-center min-w-[60px]">
          {showBack && (
            <motion.button
              onClick={handleBack}
              className="flex items-center text-primary -ml-2 p-2"
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft className="w-6 h-6" />
              <span className="text-[17px]">Back</span>
            </motion.button>
          )}
        </div>

        {/* Center - Collapsed title (visible on scroll) */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ opacity: useTransform(scrollY, [30, 50], [0, 1]) }}
        >
          <span className="ios-title">{title}</span>
        </motion.div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 min-w-[60px] justify-end">
          {rightActions}
        </div>
      </div>

      {/* Large title (iOS style) */}
      <motion.div
        className="px-4 pb-2"
        style={{
          scale: titleScale,
          y: titleY,
          originX: 0,
        }}
      >
        <motion.h1
          className="ios-large-title"
          style={{ opacity: useTransform(scrollY, [30, 50], [1, 0]) }}
        >
          {title}
        </motion.h1>
      </motion.div>
    </motion.header>
  );
}

export default Header;
