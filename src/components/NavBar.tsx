import { Logo } from "./Logo";

export function NavBar() {
  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Logo />
        <span className="flex items-center gap-1.5 text-[11px] font-normal uppercase tracking-widest">
          <span className="text-primary">/</span>
          <span className="text-muted">Built on digital credit</span>
        </span>
      </div>
    </div>
  );
}
