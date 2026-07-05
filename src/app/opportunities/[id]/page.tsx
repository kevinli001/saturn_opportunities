import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { opportunities as staticOpportunities, getOpportunityById } from "@/lib/mock-data";
import { getOpportunities } from "@/lib/live-data";
import { formatApy, formatUsd } from "@/lib/format";
import { assetMeta, protocolMeta } from "@/lib/assets";
import { RiskBadge } from "@/components/RiskBadge";
import { AssetBadge } from "@/components/AssetBadge";
import { ProtocolBadge } from "@/components/ProtocolBadge";
import { YieldChart } from "@/components/YieldChart";
import { OpportunityCard } from "@/components/OpportunityCard";
import { StatCard } from "@/components/StatCard";
import { LiveBadge } from "@/components/LiveBadge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return staticOpportunities.map((o) => ({ id: o.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const opportunity = getOpportunityById(id);
  return { title: opportunity ? `${opportunity.name} — Saturn` : "Saturn" };
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const opportunities = await getOpportunities();
  const opportunity = opportunities.find((o) => o.id === id);

  if (!opportunity) notFound();

  const related = opportunities
    .filter((o) => o.protocol === opportunity.protocol && o.id !== opportunity.id)
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        &larr; All opportunities
      </Link>

      <div className="mt-4 flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted">
            <span>{protocolMeta[opportunity.protocol].label}</span>
            <span>&middot;</span>
            <span>{assetMeta[opportunity.asset].label}</span>
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {opportunity.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <AssetBadge asset={opportunity.asset} />
            <ProtocolBadge protocol={opportunity.protocol} />
            <RiskBadge level={opportunity.riskLevel} />
            <span className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-muted">
              TVL {formatUsd(opportunity.tvl)}
            </span>
            <span className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-muted">
              {opportunity.chain}
            </span>
            {typeof opportunity.leverage === "number" && (
              <span className="border border-border bg-surface px-2 py-1 text-xs font-semibold text-muted">
                {opportunity.leverage.toFixed(2)}x leverage
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              <p className="font-tabular text-4xl font-bold text-primary">
                {formatApy(opportunity.apy)}
              </p>
              <LiveBadge isLive={opportunity.isLive} />
            </div>
            <p className="text-xs text-muted">
              {opportunity.yieldType === "Fixed"
                ? `Fixed until ${opportunity.maturityLabel}`
                : `Range ${formatApy(opportunity.apyMin)} – ${formatApy(opportunity.apyMax)}`}
            </p>
          </div>
          {opportunity.externalUrl && (
            <a
              href={opportunity.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-ink bg-ink px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            >
              View on {protocolMeta[opportunity.protocol].label}
              <span aria-hidden="true">&#8599;</span>
            </a>
          )}
        </div>
      </div>

      <div
        className={`mt-8 grid gap-4 ${
          typeof opportunity.borrowApy === "number"
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2"
        }`}
      >
        <StatCard
          label={typeof opportunity.borrowApy === "number" ? "Lending APY" : "Est. APY"}
          value={formatApy(opportunity.apy)}
          valueClassName="text-primary"
          valueSuffix={<LiveBadge isLive={opportunity.isLive} />}
        />
        {typeof opportunity.borrowApy === "number" && (
          <StatCard
            label="Borrow APY"
            value={formatApy(opportunity.borrowApy)}
            valueClassName="text-primary"
            valueSuffix={<LiveBadge isLive={opportunity.isLive} />}
          />
        )}
        <StatCard label="Risk level" value={opportunity.riskLevel} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Overview</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {opportunity.longDescription}
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Historical yield</h2>
        <p className="mt-1 text-sm text-muted">
          Monthly APY over the trailing 6 months.
        </p>
        <div className="mt-5 border border-border bg-surface-2 p-5">
          <YieldChart
            data={opportunity.historicalYield}
            color={assetMeta[opportunity.asset].color}
          />
        </div>
      </section>

      <section className="mt-10 border border-warning/30 bg-warning/5 p-5">
        <h2 className="text-lg font-bold text-foreground">
          Risk explanation
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {opportunity.riskExplanation}
        </p>
      </section>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <section>
          <h2 className="text-lg font-bold text-foreground">
            Requirements
          </h2>
          <ul className="mt-3 space-y-2">
            {opportunity.requirements.map((req) => (
              <li key={req} className="flex gap-2 text-sm text-muted">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {req}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground">
            How to participate
          </h2>
          <ol className="mt-3 space-y-3">
            {opportunity.howToParticipate.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-muted">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-border bg-surface text-xs font-bold text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold text-foreground">
            More on {protocolMeta[opportunity.protocol].label}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
