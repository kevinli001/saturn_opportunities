export function StatCard({
  label,
  value,
  hint,
  icon,
  valueClassName = "text-foreground",
  valueSuffix,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  valueClassName?: string;
  valueSuffix?: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-surface-2 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-foreground">{label}</p>
        {icon}
      </div>
      <div className="my-3 border-t border-dashed border-border" />
      <div className="flex items-center gap-2">
        <p className={`font-tabular text-3xl font-bold tracking-tight ${valueClassName}`}>
          {value}
        </p>
        {valueSuffix}
      </div>
      {hint && (
        <p className="mt-2 text-right text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
