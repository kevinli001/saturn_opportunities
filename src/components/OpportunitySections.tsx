import type { Opportunity } from "@/lib/types";
import { OpportunityTable } from "./OpportunityTable";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-muted">{description}</p>
      )}
    </div>
  );
}

function Subgroup({
  label,
  items,
  showBorrowApy = false,
  showLeverage = false,
  showTvl = false,
  showSpread = false,
  showMaxDrop = false,
}: {
  label: string;
  items: Opportunity[];
  showBorrowApy?: boolean;
  showLeverage?: boolean;
  showTvl?: boolean;
  showSpread?: boolean;
  showMaxDrop?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">
        {label}
      </p>
      <OpportunityTable
        items={items}
        showBorrowApy={showBorrowApy}
        showLeverage={showLeverage}
        showTvl={showTvl}
        showSpread={showSpread}
        showMaxDrop={showMaxDrop}
      />
    </div>
  );
}

export function OpportunitySections({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const holdApr = opportunities.filter(
    (o) => o.protocol === "Saturn" && o.yieldType === "Variable",
  );
  const curvePancake = opportunities.filter(
    (o) => o.protocol === "Curve" || o.protocol === "PancakeSwap",
  );
  const pendlePt = opportunities.filter(
    (o) => o.protocol === "Pendle" && o.pendleType === "PT",
  );
  const pendleLp = opportunities.filter(
    (o) => o.protocol === "Pendle" && o.pendleType === "LP",
  );
  const morphoLooping = opportunities.filter(
    (o) => o.protocol === "Morpho" && o.morphoStrategy === "Looping",
  );
  const morphoLending = opportunities.filter(
    (o) => o.protocol === "Morpho" && o.morphoStrategy === "Lending",
  );

  return (
    <div className="space-y-14">
      <section>
        <SectionHeading
          title="Hold APR"
          description="Hold sUSDat, srUSDat, and jrUSDat for base yield."
        />
        <OpportunityTable items={holdApr} showTvl />
      </section>

      <section>
        <SectionHeading
          title="Curve / PancakeSwap Opportunities"
          description="Provide liquidity on Curve or PancakeSwap to earn trading fees, base APR, and incentives."
        />
        <OpportunityTable items={curvePancake} showTvl />
      </section>

      <section>
        <SectionHeading
          title="Pendle Opportunities"
          description="Lock in a fixed rate with a Principal Token (PT), or provide liquidity (LP) for variable fees plus points."
        />
        <div className="space-y-6">
          <Subgroup label="PT (fixed yield)" items={pendlePt} showTvl />
          <Subgroup label="LP (variable yield)" items={pendleLp} showTvl />
        </div>
      </section>

      <section>
        <SectionHeading
          title="Morpho: Looping + Lending"
          description="Supply USDC to Saturn's Morpho vault and markets, or run a leveraged loop with Saturn's assets."
        />
        <div className="space-y-6">
          <Subgroup label="Looping" items={morphoLooping} showSpread showMaxDrop />
          <Subgroup label="Lending" items={morphoLending} showBorrowApy showTvl />
        </div>
      </section>
    </div>
  );
}
