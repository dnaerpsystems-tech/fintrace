import { motion } from "framer-motion";
import { BarChart3, Home, Menu, Plus, TrendingUp } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/stats", icon: BarChart3, label: "Stats" },
  { path: "/add", icon: Plus, label: "Add", isCenter: true },
  { path: "/invest", icon: TrendingUp, label: "Invest" },
  { path: "/more", icon: Menu, label: "More" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <nav className="bottom-nav z-50">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <motion.button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className="relative -mt-6"
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
                  initial={false}
                  animate={{
                    boxShadow: isActive
                      ? "0 8px 24px hsl(142 71% 45% / 0.4)"
                      : "0 4px 12px hsl(142 71% 45% / 0.2)",
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </motion.div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "bottom-nav-item relative flex-1 max-w-[72px]",
                isActive && "active"
              )}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                className="relative"
                initial={false}
                animate={{ y: isActive ? -2 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Icon
                  className={cn(
                    "w-6 h-6 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <motion.div
                    className="absolute -bottom-1 left-1/2 w-1 h-1 rounded-full bg-primary"
                    layoutId="navIndicator"
                    initial={{ opacity: 0, x: "-50%" }}
                    animate={{ opacity: 1, x: "-50%" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
              <span
                className={cn(
                  "text-[10px] font-medium mt-1 transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
