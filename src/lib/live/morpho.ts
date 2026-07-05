// Live data from Morpho's public GraphQL API.
//
// Query shapes confirmed against Morpho's official docs on 05 Jul 2026:
//   - Markets: https://docs.morpho.org/tools/offchain/api/morpho/
//   - Vaults:  https://docs.morpho.org/tools/offchain/api/morpho-vaults/
//
// Live-tested in this project's own dev server on 05 Jul 2026. Markets are
// matched by exact collateral token address (pulled from Pendle's `pt`
// field for the PT markets, and from Pendle's `underlyingAsset` field for
// the plain-sUSDat market — Morpho's collateral token) plus the loan
// asset's symbol, since the same PT can collateralize more than one
// isolated market (e.g. PT-USDat/USDC and PT-USDat/AUSD are two distinct
// markets). Morpho Blue also allows multiple isolated markets for the same
// collateral+loan pair at different LLTVs, so duplicates are resolved by
// keeping whichever has the larger supplyAssetsUsd — an earlier version of
// this file picked whichever came back last and briefly showed a
// near-empty duplicate market's ~0% rate instead of the real one.

const MORPHO_API = "https://api.morpho.org/graphql";
const SATURN_USDC_VAULT_ADDRESS = "0xAbe418cc8c06D265E4EB009C02eA4B265eCA7240";

interface MarketConfig {
  collateralAddress: string;
  loanSymbol: string;
}

// collateralAddress: PT token address for PT-collateral markets (from
// Pendle's `pt` field), or the plain asset's token address for the direct
// sUSDat/AUSD market (from Pendle's `underlyingAsset` field).
const MORPHO_MARKET_MAP: Record<string, MarketConfig> = {
  "morpho-pt-usdat-usdc": {
    collateralAddress: "0x1d69402390657308c91179aa184bf992908c1e08",
    loanSymbol: "USDC",
  },
  "morpho-pt-susdat-usdc": {
    collateralAddress: "0xc689f76f90fe1762fac55983ff25ae71033a84f7",
    loanSymbol: "USDC",
  },
  "morpho-pt-srusdat-usdc": {
    collateralAddress: "0x2d433b943fb8c015ae409444b7f960ed288082b4",
    loanSymbol: "USDC",
  },
  "morpho-pt-usdat-ausd": {
    collateralAddress: "0x1d69402390657308c91179aa184bf992908c1e08",
    loanSymbol: "AUSD",
  },
  "morpho-susdat-ausd": {
    collateralAddress: "0xd166337499e176bbc38a1fbd113ab144e5bd2df7",
    loanSymbol: "AUSD",
  },
};

const MARKETS_QUERY = `
  query SaturnMarkets($collateralAddresses: [String!]!) {
    markets(
      where: { chainId_in: [1], collateralAssetAddress_in: $collateralAddresses }
    ) {
      items {
        lltv
        collateralAsset { address symbol }
        loanAsset { symbol }
        state {
          supplyApy
          avgNetSupplyApy
          borrowApy
          avgNetBorrowApy
          supplyAssetsUsd
        }
      }
    }
  }
`;

const VAULT_QUERY_V1 = `
  query SaturnVault($address: String!) {
    vaultByAddress(address: $address, chainId: 1) {
      state { avgNetApy avgNetApyExcludingRewards totalAssetsUsd }
    }
  }
`;

const VAULT_QUERY_V2 = `
  query SaturnVaultV2($address: String!) {
    vaultV2ByAddress(address: $address, chainId: 1) {
      avgNetApy
      avgNetApyExcludingRewards
      totalAssetsUsd
    }
  }
`;

export interface MorphoLiveEntry {
  apy: number;
  borrowApy?: number;
  tvl?: number;
  lltv?: number;
}

interface MorphoMarketItem {
  lltv?: string;
  collateralAsset?: { address?: string; symbol?: string };
  loanAsset?: { symbol?: string };
  state?: {
    supplyApy?: number;
    avgNetSupplyApy?: number;
    borrowApy?: number;
    avgNetBorrowApy?: number;
    supplyAssetsUsd?: number;
  };
}

interface MorphoMarketsResponse {
  data?: { markets?: { items?: MorphoMarketItem[] } };
}

interface MorphoVaultV1Response {
  data?: {
    vaultByAddress?: {
      state?: { avgNetApy?: number; avgNetApyExcludingRewards?: number; totalAssetsUsd?: number };
    };
  };
}

interface MorphoVaultV2Response {
  data?: {
    vaultV2ByAddress?: {
      avgNetApy?: number;
      avgNetApyExcludingRewards?: number;
      totalAssetsUsd?: number;
    };
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function postGraphQL<T>(query: string, variables?: object): Promise<T | null> {
  try {
    const res = await fetch(MORPHO_API, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function parseLltv(raw?: string): number | undefined {
  if (!raw) return undefined;
  return Number(BigInt(raw)) / 1e18;
}

async function getMarketsData(): Promise<Map<string, MorphoLiveEntry>> {
  const best = new Map<string, MorphoLiveEntry & { supplyUsd: number }>();
  const collateralAddresses = [
    ...new Set(Object.values(MORPHO_MARKET_MAP).map((c) => c.collateralAddress)),
  ];
  const json = await postGraphQL<MorphoMarketsResponse>(MARKETS_QUERY, {
    collateralAddresses,
  });
  const items = json?.data?.markets?.items ?? [];

  for (const item of items) {
    const collateralAddress = item.collateralAsset?.address?.toLowerCase();
    const loan = item.loanAsset?.symbol;
    const supplyApy = item.state?.avgNetSupplyApy ?? item.state?.supplyApy;
    const borrowApy = item.state?.avgNetBorrowApy ?? item.state?.borrowApy;
    const supplyUsd = item.state?.supplyAssetsUsd ?? 0;
    if (typeof supplyApy !== "number" || !collateralAddress || !loan) continue;

    for (const [id, cfg] of Object.entries(MORPHO_MARKET_MAP)) {
      if (
        cfg.collateralAddress.toLowerCase() !== collateralAddress ||
        cfg.loanSymbol !== loan
      ) {
        continue;
      }
      const existing = best.get(id);
      if (!existing || supplyUsd > existing.supplyUsd) {
        best.set(id, {
          apy: round2(supplyApy * 100),
          borrowApy: typeof borrowApy === "number" ? round2(borrowApy * 100) : undefined,
          lltv: parseLltv(item.lltv),
          tvl: supplyUsd,
          supplyUsd,
        });
      }
    }
  }

  const map = new Map<string, MorphoLiveEntry>();
  for (const [id, entry] of best) {
    map.set(id, { apy: entry.apy, borrowApy: entry.borrowApy, lltv: entry.lltv, tvl: entry.tvl });
  }
  return map;
}

async function getVaultData(): Promise<MorphoLiveEntry | null> {
  const variables = { address: SATURN_USDC_VAULT_ADDRESS };

  const v1 = await postGraphQL<MorphoVaultV1Response>(VAULT_QUERY_V1, variables);
  const v1State = v1?.data?.vaultByAddress?.state;
  const v1Apy = v1State?.avgNetApy ?? v1State?.avgNetApyExcludingRewards;
  if (typeof v1Apy === "number") {
    return { apy: round2(v1Apy * 100), tvl: v1State?.totalAssetsUsd };
  }

  const v2 = await postGraphQL<MorphoVaultV2Response>(VAULT_QUERY_V2, variables);
  const v2Vault = v2?.data?.vaultV2ByAddress;
  const v2Apy = v2Vault?.avgNetApy ?? v2Vault?.avgNetApyExcludingRewards;
  if (typeof v2Apy === "number") {
    return { apy: round2(v2Apy * 100), tvl: v2Vault?.totalAssetsUsd };
  }

  return null;
}

export async function getMorphoLiveData(): Promise<Map<string, MorphoLiveEntry>> {
  const [marketsMap, vault] = await Promise.all([
    getMarketsData(),
    getVaultData(),
  ]);
  // The vault is a lender-only wrapper, not a borrowable isolated market —
  // it has no borrow APY of its own.
  if (vault) marketsMap.set("morpho-saturn-usdc", vault);
  return marketsMap;
}
