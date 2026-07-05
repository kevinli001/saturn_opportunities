import type { AssetSymbol, Protocol } from "./types";

export const assetMeta: Record<
  AssetSymbol,
  { label: string; color: string; description: string }
> = {
  USDat: {
    label: "USDat",
    color: "var(--asset-usdat)",
    description: "Stablecoin fully backed by tokenized U.S. Treasuries.",
  },
  sUSDat: {
    label: "sUSDat",
    color: "var(--asset-susdat)",
    description:
      "Staked USDat — a yield-bearing vault token backed by Saturn's STRC digital credit holdings.",
  },
  srUSDat: {
    label: "srUSDat",
    color: "var(--asset-srusdat)",
    description:
      "Strata Senior tranche of sUSDat — targets a reduced, more stable share of the STRC dividend rate.",
  },
  jrUSDat: {
    label: "jrUSDat",
    color: "var(--asset-jrusdat)",
    description:
      "Strata Junior tranche of sUSDat — absorbs shortfalls first in exchange for a higher, more variable yield.",
  },
};

export const assetSymbols: AssetSymbol[] = [
  "USDat",
  "sUSDat",
  "srUSDat",
  "jrUSDat",
];

export const protocolMeta: Record<
  Protocol,
  { label: string; color: string; textColor: string }
> = {
  Saturn: { label: "Saturn", color: "var(--ink)", textColor: "#ffffff" },
  Pendle: { label: "Pendle", color: "#5628c4", textColor: "#ffffff" },
  Curve: { label: "Curve", color: "#101113", textColor: "#f7d51e" },
  PancakeSwap: { label: "PancakeSwap", color: "#633001", textColor: "#f0b90b" },
  Morpho: { label: "Morpho", color: "#1b3a6b", textColor: "#ffffff" },
};

export const protocols: Protocol[] = [
  "Saturn",
  "Pendle",
  "Curve",
  "PancakeSwap",
  "Morpho",
];
