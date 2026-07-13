"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FramedButton } from "./FramedButton";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface LaunchedSdk {
  launch: (container: string | HTMLElement) => void;
  destroy: () => void;
}

type Phase =
  | "connect"
  | "connecting"
  | "verify"
  | "verifying"
  | "checking"
  | "kyc"
  | "onboarded"
  | "error";

function truncateAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** EIP-4361 (Sign-In with Ethereum) formatted message. */
function buildSignMessage(address: string, chainId: number): string {
  const domain = window.location.host;
  const uri = window.location.origin;
  const issuedAt = new Date();
  const expirationTime = new Date(issuedAt.getTime() + 10 * 60 * 1000);

  return [
    `${domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Saturn",
    "",
    `URI: ${uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${randomNonce()}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expirationTime.toISOString()}`,
  ].join("\n");
}

const STEPS = ["Connect", "Verify", "Identity"] as const;

function stepIndex(phase: Phase): number {
  if (phase === "connect" || phase === "connecting") return 0;
  if (phase === "verify" || phase === "verifying") return 1;
  return 2; // checking / kyc / onboarded
}

export function KycFlow({
  onAddress,
}: {
  onAddress?: (address: string | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("connect");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<LaunchedSdk | null>(null);

  const getToken = useCallback(async (addr: string): Promise<string> => {
    const res = await fetch("/api/kyc/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addr }),
    });
    if (!res.ok) throw new Error("token request failed");
    const { token } = await res.json();
    return token as string;
  }, []);

  const checkStatus = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`/api/kyc/status?address=${addr}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.configured) {
        setError("Identity verification isn't configured yet. Contact the Saturn team.");
        setPhase("error");
        return;
      }
      if (data.onboarded) {
        setPhase("onboarded");
        return;
      }
      setPhase("kyc");
    } catch {
      setError("Couldn't check verification status. Please try again.");
      setPhase("error");
    }
  }, []);

  async function connect() {
    if (!window.ethereum) {
      setError("No browser wallet found. Open this page in a wallet browser or install MetaMask.");
      setPhase("error");
      return;
    }
    setPhase("connecting");
    setError(null);
    try {
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permErr) {
        if ((permErr as { code?: number })?.code === 4001) {
          setError("Connection request was rejected.");
          setPhase("connect");
          return;
        }
      }
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const next = accounts[0];
      if (!next) {
        setPhase("connect");
        return;
      }
      setAddress(next);
      onAddress?.(next);
      setPhase("verify");
    } catch {
      setError("Connection request was rejected.");
      setPhase("connect");
    }
  }

  async function verify() {
    if (!window.ethereum || !address) return;
    setPhase("verifying");
    setError(null);
    try {
      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      const chainId = parseInt(chainIdHex, 16);
      await window.ethereum.request({
        method: "personal_sign",
        params: [buildSignMessage(address, chainId), address],
      });
      setPhase("checking");
      await checkStatus(address);
    } catch {
      setError("Signature was rejected. Sign the message to verify ownership.");
      setPhase("verify");
    }
  }

  // Launch the Sumsub Web SDK once we reach the KYC phase.
  useEffect(() => {
    if (phase !== "kyc" || !address) return;
    let cancelled = false;
    let instance: LaunchedSdk | null = null;

    (async () => {
      try {
        const token = await getToken(address);
        if (cancelled || !containerRef.current) return;
        const snsWebSdk = (await import("@sumsub/websdk")).default;
        if (cancelled || !containerRef.current) return;

        instance = snsWebSdk
          .init(token, () => getToken(address))
          .withConf({ lang: "en", theme: "light" })
          .withOptions({ addViewportTag: false, adaptIframeHeight: true })
          .onMessage((type: string) => {
            if (
              type === "idCheck.onApplicantSubmitted" ||
              type === "idCheck.onApplicantStatusChanged" ||
              type === "idCheck.applicantReviewComplete" ||
              type === "idCheck.onApplicantReviewComplete"
            ) {
              checkStatus(address);
            }
          })
          .on("idCheck.onError", () => {
            if (!cancelled) {
              setError("Verification error. Please refresh and try again.");
              setPhase("error");
            }
          })
          .build();

        sdkRef.current = instance;
        instance.launch(containerRef.current);
      } catch {
        if (!cancelled) {
          setError("Couldn't start verification. Please try again.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        instance?.destroy();
      } catch {
        /* no-op */
      }
      sdkRef.current = null;
    };
  }, [phase, address, getToken, checkStatus]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-1.5 border-b border-border px-4 py-4 sm:justify-start sm:gap-2 sm:px-6">
        {STEPS.map((label, i) => {
          const active = i === stepIndex(phase);
          const done = i < stepIndex(phase) || phase === "onboarded";
          return (
            <div key={label} className="flex items-center gap-1.5 sm:gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-secondary text-white"
                    : active
                      ? "bg-primary text-white"
                      : "bg-surface-2 text-muted"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wide sm:text-[11px] sm:tracking-widest ${
                  active || done ? "text-foreground" : "text-muted"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-0.5 h-px w-3 bg-border sm:mx-1 sm:w-6" />
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 sm:p-8">
        {/* Step 1 — connect */}
        {(phase === "connect" || phase === "connecting") && (
          <div className="py-6 text-center">
            <h1 className="text-2xl font-bold">Verify your identity</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Connect your wallet to begin. You will confirm ownership with a free
              signature, then complete a brief identity check.
            </p>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <div className="mx-auto mt-8 max-w-md">
              <FramedButton onClick={connect} disabled={phase === "connecting"}>
                {phase === "connecting" ? "Check your wallet…" : "Connect Wallet"}
              </FramedButton>
            </div>
          </div>
        )}

        {/* Step 2 — verify ownership */}
        {(phase === "verify" || phase === "verifying") && address && (
          <div className="py-6 text-center">
            <h1 className="text-2xl font-bold">Verify ownership</h1>
            <div className="mx-auto mt-4 inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {truncateAddress(address)}
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
              Your wallet is connected but not yet verified. Sign a quick message
              to prove you own it and continue. It&apos;s free and does not submit
              a transaction.
            </p>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <div className="mx-auto mt-8 max-w-md">
              <FramedButton onClick={verify} disabled={phase === "verifying"}>
                {phase === "verifying" ? "Check your wallet…" : "Sign to continue"}
              </FramedButton>
            </div>
          </div>
        )}

        {/* Step 3 — checking / KYC / done */}
        {phase === "checking" && (
          <div className="flex h-[300px] items-center justify-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        )}

        {phase === "kyc" && <div id="sumsub-websdk-container" ref={containerRef} />}

        {phase === "onboarded" && (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-5 text-2xl font-bold">You&apos;re verified</h1>
            {address && (
              <p className="mt-2 font-tabular text-sm text-muted">{truncateAddress(address)}</p>
            )}
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Identity verification is complete for this wallet. You should be able
              to mint and redeem USDat within 48 hours. You can close this page.
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="py-10 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setPhase(address ? "verify" : "connect");
              }}
              className="mt-5 rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-2"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
