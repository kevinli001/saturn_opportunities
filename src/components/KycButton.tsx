"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type KycState =
  | "unknown"
  | "notConfigured"
  | "notStarted"
  | "pending"
  | "onboarded";

interface LaunchedSdk {
  launch: (container: string | HTMLElement) => void;
  destroy: () => void;
}

// Ownership must be re-proven immediately before KYC, separate from the
// initial connect-time verification.
const KYC_SIGN_MESSAGE =
  "Confirm wallet ownership to begin identity verification with Saturn.\n\n" +
  "This signature is free, gas-less, and does not authorize any transactions.";

export function KycButton({ address }: { address: string }) {
  const [state, setState] = useState<KycState>("unknown");
  const [open, setOpen] = useState(false);
  const [reverified, setReverified] = useState(false);
  const [signing, setSigning] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkRef = useRef<LaunchedSdk | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/kyc/status?address=${address}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.configured) return setState("notConfigured");
      if (data.onboarded) return setState("onboarded");
      return setState(data.notStarted ? "notStarted" : "pending");
    } catch {
      setState("notConfigured");
    }
  }, [address]);

  const getToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/kyc/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    if (!res.ok) throw new Error("token request failed");
    const { token } = await res.json();
    return token as string;
  }, [address]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  // Launch the Sumsub Web SDK — only after ownership is re-proven this session.
  useEffect(() => {
    if (!open || !reverified) return;
    let cancelled = false;
    let instance: LaunchedSdk | null = null;

    (async () => {
      setLaunching(true);
      setError(null);
      try {
        const token = await getToken();
        if (cancelled || !containerRef.current) return;
        const snsWebSdk = (await import("@sumsub/websdk")).default;
        if (cancelled || !containerRef.current) return;

        instance = snsWebSdk
          .init(token, () => getToken())
          .withConf({ lang: "en" })
          .withOptions({ addViewportTag: false, adaptIframeHeight: true })
          .onMessage((type: string) => {
            if (
              type === "idCheck.onApplicantSubmitted" ||
              type === "idCheck.onApplicantStatusChanged" ||
              type === "idCheck.applicantReviewComplete" ||
              type === "idCheck.onApplicantReviewComplete"
            ) {
              refreshStatus();
            }
          })
          .on("idCheck.onError", () => {
            if (!cancelled) setError("Verification error. Please try again.");
          })
          .build();

        sdkRef.current = instance;
        instance.launch(containerRef.current);
      } catch {
        if (!cancelled) setError("Couldn't start verification. Please try again.");
      } finally {
        if (!cancelled) setLaunching(false);
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
  }, [open, reverified, getToken, refreshStatus]);

  function startKyc() {
    setError(null);
    setReverified(false);
    setOpen(true);
  }

  // Re-prove ownership, then the effect above launches the SDK.
  async function reverifyOwnership() {
    if (!window.ethereum) {
      setError("No browser wallet found.");
      return;
    }
    setSigning(true);
    setError(null);
    try {
      await window.ethereum.request({
        method: "personal_sign",
        params: [KYC_SIGN_MESSAGE, address],
      });
      setReverified(true);
    } catch {
      setError("Signature declined. Confirm ownership to start verification.");
    } finally {
      setSigning(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setReverified(false);
    setError(null);
    refreshStatus();
  }

  // Onboarded — static chip, no action.
  if (state === "onboarded") {
    return (
      <div className="flex items-center gap-1.5 whitespace-nowrap border border-secondary/40 bg-secondary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-secondary">
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Onboarded
      </div>
    );
  }

  return (
    <>
      <button
        onClick={startKyc}
        disabled={state === "notConfigured"}
        title={
          state === "notConfigured"
            ? "KYC is not configured yet"
            : "Complete identity verification"
        }
        className="flex items-center gap-1.5 whitespace-nowrap border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted transition-colors hover:border-primary/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {state === "pending" ? "KYC pending" : "KYC"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl bg-surface shadow-xl ${
              reverified ? "max-w-xl" : "max-w-md"
            }`}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
                Identity verification
              </h2>
              <button
                onClick={closeModal}
                aria-label="Close"
                className="text-muted transition-colors hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 ${reverified ? "min-h-[500px]" : ""}`}>
              {/* Step 1 — re-prove ownership before starting KYC. */}
              {!reverified && (
                <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    {signing ? (
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Confirm ownership</h3>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                      Sign a message to confirm you own this wallet before starting
                      identity verification. It&apos;s free and does not authorize any
                      transactions.
                    </p>
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <button
                    onClick={reverifyOwnership}
                    disabled={signing}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {signing ? "Check your wallet…" : "Sign to continue"}
                  </button>
                </div>
              )}

              {/* Step 2 — the Sumsub flow. */}
              {reverified && (
                <>
                  {launching && (
                    <div className="flex h-[480px] items-center justify-center">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                  )}
                  {error && (
                    <div className="flex h-[480px] flex-col items-center justify-center gap-4 text-center">
                      <p className="text-sm text-danger">{error}</p>
                      <button
                        onClick={closeModal}
                        className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-2"
                      >
                        Close
                      </button>
                    </div>
                  )}
                  <div id="sumsub-websdk-container" ref={containerRef} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
