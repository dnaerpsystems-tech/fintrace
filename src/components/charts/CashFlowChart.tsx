import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";

export interface CashFlowData {
  date: string;
  balance: number;
  income?: number;
  expense?: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
  height?: number;
  showMarkers?: boolean;
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
  payload: CashFlowData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover border border-border rounded-xl p-3 shadow-lg"
      >
        <p className="text-sm font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Balance:</span>
            <span className="font-medium rupee">
              ₹{data.balance.toLocaleString("en-IN")}
            </span>
          </div>
          {data.income !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Income:</span>
              <span className="font-medium rupee text-emerald-500">
                +₹{data.income.toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {data.expense !== undefined && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Expense:</span>
              <span className="font-medium rupee text-rose-500">
                -₹{data.expense.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  }
  return null;
};

// Custom dot props type
interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: CashFlowData;
}

// Custom dot for significant transactions
const CustomDot = (props: CustomDotProps) => {
  const { cx, cy, payload } = props;

  if (!cx || !cy || !payload) return null;

  // Only show dots for significant income/expense
  const hasSignificantIncome = payload.income && payload.income > 10000;
  const hasSignificantExpense = payload.expense && payload.expense > 10000;

  if (!hasSignificantIncome && !hasSignificantExpense) return null;

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={hasSignificantIncome ? "#10b981" : "#f43f5e"}
      stroke="white"
      strokeWidth={2}
    />
  );
};

export function CashFlowChart({
  data,
  height = 200,
  showMarkers = true,
}: CashFlowChartProps) {
  const { minBalance, maxBalance, avgBalance } = useMemo(() => {
    const balances = data.map((d) => d.balance);
    return {
      minBalance: Math.min(...balances),
      maxBalance: Math.max(...balances),
      avgBalance: balances.reduce((a, b) => a + b, 0) / balances.length,
    };
  }, [data]);

  // Determine if we're in positive or negative territory overall
  const isPositive = data[data.length - 1]?.balance >= data[0]?.balance;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? "#10b981" : "#f43f5e"}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? "#10b981" : "#f43f5e"}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={formatIndianCurrency}
            width={55}
            domain={["auto", "auto"]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avgBalance}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke={isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBalance)"
            animationDuration={1000}
            animationBegin={0}
            dot={showMarkers ? <CustomDot /> : false}
            activeDot={{
              r: 6,
              stroke: isPositive ? "#10b981" : "#f43f5e",
              strokeWidth: 2,
              fill: "white",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats bar */}
      <div className="flex items-center justify-between mt-3 px-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Min</p>
          <p className="text-sm font-medium rupee">
            ₹{minBalance.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-sm font-medium rupee">
            ₹{Math.round(avgBalance).toLocaleString("en-IN")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Max</p>
          <p className="text-sm font-medium rupee">
            ₹{maxBalance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default CashFlowChart;
