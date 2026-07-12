// Live data from Curve's price-feeds API, which is a *different* host from
// api.curve.finance (which returns a 403 to every fetch tool available in
// this project — browser, WebFetch, even a raw GitHub source read, so it
// looks like a domain-wide Cloudflare block, not something endpoint-
// specific). prices.curve.finance is not behind the same block.
//
// Confirmed live on 05 Jul 2026 via a one-off diagnostic run inside this
// project's own dev server (docs at prices.curve.finance/feeds-docs were
// themselves 403'd, so the shape below is read off a real response, not
// the docs):
//   GET https://prices.curve.finance/v1/pools/ethereum/{address}
//   -> { tvl_usd, base_daily_apr, base_weekly_apr, name, coins: [...], ... }
//
// These are base trading-fee APY only — they do NOT include any CRV/gauge
// incentive APY, since that data lives on the blocked api.curve.finance
// host. The real number will read lower than a gauge-inclusive APY would.
//
// base_weekly_apr can spike to nonsensical values (observed: 8473% on a
// $1.5M pool with zero 24h liquidity volume) when a thin/low-volume pool's
// short sampling window gets annualized — a tiny absolute move reads as a
// huge extrapolated rate. base_daily_apr is preferred for that reason, with
// weekly used only as a fallback and only if it's within a sane ceiling.

const CURVE_PRICES_API = "https://prices.curve.finance/v1/pools/ethereum";

export interface CurveLiveEntry {
  /** Omitted when the pool's reported APR fails the sanity check (thin-pool glitch). */
  apy?: number;
  tvl: number;
}

interface CurvePoolResponse {
  tvl_usd?: number;
  base_daily_apr?: number;
  base_weekly_apr?: number;
}

/** opportunity id -> the pool's on-chain address on Ethereum */
const CURVE_ID_MAP: Record<string, string> = {
  "curve-usdat": "0xf4d0cf32908b2c7f1021339c43df0f77f06896d7",
  "curve-susdat": "0x6206ca315c2fcdd2a857b47efb285aa12c529a7a",
};

/** Anything at or above this (as a percent) is treated as a data glitch, not a real rate. */
const SANITY_CEILING_PERCENT = 150;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pickApyFraction(pool: CurvePoolResponse): number | undefined {
  const daily = pool.base_daily_apr;
  if (typeof daily === "number" && daily * 100 < SANITY_CEILING_PERCENT) {
    return daily;
  }
  const weekly = pool.base_weekly_apr;
  if (typeof weekly === "number" && weekly * 100 < SANITY_CEILING_PERCENT) {
    return weekly;
  }
  return undefined;
}

async function fetchPool(address: string): Promise<CurvePoolResponse | null> {
  try {
    const res = await fetch(`${CURVE_PRICES_API}/${address}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CurvePoolResponse;
  } catch {
    return null;
  }
}

export async function getCurveLiveData(): Promise<Map<string, CurveLiveEntry>> {
  const map = new Map<string, CurveLiveEntry>();

  const entries = await Promise.all(
    Object.entries(CURVE_ID_MAP).map(async ([id, address]) => {
      const pool = await fetchPool(address);
      return [id, pool] as const;
    }),
  );

  for (const [id, pool] of entries) {
    if (!pool || typeof pool.tvl_usd !== "number") continue;
    // TVL is always live when present. The APY is only included when it passes
    // the sanity check — a thin pool's glitched APR is dropped so the row falls
    // back to its static estimate while still showing the real live TVL.
    const apyFraction = pickApyFraction(pool);
    map.set(id, {
      apy: typeof apyFraction === "number" ? round2(apyFraction * 100) : undefined,
      tvl: Math.round(pool.tvl_usd),
    });
  }

  return map;
}
