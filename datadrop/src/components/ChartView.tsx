import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  columns: string[];
  rows: Record<string, unknown>[];
}

const BAR_COLORS = ["#7c6af5", "#4caf82", "#e8a87c", "#f07171", "#64b5f6"];

export function ChartView({ columns, rows }: Props) {
  const sample = rows.slice(0, 30);
  const numericCols = columns.filter(
    (col) =>
      sample.some((row) => typeof row[col] === "number") &&
      sample.every(
        (row) => row[col] === null || row[col] === undefined || typeof row[col] === "number",
      ),
  );

  if (numericCols.length === 0) {
    return (
      <div className="empty-state">
        No numeric columns detected. Try an aggregation query, e.g.
        <br />
        <code>SELECT `category`, COUNT(*) AS total FROM `table` GROUP BY 1</code>
      </div>
    );
  }

  const labelCol = columns.find((col) => !numericCols.includes(col)) ?? null;

  const data = rows.slice(0, 100).map((row, i) => ({
    __label: labelCol != null ? String(row[labelCol] ?? i) : String(i),
    ...Object.fromEntries(numericCols.map((col) => [col, row[col] ?? 0])),
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
          <XAxis
            dataKey="__label"
            tick={{ fill: "#8892a8", fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={64}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fill: "#8892a8", fontSize: 11 }} width={52} />
          <Tooltip
            contentStyle={{
              background: "#1e2230",
              border: "1px solid #2d3348",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            labelStyle={{ color: "#8892a8" }}
            itemStyle={{ color: "#e2e6f3" }}
          />
          <Legend
            wrapperStyle={{
              color: "#8892a8",
              fontSize: "12px",
              paddingTop: "8px",
            }}
          />
          {numericCols.slice(0, 5).map((col, idx) => (
            <Bar
              key={col}
              dataKey={col}
              fill={BAR_COLORS[idx % BAR_COLORS.length]}
              radius={[3, 3, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
