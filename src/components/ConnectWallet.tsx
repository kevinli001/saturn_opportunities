"use client";

import { useEffect, useRef, useState } from "react";
import { KycButton } from "./KycButton";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type Status =
  | "disconnected"
  | "connectPrompt" // connect modal shown
  | "connecting" // wallet connect popup open
  | "unverified" // connected, verify modal shown
  | "verifying" // signature popup open
  | "verified";

const SIGN_MESSAGE =
  "Welcome to Saturn.\n\nSign this message to verify you own this wallet. " +
  "It is free, gas-less, and does not authorize any transactions.";

// Persist the verified wallet so a reconnect isn't needed on every reload.
// Restored on mount only if the wallet is still connected to this account.
const CACHE_KEY = "saturn_connected_wallet";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function WalletModal({
  title,
  subtitle,
  address,
  body,
  error,
  primaryLabel,
  busyLabel,
  busy,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  subtitle: string;
  address?: string | null;
  body: string;
  error?: string | null;
  primaryLabel: string;
  busyLabel: string;
  busy: boolean;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-8 text-foreground shadow-xl">
        <span className="mb-4 inline-flex h-1.5 w-8 rounded-full bg-primary" />
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{subtitle}</p>

        {address && (
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted">
              Connected wallet
            </span>
            <span className="font-tabular text-sm font-bold">
              {truncateAddress(address)}
            </span>
          </div>
        )}

        <p className="mt-5 text-sm leading-relaxed text-muted">{body}</p>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onSecondary}
            disabled={busy}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {secondaryLabel}
          </button>
          <button
            onClick={onPrimary}
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? busyLabel : primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConnectWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<Status>(status);
  statusRef.current = status;

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  // Restore a cached verified session on load (only if the wallet is still
  // connected to the same account), and drop it if the account changes away.
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const next = (accounts as string[])[0];
        const cached = localStorage.getItem(CACHE_KEY);
        if (next && cached && cached === next.toLowerCase()) {
          setAddress(next);
          setStatus("verified");
        }
      })
      .catch(() => {});

    const onAccountsChanged = (...args: unknown[]) => {
      // Only react to changes on an established verified session — don't
      // interrupt an in-progress connect/verify flow.
      if (statusRef.current !== "verified") return;
      const next = (args[0] as string[])[0] ?? null;
      const cached = localStorage.getItem(CACHE_KEY);
      if (next && cached === next.toLowerCase()) return;
      localStorage.removeItem(CACHE_KEY);
      setAddress(null);
      setStatus("disconnected");
      setError(null);
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    return () => window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
  }, []);

  // Open the connect modal (no wallet call yet).
  function openConnect() {
    setError(null);
    setStatus("connectPrompt");
  }

  // Step 1 — connect the wallet (triggers the wallet's connect popup).
  async function doConnect() {
    if (!window.ethereum) {
      setError("No browser wallet found. Install MetaMask or a similar wallet.");
      return;
    }
    setStatus("connecting");
    setError(null);
    try {
      // Force the wallet's account-selection popup every time, even if the
      // site is already connected. Fall back for wallets without this method.
      try {
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permErr) {
        if ((permErr as { code?: number })?.code === 4001) {
          setError("Connection request was rejected.");
          setStatus("connectPrompt");
          return;
        }
      }

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const next = accounts[0];
      if (!next) {
        setStatus("connectPrompt");
        return;
      }
      setAddress(next);
      setStatus("unverified");
    } catch {
      setError("Connection request was rejected.");
      setStatus("connectPrompt");
    }
  }

  // Step 2 — verify ownership by signing a message.
  async function doVerify() {
    if (!window.ethereum || !address) return;
    setStatus("verifying");
    setError(null);
    try {
      await window.ethereum.request({
        method: "personal_sign",
        params: [SIGN_MESSAGE, address],
      });
      localStorage.setItem(CACHE_KEY, address.toLowerCase());
      setStatus("verified");
    } catch {
      setError("Signature was rejected. Sign the message to verify ownership.");
      setStatus("unverified");
    }
  }

  function reset() {
    localStorage.removeItem(CACHE_KEY);
    setAddress(null);
    setStatus("disconnected");
    setError(null);
    setMenuOpen(false);
  }

  // Verified — show the KYC button plus the address with a disconnect menu.
  if (status === "verified" && address) {
    return (
      <div className="flex items-center gap-2">
        <KycButton address={address} />
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 whitespace-nowrap border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-foreground transition-colors hover:border-primary/50"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            {truncateAddress(address)}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+4px)] w-full min-w-max border border-border bg-surface shadow-lg">
              <button
                onClick={reset}
                className="whitespace-nowrap px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-danger transition-colors hover:bg-surface-2"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const showConnectModal = status === "connectPrompt" || status === "connecting";
  const showVerifyModal = status === "unverified" || status === "verifying";

  return (
    <>
      <button
        onClick={openConnect}
        className="flex items-center gap-1.5 whitespace-nowrap border border-border px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-muted transition-colors hover:border-primary/50 hover:text-foreground"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        Connect Wallet
      </button>

      {showConnectModal && (
        <WalletModal
          title="Connect wallet"
          subtitle="Step 1 of 2 — connect your wallet to Saturn."
          body="You'll approve the connection in your wallet. Saturn only reads your public address — it can't move any funds."
          error={error}
          primaryLabel="Connect"
          busyLabel="Check your wallet…"
          busy={status === "connecting"}
          onPrimary={doConnect}
          secondaryLabel="Cancel"
          onSecondary={reset}
        />
      )}

      {showVerifyModal && address && (
        <WalletModal
          title="Verify ownership"
          subtitle="Step 2 of 2 — prove you own this wallet."
          address={address}
          body="Sign a message to prove you control this wallet. It's free, gas-less, and does not authorize any transactions."
          error={error}
          primaryLabel="Sign message"
          busyLabel="Check your wallet…"
          busy={status === "verifying"}
          onPrimary={doVerify}
          secondaryLabel="Disconnect"
          onSecondary={reset}
        />
      )}
    </>
  );
}
