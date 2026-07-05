export type RiskLevel = "Low" | "Medium" | "High";

export type AssetSymbol = "USDat" | "sUSDat" | "srUSDat" | "jrUSDat";

export type Protocol = "Saturn" | "Pendle" | "Curve" | "PancakeSwap" | "Morpho";

export type YieldType = "Variable" | "Fixed";

export type MorphoStrategy = "Looping" | "Lending";

export type PendleType = "PT" | "LP";

export interface HistoricalYieldPoint {
  month: string;
  apy: number;
}

export interface Opportunity {
  id: string;
  name: string;
  protocol: Protocol;
  asset: AssetSymbol;
  pairAsset?: string;
  yieldType: YieldType;
  apy: number;
  apyMin: number;
  apyMax: number;
  riskLevel: RiskLevel;
  maturityLabel?: string;
  tvl: number;
  chain: string;
  description: string;
  longDescription: string;
  riskExplanation: string;
  requirements: string[];
  howToParticipate: string[];
  historicalYield: HistoricalYieldPoint[];
  externalUrl?: string;
  morphoStrategy?: MorphoStrategy;
  pendleType?: PendleType;
  /** True when apy/tvl/maturityLabel were overridden by a live API fetch this request. */
  isLive?: boolean;
  /** Morpho isolated markets only — the live cost to borrow against this collateral. */
  borrowApy?: number;
  /** Looping strategies only — the leverage multiple the quoted APY assumes. */
  leverage?: number;
  /** Looping strategies only — the unleveraged edge: base asset APY minus borrow APY. */
  spreadApy?: number;
  /** Looping strategies only — max collateral price drop (%) before liquidation. */
  maxDrop?: number;
}
