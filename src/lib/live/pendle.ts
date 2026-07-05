// Live market data from Pendle's public REST API (no key required).
// Docs: https://api-v2.pendle.finance/core/docs
//
// Verified manually against app.pendle.finance on 04 Jul 2026 — impliedApy
// matches the site's "Fixed APY" (PT) and aggregatedApy matches "LP APY" to
// within rounding. Markets are matched by exact `name`, not hardcoded
// addresses, so this keeps working automatically when Pendle rolls to a new
// maturity.
//
// TVL: `details.liquidity` from the bulk /markets/active list is only the
// AMM pool's own liquidity (the PT+SY actually sitting in the pool) — most
// PT is held outside the pool by wallets/protocols holding to maturity, so
// this understates real market size by ~7x for PT-USDat. The v2 per-market
// /markets/{address}/data endpoint exposes `totalTvl`, which matches
// Pendle's own site and is what we display for both PT and LP.

const PENDLE_API = "https://api-v2.pendle.finance/core/v1";
const PENDLE_API_V2 = "https://api-v2.pendle.finance/core/v2";
const CHAIN_IDS = [1, 56] as const; // Ethereum, BNB Chain
const SATURN_NAMES = new Set(["USDat", "sUSDat", "srUSDat", "jrUSDat"]);

interface PendleMarketDetails {
  liquidity: number;
  impliedApy: number;
  aggregatedApy: number;
}

interface PendleMarket {
  address: string;
  name: string;
  expiry: string;
  details: PendleMarketDetails;
}

interface PendleActiveMarketsResponse {
  markets?: PendleMarket[];
}

interface PendleMarketDataResponse {
  totalTvl?: { usd?: number };
}

export interface PendleLiveEntry {
  impliedApy: number;
  aggregatedApy: number;
  tvl: number;
  maturityLabel: string;
}

/** opportunity id -> which Saturn/chain market it tracks, and which metric */
export const PENDLE_ID_MAP: Record<
  string,
  { key: string; metric: "impliedApy" | "aggregatedApy" }
> = {
  "pt-usdat": { key: "USDat-1", metric: "impliedApy" },
  "pt-susdat": { key: "sUSDat-1", metric: "impliedApy" },
  "pt-srusdat": { key: "srUSDat-1", metric: "impliedApy" },
  "pt-jrusdat": { key: "jrUSDat-1", metric: "impliedApy" },
  "pt-usdat-bnb": { key: "USDat-56", metric: "impliedApy" },
  "pt-susdat-bnb": { key: "sUSDat-56", metric: "impliedApy" },
  "lp-usdat": { key: "USDat-1", metric: "aggregatedApy" },
  "lp-susdat": { key: "sUSDat-1", metric: "aggregatedApy" },
  "lp-srusdat": { key: "srUSDat-1", metric: "aggregatedApy" },
  "lp-jrusdat": { key: "jrUSDat-1", metric: "aggregatedApy" },
  "lp-usdat-bnb": { key: "USDat-56", metric: "aggregatedApy" },
  "lp-susdat-bnb": { key: "sUSDat-56", metric: "aggregatedApy" },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function fetchChainMarkets(chainId: number): Promise<PendleMarket[]> {
  try {
    const res = await fetch(`${PENDLE_API}/${chainId}/markets/active`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data: PendleActiveMarketsResponse = await res.json();
    return data.markets ?? [];
  } catch {
    return [];
  }
}

async function fetchMarketTvl(chainId: number, address: string): Promise<number | null> {
  try {
    const res = await fetch(`${PENDLE_API_V2}/${chainId}/markets/${address}/data`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data: PendleMarketDataResponse = await res.json();
    return typeof data.totalTvl?.usd === "number" ? data.totalTvl.usd : null;
  } catch {
    return null;
  }
}

export async function getPendleLiveData(): Promise<Map<string, PendleLiveEntry>> {
  const map = new Map<string, PendleLiveEntry>();
  const marketsByChain = await Promise.all(
    CHAIN_IDS.map((chainId) => fetchChainMarkets(chainId)),
  );

  const saturnMarkets = CHAIN_IDS.flatMap((chainId, i) =>
    marketsByChain[i]
      .filter((market) => SATURN_NAMES.has(market.name))
      .map((market) => ({ chainId, market })),
  );

  const tvls = await Promise.all(
    saturnMarkets.map(({ chainId, market }) => fetchMarketTvl(chainId, market.address)),
  );

  saturnMarkets.forEach(({ chainId, market }, i) => {
    const tvl = tvls[i] ?? market.details.liquidity;
    map.set(`${market.name}-${chainId}`, {
      impliedApy: round2(market.details.impliedApy * 100),
      aggregatedApy: round2(market.details.aggregatedApy * 100),
      tvl: Math.round(tvl),
      maturityLabel: formatExpiry(market.expiry),
    });
  });

  return map;
}
