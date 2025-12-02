
'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';

// --- Types ---
type PieChartData = {
  name: string;
  value: number;
};

type BarChartData = {
  year: string;
  sales: number;
  profit: number;
};

// --- Helper Functions ---
const formatCurrencyForChart = (value: number) => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} Cr`;
  }
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(2)} L`;
  }
  if (value >= 1000) {
    return `₹${(value / 1000).toFixed(2)} K`;
  }
  return `₹${value}`;
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  '#82ca9d',
  '#ffc658',
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';


  return (
    <g>
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="hsl(var(--muted-foreground))" fill="none" />
      <circle cx={ex} cy={ey} r={2} fill="hsl(var(--muted-foreground))" stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`${payload.name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};


// --- Pie Chart for Project Cost Breakdown ---
export function ProjectCostPieChart({ data }: { data: PieChartData[] }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No cost breakdown data available.</p>;
  }

  return (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Tooltip
              formatter={(value: number) =>
                new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                }).format(value)
              }
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
              }}
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Legend wrapperStyle={{fontSize: "12px"}}/>
          </PieChart>
        </ResponsiveContainer>
  );
}

// --- Bar Chart for Financial Projections ---
export function FinancialProjectionsBarChart({
  data,
}: {
  data: BarChartData[];
}) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-10">No financial projection data available.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
        <XAxis
          dataKey="year"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={value => formatCurrencyForChart(value)}
        />
        <Tooltip
          formatter={(value: number) =>
            new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(value)
          }
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)',
          }}
          cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
        />
        <Legend wrapperStyle={{fontSize: "12px"}} />
        <Bar
          dataKey="sales"
          fill="hsl(var(--chart-1))"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="profit"
          fill="hsl(var(--chart-2))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
