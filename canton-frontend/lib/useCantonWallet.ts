"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    canton?: {
      requestParties?: () => Promise<string[]>;
    };
  }
}

export type WalletStatus =
  | "idle"
  | "no_extension"
  | "connecting"
  | "connected"
  | "error";

export interface CantonWalletState {
  status: WalletStatus;
  partyId: string | null;
  allParties: string[];
  extensionFound: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  setManualParty: (party: string) => void;
  error: string | null;
}

const STORAGE_KEY = "gs_party_id";

export function useCantonWallet(): CantonWalletState {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [allParties, setAllParties] = useState<string[]>([]);
  const [extensionFound, setExtensionFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasExtension = typeof window.canton !== "undefined";
    setExtensionFound(hasExtension);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPartyId(saved);
      setStatus("connected");
    } else {
      setStatus(hasExtension ? "idle" : "no_extension");
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;
    setStatus("connecting");
    setError(null);

    if (window.canton?.requestParties) {
      try {
        const ids = await window.canton.requestParties();
        setAllParties(ids);
        const first = ids[0] ?? null;
        setPartyId(first);
        if (first) {
          localStorage.setItem(STORAGE_KEY, first);
          setStatus("connected");
        } else {
          setError("No parties found in connected wallet.");
          setStatus("error");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Wallet connection failed: ${msg}`);
        setStatus("error");
      }
    } else {
      setStatus("no_extension");
    }
  }, []);

  const disconnect = useCallback(() => {
    setPartyId(null);
    setAllParties([]);
    setStatus(extensionFound ? "idle" : "no_extension");
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [extensionFound]);

  const setManualParty = useCallback((party: string) => {
    const trimmed = party.trim();
    if (!trimmed) return;
    setPartyId(trimmed);
    setAllParties([trimmed]);
    setStatus("connected");
    setError(null);
    localStorage.setItem(STORAGE_KEY, trimmed);
  }, []);

  return {
    status,
    partyId,
    allParties,
    extensionFound,
    connect,
    disconnect,
    setManualParty,
    error,
  };
}
