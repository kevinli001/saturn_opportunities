import type { Opportunity } from "@/lib/types";
import { formatApy, formatUsd } from "@/lib/format";
import { AssetBadge } from "./AssetBadge";
import { RiskBadge } from "./RiskBadge";
import { LiveBadge } from "./LiveBadge";

function ApyValue({ value, isLive }: { value: number; isLive?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-tabular font-bold text-primary">{formatApy(value)}</span>
      <LiveBadge isLive={isLive} />
    </div>
  );
}

function CardRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}

export function OpportunityTable({
  items,
  showBorrowApy = false,
  showLeverage = false,
  showTvl = false,
}: {
  items: Opportunity[];
  showBorrowApy?: boolean;
  showLeverage?: boolean;
  showTvl?: boolean;
}) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <div className="space-y-3 sm:hidden">
        {items.map((o) => (
          <div key={o.id} className="border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-foreground">{o.name}</p>
                <p className="text-xs uppercase tracking-wide text-muted">
                  {o.chain}
                  {o.maturityLabel ? ` · ${o.maturityLabel}` : ""}
                </p>
              </div>
              <div className="text-right">
                <ApyValue value={o.apy} isLive={o.isLive} />
                <p className="mt-0.5 text-xs uppercase tracking-widest text-muted">
                  {showBorrowApy ? "Lending APY" : "APY"}
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2 border-t border-dashed border-border pt-3">
              {showBorrowApy && (
                <CardRow label="Borrow APY">
                  {typeof o.borrowApy === "number" ? (
                    <ApyValue value={o.borrowApy} isLive={o.isLive} />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </CardRow>
              )}
              {showLeverage && (
                <CardRow label="Leverage">
                  <span className="font-tabular text-foreground">
                    {typeof o.leverage === "number" ? `${o.leverage.toFixed(2)}x` : "—"}
                  </span>
                </CardRow>
              )}
              {showTvl && (
                <CardRow label="TVL">
                  <span className="font-tabular text-foreground">{formatUsd(o.tvl)}</span>
                </CardRow>
              )}
              <CardRow label="Token">
                <AssetBadge asset={o.asset} />
              </CardRow>
              <CardRow label="Risk">
                <RiskBadge level={o.riskLevel} />
              </CardRow>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto border border-border bg-surface scrollbar-thin sm:block">
        <table
          className={`w-full text-left text-sm ${showBorrowApy || showLeverage || showTvl ? "min-w-[760px]" : "min-w-[640px]"}`}
        >
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-widest text-muted">
              <th className="px-4 py-3 font-bold">Name</th>
              <th className="px-4 py-3 font-bold">Token</th>
              <th className="px-4 py-3 font-bold">Risk</th>
              {showLeverage && <th className="px-4 py-3 font-bold">Leverage</th>}
              {showTvl && <th className="px-4 py-3 font-bold">TVL</th>}
              <th className="px-4 py-3 font-bold">
                {showBorrowApy ? "Lending APY" : "APY"}
              </th>
              {showBorrowApy && <th className="px-4 py-3 font-bold">Borrow APY</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-bold text-foreground">{o.name}</p>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    {o.chain}
                    {o.maturityLabel ? ` · ${o.maturityLabel}` : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <AssetBadge asset={o.asset} />
                </td>
                <td className="px-4 py-3">
                  <RiskBadge level={o.riskLevel} />
                </td>
                {showLeverage && (
                  <td className="px-4 py-3 font-tabular text-muted">
                    {typeof o.leverage === "number" ? `${o.leverage.toFixed(2)}x` : "—"}
                  </td>
                )}
                {showTvl && (
                  <td className="px-4 py-3 font-tabular text-muted">{formatUsd(o.tvl)}</td>
                )}
                <td className="px-4 py-3">
                  <ApyValue value={o.apy} isLive={o.isLive} />
                </td>
                {showBorrowApy && (
                  <td className="px-4 py-3">
                    {typeof o.borrowApy === "number" ? (
                      <ApyValue value={o.borrowApy} isLive={o.isLive} />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
