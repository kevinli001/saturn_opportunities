import { protocolMeta } from "@/lib/assets";
import type { Protocol } from "@/lib/types";

export function ProtocolIcon({
  protocol,
  className = "h-6 w-6",
}: {
  protocol: Protocol;
  className?: string;
}) {
  const meta = protocolMeta[protocol];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded font-tabular text-[10px] font-bold ${className}`}
      style={{ backgroundColor: meta.color, color: meta.textColor }}
    >
      {meta.label[0]}
    </span>
  );
}

export function ProtocolBadge({ protocol }: { protocol: Protocol }) {
  const meta = protocolMeta[protocol];
  return (
    <span className="inline-flex items-center gap-1.5 border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground">
      <ProtocolIcon protocol={protocol} className="h-4 w-4" />
      {meta.label}
    </span>
  );
}
