import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";

export interface CategoryData {
  name: string;
  value: number;
  color: string;
  icon?: string;
}

interface SpendingDonutChartProps {
  data: CategoryData[];
  totalAmount: number;
  currency?: string;
  title?: string;
  onCategoryClick?: (category: CategoryData) => void;
}

const CHART_COLORS = [
  "#10b981", // emerald (Food)
  "#f59e0b", // amber (Transport)
  "#ec4899", // pink (Shopping)
  "#8b5cf6", // violet (Bills)
  "#06b6d4", // cyan (Entertainment)
  "#ef4444", // red (Health)
  "#3b82f6", // blue (Education)
  "#64748b", // slate (Other)
];

// Custom active shape for when a slice is hovered
interface ActiveShapeProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

const renderActiveShape = (props: ActiveShapeProps) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: "drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))",
          transition: "all 0.3s ease",
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

export function SpendingDonutChart({
  data,
  totalAmount,
  currency = "₹",
  title = "Total Spending",
  onCategoryClick,
}: SpendingDonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const handleClick = (entry: CategoryData) => {
    onCategoryClick?.(entry);
  };

  // Assign colors if not provided
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || CHART_COLORS[index % CHART_COLORS.length],
  }));

  const activeCategory = activeIndex !== null ? chartData[activeIndex] : null;

  return (
    <div className="relative w-full">
      <div className="relative h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              activeShape={(props: unknown) => renderActiveShape(props as ActiveShapeProps)}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              onClick={(data) => handleClick(data as CategoryData)}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={entry.color}
                  stroke="transparent"
                  style={{
                    cursor: "pointer",
                    transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
                    transformOrigin: "center",
                    transition: "transform 0.2s ease"
                  }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {activeCategory ? (
              <motion.div
                key="active"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <p className="text-xs text-muted-foreground">{activeCategory.name}</p>
                <p className="text-xl font-bold rupee">
                  {currency}
                  {activeCategory.value.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {((activeCategory.value / totalAmount) * 100).toFixed(1)}%
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="total"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <p className="text-xs text-muted-foreground">{title}</p>
                <p className="text-xl font-bold rupee">
                  {currency}
                  {totalAmount.toLocaleString("en-IN")}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {chartData.map((entry, index) => (
          <motion.button
            key={entry.name}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              activeIndex === index ? "bg-muted" : "hover:bg-muted/50"
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={() => handleClick(entry)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs truncate flex-1 text-left">{entry.name}</span>
            <span className="text-xs font-medium text-muted-foreground">
              {((entry.value / totalAmount) * 100).toFixed(0)}%
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default SpendingDonutChart;
