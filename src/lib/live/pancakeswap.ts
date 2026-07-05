import { createPublicClient, http } from "viem";
import { bsc } from "viem/chains";

const BSC_RPC = "https://bsc-dataseed.binance.org/";

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

interface PoolConfig {
  pool: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
}

const PANCAKE_POOL_MAP: Record<string, PoolConfig> = {
  "pancake-usdat": {
    pool: "0xF80Ab3Cc041d8Ccc1c51AcC295AFdba26AD70Aa9",
    token0: "0x0Bb150DFa86EA5d7742F07FEfCD8E8edA81D64eF",
    token1: "0x55d398326f99059fF775485246999027B3197955",
  },
  "pancake-susdat": {
    pool: "0xf3396a9a79257D89f98143d8AB73da1dFF4e0e81",
    token0: "0x55d398326f99059fF775485246999027B3197955",
    token1: "0x9cd57d3685e6868cacaa8bdcaaf52cbdebf4fa25",
  },
};

export interface PancakeLiveEntry {
  tvl: number;
}

export async function getPancakeLiveData(): Promise<Map<string, PancakeLiveEntry>> {
  const map = new Map<string, PancakeLiveEntry>();
  try {
    const client = createPublicClient({
      chain: bsc,
      transport: http(BSC_RPC),
      batch: { multicall: true },
    });

    const calls: { id: string; pool: `0x${string}`; token0: `0x${string}`; token1: `0x${string}` }[] = [];
    for (const [id, cfg] of Object.entries(PANCAKE_POOL_MAP)) {
      calls.push({ id, ...cfg });
    }

    const results = await client.multicall({
      contracts: calls.flatMap((c) => [
        { address: c.token0, abi: ERC20_ABI, functionName: "balanceOf", args: [c.pool] },
        { address: c.token0, abi: ERC20_ABI, functionName: "decimals" },
        { address: c.token1, abi: ERC20_ABI, functionName: "balanceOf", args: [c.pool] },
        { address: c.token1, abi: ERC20_ABI, functionName: "decimals" },
      ]),
    });

    for (let i = 0; i < calls.length; i++) {
      const base = i * 4;
      const bal0 = results[base].result as bigint | undefined;
      const dec0 = results[base + 1].result as number | undefined;
      const bal1 = results[base + 2].result as bigint | undefined;
      const dec1 = results[base + 3].result as number | undefined;

      if (bal0 == null || dec0 == null || bal1 == null || dec1 == null) continue;

      const v0 = Number(bal0) / 10 ** dec0;
      const v1 = Number(bal1) / 10 ** dec1;
      map.set(calls[i].id, { tvl: v0 + v1 });
    }
  } catch {
    // silent fallback to static
  }
  return map;
}
