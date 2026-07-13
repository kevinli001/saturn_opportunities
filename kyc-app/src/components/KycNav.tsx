"use client";

import { useEffect, useRef, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { SaturnLogo } from "./SaturnLogo";

function truncateAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function KycNav() {
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const address = primaryWallet?.address ?? null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div className="border-b border-border bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <SaturnLogo />
          <span className="flex items-center gap-1.5 text-[11px] font-normal uppercase tracking-widest">
            <span className="text-primary">/</span>
            <span className="text-muted">Built on digital credit</span>
          </span>
        </div>

        {address && (
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 whitespace-nowrap border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground transition-colors hover:border-primary/50"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {truncateAddress(address)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+4px)] w-full min-w-max border border-border bg-surface shadow-lg">
                <button
                  onClick={() => {
                    handleLogOut();
                    setMenuOpen(false);
                  }}
                  className="whitespace-nowrap px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-danger transition-colors hover:bg-surface-2"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
