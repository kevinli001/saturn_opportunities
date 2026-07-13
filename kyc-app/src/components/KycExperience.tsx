"use client";

import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { KycFlow } from "./KycFlow";
import { KycNav } from "./KycNav";

// Public (client-exposed) Dynamic environment id. Override per deploy via
// NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID (production id in the production project);
// falls back to the pre-production environment for local/dev.
const DYNAMIC_ENV_ID =
  process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ??
  "7033dc64-845b-4405-a6e6-05b118cf68f4";

export function KycExperience() {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: DYNAMIC_ENV_ID,
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <div>
        <KycNav />

        {/* Hero banner */}
        <div className="bg-ink text-white">
          <div className="tick-ruler" />
          <div className="px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Individual KYC Process
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Complete identity verification for full access to Saturn.
            </p>
          </div>
          <div className="tick-ruler" />
        </div>

        {/* Flow */}
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
          <KycFlow />
        </div>
      </div>
    </DynamicContextProvider>
  );
}
