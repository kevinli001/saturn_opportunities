export function LiveBadge({ isLive }: { isLive?: boolean }) {
  if (!isLive) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-muted"
        title="Estimated — no live data source confirmed for this opportunity"
      >
        Est.
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-success"
      title="Refreshed from a live API within the last few minutes"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-success" />
      Live
    </span>
  );
}
