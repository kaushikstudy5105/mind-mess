import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ToxicityLevel } from "@/types/pharma";

interface ToxicityDonutChartProps {
  data: ToxicityLevel[];
  totalVariants: number;
  overallRisk: string;
}

const RISK_LABEL: Record<string, string> = {
  safe: "Safe",
  low: "Low Risk",
  moderate: "Moderate",
  high: "High Risk",
  critical: "Critical",
};

const RISK_COLOR: Record<string, string> = {
  safe: "hsl(142, 71%, 45%)",
  low: "hsl(88, 60%, 48%)",
  moderate: "hsl(38, 92%, 55%)",
  high: "hsl(22, 95%, 55%)",
  critical: "hsl(0, 72%, 55%)",
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ToxicityLevel }> }) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="gradient-card border border-border rounded-lg px-3 py-2 shadow-card text-sm">
        <p className="font-semibold text-foreground">{entry.label}</p>
        <p className="text-muted-foreground">{entry.value} variants</p>
      </div>
    );
  }
  return null;
};

export default function ToxicityDonutChart({ data, totalVariants, overallRisk }: ToxicityDonutChartProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-56 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={72}
              outerRadius={104}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.hexColor} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-foreground">{totalVariants}</span>
          <span className="text-xs text-muted-foreground mt-0.5">Variants</span>
          <span
            className="text-xs font-semibold mt-2 px-2 py-0.5 rounded-full"
            style={{
              color: RISK_COLOR[overallRisk],
              background: `${RISK_COLOR[overallRisk]}20`,
              border: `1px solid ${RISK_COLOR[overallRisk]}40`,
            }}
          >
            {RISK_LABEL[overallRisk]}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 w-full">
        {data.map((item) => {
          const pct = ((item.value / totalVariants) * 100).toFixed(1);
          return (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: item.hexColor }}
              />
              <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
              <span className="text-sm font-semibold text-foreground">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
