"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { FramedButton } from "./FramedButton";

interface LaunchedSdk {
  launch: (container: string | HTMLElement) => void;
  destroy: () => void;
}

// Dynamic handles connect + the sign-in signature (steps merged), then we run
// the Sumsub identity check against the connected wallet.
type Phase = "auth" | "checking" | "kyc" | "onboarded" | "error";

const STEPS = ["Connect", "Verify", "Identity"] as const;

export function KycFlow() {
  const isLoggedIn = useIsLoggedIn();
  const { primaryWallet, setShowAuthFlow } = useDynamicContext();
  const address = primaryWallet?.address ?? null;

  const [phase, setPhase] = useState<Phase>("auth");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Step progression: Connect → Verify → Identity. A connected-but-not-yet-
  // authenticated wallet (signature pending) sits on "Verify".
  const activeStep =
    phase === "onboarded"
      ? 3
      : phase !== "auth"
        ? 2
        : primaryWallet
          ? 1
          : 0;

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

  // React to Dynamic auth state: once a wallet is signed in, run the status
  // check; if the user disconnects, return to the connect step.
  useEffect(() => {
    if (isLoggedIn && address && phase === "auth") {
      setPhase("checking");
      checkStatus(address);
    } else if (!isLoggedIn && phase !== "auth") {
      setPhase("auth");
      setError(null);
    }
  }, [isLoggedIn, address, phase, checkStatus]);

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
    };
  }, [phase, address, getToken, checkStatus]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-1.5 border-b border-border px-4 py-4 sm:justify-start sm:gap-2 sm:px-6">
        {STEPS.map((label, i) => {
          const active = i === activeStep;
          const done = i < activeStep;
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
        {/* Step 1 — connect + sign, handled by Dynamic */}
        {phase === "auth" && (
          <div className="py-6 text-center">
            <h1 className="text-2xl font-bold">Verify your identity</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              Connect your wallet to begin. You will confirm ownership with a free
              signature, then complete a brief identity check.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <FramedButton onClick={() => setShowAuthFlow(true)}>
                Connect Wallet
              </FramedButton>
            </div>
          </div>
        )}

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
                if (address) {
                  setPhase("checking");
                  checkStatus(address);
                } else {
                  setPhase("auth");
                  setShowAuthFlow(true);
                }
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
