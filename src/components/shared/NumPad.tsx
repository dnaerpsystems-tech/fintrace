import { motion } from "framer-motion";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

const keys = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];

export function NumPad({ value, onChange, maxLength = 10, className }: NumPadProps) {
  const handleKeyPress = (key: string) => {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
    } else if (key === ".") {
      // Only allow one decimal point
      if (!value.includes(".")) {
        onChange(value + key);
      }
    } else {
      // Limit length
      if (value.length < maxLength) {
        // Prevent leading zeros (except for decimals)
        if (value === "0" && key !== ".") {
          onChange(key);
        } else {
          // Limit decimal places to 2
          const parts = value.split(".");
          if (parts.length === 2 && parts[1].length >= 2) {
            return;
          }
          onChange(value + key);
        }
      }
    }
  };

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {keys.flat().map((key) => (
        <motion.button
          key={key}
          type="button"
          onClick={() => handleKeyPress(key)}
          className={cn(
            "h-14 rounded-xl text-xl font-medium transition-colors flex items-center justify-center",
            key === "⌫"
              ? "bg-muted/80 text-muted-foreground active:bg-muted"
              : "bg-muted/50 text-foreground active:bg-muted"
          )}
          whileTap={{ scale: 0.95, backgroundColor: "hsl(var(--muted))" }}
          transition={{ duration: 0.1 }}
        >
          {key === "⌫" ? (
            <Delete className="w-6 h-6" />
          ) : (
            key
          )}
        </motion.button>
      ))}
    </div>
  );
}

export default NumPad;
