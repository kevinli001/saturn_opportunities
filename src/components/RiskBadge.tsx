import type { RiskLevel } from "@/lib/types";

const styles: Record<RiskLevel, string> = {
  Low: "bg-success/10 text-success border-success/30",
  Medium: "bg-warning/10 text-warning border-warning/30",
  High: "bg-danger/10 text-danger border-danger/30",
};

export function RiskBadge({
  level,
  className = "",
}: {
  level: RiskLevel;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-semibold uppercase tracking-wide ${styles[level]} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
