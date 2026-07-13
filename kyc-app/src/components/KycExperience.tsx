"use client";

import { useState } from "react";
import { KycFlow } from "./KycFlow";
import { SaturnLogo } from "./SaturnLogo";

function truncateAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function KycExperience() {
  const [address, setAddress] = useState<string | null>(null);

  return (
    <div>
      {/* Nav — matches the opportunities page; shows the address once connected */}
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
            <div className="flex items-center gap-1.5 whitespace-nowrap border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {truncateAddress(address)}
            </div>
          )}
        </div>
      </div>

      {/* Hero banner */}
      <div className="bg-ink text-white">
        <div className="tick-ruler" />
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Individual KYC Process
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Complete identity verification for full access to Saturn.
          </p>
        </div>
        <div className="tick-ruler" />
      </div>

      {/* Flow */}
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <KycFlow onAddress={setAddress} />
      </div>
    </div>
  );
}
