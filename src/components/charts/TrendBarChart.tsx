import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export interface TrendData {
  period: string;
  income: number;
  expense: number;
}

interface TrendBarChartProps {
  data: TrendData[];
  showLegend?: boolean;
  height?: number;
}

// Format large numbers to K/L/Cr format
const formatIndianCurrency = (value: number): string => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(0)}K`;
  }
  return `₹${value}`;
};

// Tooltip props type
interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover border border-border rounded-xl p-3 shadow-lg"
      >
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        {payload.map((entry: TooltipPayloadEntry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium rupee">
              ₹{entry.value.toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Net:</span>
            <span
              className={`font-medium rupee ${
                payload[0].value - payload[1].value >= 0
                  ? "text-emerald-500"
                  : "text-rose-500"
              }`}
            >
              {payload[0].value - payload[1].value >= 0 ? "+" : ""}₹
              {Math.abs(payload[0].value - payload[1].value).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

// Custom legend
const CustomLegend = () => {
  return (
    <div className="flex items-center justify-center gap-6 mt-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-emerald-500" />
        <span className="text-sm text-muted-foreground">Income</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm bg-rose-500" />
        <span className="text-sm text-muted-foreground">Expense</span>
      </div>
    </div>
  );
};

export function TrendBarChart({
  data,
  showLegend = true,
  height = 220,
}: TrendBarChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="period"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatIndianCurrency}
            width={60}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
          />
          <Bar
            dataKey="income"
            name="Income"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationBegin={0}
          />
          <Bar
            dataKey="expense"
            name="Expense"
            fill="#f43f5e"
            radius={[4, 4, 0, 0]}
            animationDuration={800}
            animationBegin={200}
          />
        </BarChart>
      </ResponsiveContainer>
      {showLegend && <CustomLegend />}
    </motion.div>
  );
}

export default TrendBarChart;
