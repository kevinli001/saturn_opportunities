import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { formatApy } from "@/lib/format";
import { RiskBadge } from "./RiskBadge";
import { AssetBadge } from "./AssetBadge";
import { ProtocolBadge } from "./ProtocolBadge";

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <div className="group relative flex flex-col border border-border bg-surface p-5 transition-colors hover:border-primary/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">
            {opportunity.chain}
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">
            <Link href={`/opportunities/${opportunity.id}`}>
              <span className="absolute inset-0" aria-hidden="true" />
              {opportunity.name}
            </Link>
          </h3>
        </div>
        <div className="text-right">
          <p className="font-tabular text-2xl font-bold text-primary">
            {formatApy(opportunity.apy)}
          </p>
          <p className="text-xs text-muted">Est. APY</p>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted line-clamp-2">
        {opportunity.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <AssetBadge asset={opportunity.asset} />
        <ProtocolBadge protocol={opportunity.protocol} />
        <RiskBadge level={opportunity.riskLevel} />
      </div>
    </div>
  );
}
