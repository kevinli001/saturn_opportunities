import { opportunities as staticOpportunities } from "./mock-data";
import type { Opportunity } from "./types";
import { getPendleLiveData, PENDLE_ID_MAP } from "./live/pendle";
import { getCurveLiveData } from "./live/curve";
import { getMorphoLiveData } from "./live/morpho";
import { getHoldAprLiveData } from "./live/holdApr";
import { getPancakeLiveData } from "./live/pancakeswap";

// Looping recursively deposits an asset (a PT, or sUSDat itself) as
// collateral, borrows against it, and buys more of the asset to lever up
// exposure. Net yield = leverage x the asset's own yield minus (leverage-1)
// x the cost of the borrowed portion, since only the borrowed portion
// (leverage-1 times the starting collateral) pays borrow interest.
const LOOPING_ID_MAP: Record<string, { assetApyId: string; morphoId: string; leverage: number }> = {
  "looping-pt-usdat": { assetApyId: "pt-usdat", morphoId: "morpho-pt-usdat-usdc", leverage: 10 },
  "looping-pt-susdat": { assetApyId: "pt-susdat", morphoId: "morpho-pt-susdat-usdc", leverage: 3 },
  "looping-pt-srusdat": { assetApyId: "pt-srusdat", morphoId: "morpho-pt-srusdat-usdc", leverage: 5 },
  "looping-susdat": { assetApyId: "hold-susdat", morphoId: "morpho-susdat-ausd", leverage: 3 },
};

function withLiveApy(
  opportunity: Opportunity,
  apy: number,
  options?: {
    tvl?: number;
    maturityLabel?: string;
    borrowApy?: number;
    leverage?: number;
    spreadApy?: number;
    maxDrop?: number;
    isLive?: boolean;
  },
): Opportunity {
  const isFixed = opportunity.yieldType === "Fixed";
  const historicalYield = opportunity.historicalYield.length
    ? [
        ...opportunity.historicalYield.slice(0, -1),
        {
          ...opportunity.historicalYield[opportunity.historicalYield.length - 1],
          apy,
        },
      ]
    : opportunity.historicalYield;

  return {
    ...opportunity,
    apy,
    apyMin: isFixed ? apy : opportunity.apyMin,
    apyMax: isFixed ? apy : opportunity.apyMax,
    tvl: options?.tvl ?? opportunity.tvl,
    maturityLabel: options?.maturityLabel ?? opportunity.maturityLabel,
    borrowApy: options?.borrowApy ?? opportunity.borrowApy,
    leverage: options?.leverage ?? opportunity.leverage,
    spreadApy: options?.spreadApy ?? opportunity.spreadApy,
    maxDrop: options?.maxDrop ?? opportunity.maxDrop,
    historicalYield,
    isLive: options?.isLive ?? true,
    isTvlLive: true,
  };
}

/**
 * Returns the opportunity list with live API data merged in wherever a
 * source is reachable and matches. Anything that fails or has no mapping
 * silently keeps its static value from mock-data.ts — this never throws.
 */
export async function getOpportunities(): Promise<Opportunity[]> {
  const [pendle, curve, morpho, holdApr, pancake] = await Promise.all([
    getPendleLiveData(),
    getCurveLiveData(),
    getMorphoLiveData(),
    getHoldAprLiveData(),
    getPancakeLiveData(),
  ]);

  const merged = staticOpportunities.map((opportunity) => {
    const pendleCfg = PENDLE_ID_MAP[opportunity.id];
    if (pendleCfg) {
      const live = pendle.get(pendleCfg.key);
      if (live) {
        return withLiveApy(opportunity, live[pendleCfg.metric], {
          tvl: live.tvl,
          maturityLabel: live.maturityLabel,
        });
      }
    }

    const curveLive = curve.get(opportunity.id);
    if (curveLive) {
      return withLiveApy(opportunity, curveLive.apy, { tvl: curveLive.tvl });
    }

    const morphoLive = morpho.get(opportunity.id);
    if (morphoLive) {
      return withLiveApy(opportunity, morphoLive.apy, {
        borrowApy: morphoLive.borrowApy,
        tvl: morphoLive.tvl,
      });
    }

    const holdLive = holdApr.get(opportunity.id);
    if (holdLive) {
      return withLiveApy(opportunity, holdLive.apy, { tvl: holdLive.tvl });
    }

    const pancakeLive = pancake.get(opportunity.id);
    if (pancakeLive) {
      return { ...opportunity, tvl: pancakeLive.tvl, isTvlLive: true };
    }

    return opportunity;
  });

  const byId = new Map(merged.map((opportunity) => [opportunity.id, opportunity]));

  return merged.map((opportunity) => {
    const loopCfg = LOOPING_ID_MAP[opportunity.id];
    if (!loopCfg) return opportunity;

    const assetApySource = byId.get(loopCfg.assetApyId);
    const morphoMarket = byId.get(loopCfg.morphoId);
    if (!assetApySource || !morphoMarket || typeof morphoMarket.borrowApy !== "number") {
      return opportunity;
    }

    const { leverage } = loopCfg;
    const spreadApy = assetApySource.apy - morphoMarket.borrowApy;
    const apy = leverage * assetApySource.apy - (leverage - 1) * morphoMarket.borrowApy;

    const morphoLive = morpho.get(loopCfg.morphoId);
    const lltv = morphoLive?.lltv;
    const maxDrop = typeof lltv === "number"
      ? Math.round((1 - (leverage - 1) / (leverage * lltv)) * 10000) / 100
      : undefined;

    return withLiveApy(opportunity, apy, {
      tvl: opportunity.tvl,
      leverage,
      spreadApy: Math.round(spreadApy * 100) / 100,
      maxDrop,
      isLive: Boolean(assetApySource.isLive && morphoMarket.isLive),
    });
  });
}
