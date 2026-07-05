import type { HistoricalYieldPoint } from "@/lib/types";

export function YieldChart({
  data,
  color = "var(--primary)",
}: {
  data: HistoricalYieldPoint[];
  color?: string;
}) {
  const width = 640;
  const height = 220;
  const padTop = 16;
  const padBottom = 28;
  const padX = 8;

  const values = data.map((d) => d.apy);
  const max = Math.max(...values) * 1.15;
  const min = 0;

  const plotHeight = height - padTop - padBottom;
  const stepX = (width - padX * 2) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padTop + plotHeight - ((d.apy - min) / (max - min)) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padBottom} L ${points[0].x.toFixed(1)} ${height - padBottom} Z`;

  const gridLines = [0, 0.5, 1];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        {gridLines.map((g) => {
          const y = padTop + plotHeight * (1 - g);
          return (
            <line
              key={g}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          );
        })}
        <path d={areaPath} fill={color} opacity="0.08" />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p) => (
          <circle key={p.month} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted">
        {data.map((d) => (
          <span key={d.month} className="font-tabular">
            {d.month}
          </span>
        ))}
      </div>
    </div>
  );
}
