function Ticks({ side }: { side: "left" | "right" }) {
  const thin = "h-3.5 w-px bg-primary";
  const thick = "h-3.5 w-1 bg-primary";
  // Thick bar sits closest to the label; the outer two are thin.
  const order = side === "left" ? [thin, thin, thick] : [thick, thin, thin];
  return (
    <span aria-hidden className="flex items-center gap-3">
      {order.map((c, i) => (
        <span key={i} className={c} />
      ))}
    </span>
  );
}

export function FramedButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex w-full items-center justify-center gap-3 bg-surface-2 px-6 py-4 transition-colors hover:bg-primary/5 disabled:opacity-60"
    >
      {/* orange corner brackets */}
      <span aria-hidden className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-primary" />
      <span aria-hidden className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-primary" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-primary" />
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-primary" />

      <Ticks side="left" />
      <span className="text-base font-bold text-foreground">{children}</span>
      <Ticks side="right" />
    </button>
  );
}
