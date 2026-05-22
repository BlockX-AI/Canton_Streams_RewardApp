"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useCantonWallet, type CantonWalletState } from "./useCantonWallet";

const WalletContext = createContext<CantonWalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const wallet = useCantonWallet();
  return (
    <WalletContext.Provider value={wallet}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): CantonWalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside <WalletProvider>");
  return ctx;
}
