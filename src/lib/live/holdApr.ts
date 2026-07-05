import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const RPC_URL = "https://ethereum.publicnode.com";
const SUSDAT_ADDRESS = "0xD166337499E176bbC38a1FBd113Ab144e5bd2Df7";
const STRC_ORACLE_ADDRESS = "0xf4d2076277fff631EFC4385Ab36b1f7734218d23";
const SRUSDAT_ADDRESS = "0xfaa9a0e1db9e22ae3a20b2b58a68dc24d053d066";
const JRUSDAT_ADDRESS = "0x011e55d2b28306458e37ca7e997c879bb25a455d";

// Raw on-chain units: STRC rewards and the USDat they're valued against both use 6 decimals.
const STRC_DECIMALS = 6;
const ASSET_DECIMALS = 6;
const SECONDS_PER_YEAR = 365 * 86400;

// srUSDat is a fixed-rate senior tranche; jrUSDat absorbs the residual, levered
// by the senior/junior TVL ratio.
const SR_FIXED_APY = 7.78;

const VAULT_ABI = [
  { type: "function", name: "vestingAmount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "vestingPeriod", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const ORACLE_ABI = [
  { type: "function", name: "latestAnswer", stateMutability: "view", inputs: [], outputs: [{ type: "int256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const TRANCHE_ABI = [
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// multicall batching collapses the 7 reads below (all issued in one tick via
// Promise.all) into a single multicall3 eth_call — one RPC round-trip instead
// of seven.
const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
  batch: { multicall: true },
});

export interface HoldAprLiveEntry {
  apy: number;
  tvl: number;
}

/**
 * sUSDat's yield comes from STRC rewards that vest linearly over `vestingPeriod`
 * seconds. APR = (vestingAmount in STRC, annualized) * STRC/USD price / vault TVL.
 * srUSDat/jrUSDat are Strata tranches on top of sUSDat: srUSDat is fixed at
 * SR_FIXED_APY, and jrUSDat absorbs the spread between sUSDat's yield and the
 * senior rate, levered by the senior/junior TVL ratio.
 * Every fetch reads directly on-chain — no estimate.
 */
export async function getHoldAprLiveData(): Promise<Map<string, HoldAprLiveEntry>> {
  const result = new Map<string, HoldAprLiveEntry>();

  try {
    const [vestingAmount, vestingPeriod, totalAssets, strcPriceRaw, strcPriceDecimals, srTotalAssets, jrTotalAssets] =
      await Promise.all([
        client.readContract({ address: SUSDAT_ADDRESS, abi: VAULT_ABI, functionName: "vestingAmount" }),
        client.readContract({ address: SUSDAT_ADDRESS, abi: VAULT_ABI, functionName: "vestingPeriod" }),
        client.readContract({ address: SUSDAT_ADDRESS, abi: VAULT_ABI, functionName: "totalAssets" }),
        client.readContract({ address: STRC_ORACLE_ADDRESS, abi: ORACLE_ABI, functionName: "latestAnswer" }),
        client.readContract({ address: STRC_ORACLE_ADDRESS, abi: ORACLE_ABI, functionName: "decimals" }),
        client.readContract({ address: SRUSDAT_ADDRESS, abi: TRANCHE_ABI, functionName: "totalAssets" }),
        client.readContract({ address: JRUSDAT_ADDRESS, abi: TRANCHE_ABI, functionName: "totalAssets" }),
      ]);

    if (vestingPeriod === BigInt(0) || totalAssets === BigInt(0)) return result;

    const vestingAmountStrc = Number(vestingAmount) / 10 ** STRC_DECIMALS;
    const totalAssetsUsd = Number(totalAssets) / 10 ** ASSET_DECIMALS;
    const strcPriceUsd = Number(strcPriceRaw) / 10 ** strcPriceDecimals;

    const annualizedRewardUsd =
      vestingAmountStrc * strcPriceUsd * (SECONDS_PER_YEAR / Number(vestingPeriod));
    const susdatApy = (annualizedRewardUsd / totalAssetsUsd) * 100;

    result.set("hold-susdat", { apy: susdatApy, tvl: totalAssetsUsd });

    const srTvl = Number(srTotalAssets) / 10 ** ASSET_DECIMALS;
    const jrTvl = Number(jrTotalAssets) / 10 ** ASSET_DECIMALS;

    result.set("hold-srusdat", { apy: SR_FIXED_APY, tvl: srTvl });

    if (jrTvl > 0) {
      const jrApy = (susdatApy - SR_FIXED_APY) * (srTvl / jrTvl) + susdatApy;
      result.set("hold-jrusdat", { apy: jrApy, tvl: jrTvl });
    }
  } catch {
    // silent fallback to static data
  }

  return result;
}
