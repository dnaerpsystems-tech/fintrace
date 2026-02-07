import { motion } from "framer-motion";
import {
  Utensils,
  ShoppingCart,
  Car,
  Film,
  Pill,
  Smartphone,
  Home,
  Plane,
  Coffee,
  Fuel,
  GraduationCap,
  Scissors,
  Shield,
  CreditCard,
  MoreHorizontal,
  Briefcase,
  Laptop,
  Building2,
  TrendingUp,
  Landmark,
  PiggyBank,
  Gift,
  RefreshCcw,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

// Icon mapping for category icons
const iconMap: Record<string, LucideIcon> = {
  Utensils: Utensils,
  ShoppingCart: ShoppingCart,
  Car: Car,
  Film: Film,
  Pill: Pill,
  Smartphone: Smartphone,
  Home: Home,
  Plane: Plane,
  Coffee: Coffee,
  Fuel: Fuel,
  GraduationCap: GraduationCap,
  Scissors: Scissors,
  Shield: Shield,
  CreditCard: CreditCard,
  MoreHorizontal: MoreHorizontal,
  Briefcase: Briefcase,
  Laptop: Laptop,
  Building2: Building2,
  TrendingUp: TrendingUp,
  Landmark: Landmark,
  PiggyBank: PiggyBank,
  Gift: Gift,
  RefreshCcw: RefreshCcw,
  Wallet: Wallet,
};

// Default expense categories
export const defaultExpenseCategories = [
  { id: "food", name: "Food & Dining", icon: "Utensils", color: "#f97316" },
  { id: "groceries", name: "Groceries", icon: "ShoppingCart", color: "#ec4899" },
  { id: "transport", name: "Transport", icon: "Car", color: "#3b82f6" },
  { id: "fuel", name: "Fuel", icon: "Fuel", color: "#6366f1" },
  { id: "shopping", name: "Shopping", icon: "ShoppingCart", color: "#a855f7" },
  { id: "bills", name: "Bills", icon: "Smartphone", color: "#06b6d4" },
  { id: "entertainment", name: "Entertainment", icon: "Film", color: "#8b5cf6" },
  { id: "health", name: "Health", icon: "Pill", color: "#ef4444" },
  { id: "education", name: "Education", icon: "GraduationCap", color: "#14b8a6" },
  { id: "personal", name: "Personal Care", icon: "Scissors", color: "#f43f5e" },
  { id: "home", name: "Home", icon: "Home", color: "#f59e0b" },
  { id: "travel", name: "Travel", icon: "Plane", color: "#0ea5e9" },
  { id: "insurance", name: "Insurance", icon: "Shield", color: "#10b981" },
  { id: "emi", name: "EMI", icon: "CreditCard", color: "#6b7280" },
  { id: "other", name: "Other", icon: "MoreHorizontal", color: "#78716c" },
];

// Default income categories
export const defaultIncomeCategories = [
  { id: "salary", name: "Salary", icon: "Briefcase", color: "#10b981" },
  { id: "freelance", name: "Freelance", icon: "Laptop", color: "#06b6d4" },
  { id: "business", name: "Business", icon: "Building2", color: "#8b5cf6" },
  { id: "investment", name: "Investment", icon: "TrendingUp", color: "#3b82f6" },
  { id: "rental", name: "Rental", icon: "Home", color: "#f59e0b" },
  { id: "interest", name: "Interest", icon: "Landmark", color: "#6366f1" },
  { id: "dividends", name: "Dividends", icon: "PiggyBank", color: "#14b8a6" },
  { id: "gifts", name: "Gifts", icon: "Gift", color: "#ec4899" },
  { id: "refund", name: "Refund", icon: "RefreshCcw", color: "#0ea5e9" },
  { id: "other_income", name: "Other", icon: "MoreHorizontal", color: "#78716c" },
];

// Default transfer categories
export const defaultTransferCategories = [
  { id: "account_transfer", name: "Account Transfer", icon: "Wallet", color: "#8b5cf6" },
  { id: "investment_transfer", name: "Investment", icon: "TrendingUp", color: "#3b82f6" },
  { id: "other_transfer", name: "Other", icon: "MoreHorizontal", color: "#78716c" },
];

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CategoryPickerProps {
  categories?: Category[];
  type: "expense" | "income" | "transfer";
  selectedId?: string;
  onSelect: (category: CategoryItem) => void;
  className?: string;
}

export function CategoryPicker({
  categories,
  type,
  selectedId,
  onSelect,
  className,
}: CategoryPickerProps) {
  // Use provided categories or default to built-in categories
  const displayCategories: CategoryItem[] = categories?.length
    ? categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
      }))
    : type === "expense"
    ? defaultExpenseCategories
    : type === "income"
    ? defaultIncomeCategories
    : defaultTransferCategories;

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      {displayCategories.map((category) => {
        const Icon = iconMap[category.icon] || MoreHorizontal;
        const isSelected = selectedId === category.id;

        return (
          <motion.button
            key={category.id}
            type="button"
            onClick={() => onSelect(category)}
            className={cn(
              "ios-card p-3 flex flex-col items-center gap-2 transition-all",
              isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: category.color }}
              />
            </div>
            <span className="text-xs text-muted-foreground text-center truncate w-full">
              {category.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default CategoryPicker;
