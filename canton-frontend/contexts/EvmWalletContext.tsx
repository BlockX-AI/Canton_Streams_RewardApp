'use client';

import {
  createContext,
  useContext,
  ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EvmWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  error: string | null;
}

// EVM wallet removed for Canton DevNet — uses Canton wallet extension
const defaultState: EvmWalletState = {
  address: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  isCorrectChain: false,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => {},
  error: null,
};

const EvmWalletContext = createContext<EvmWalletState>(defaultState);

export const useEvmWallet = () => useContext(EvmWalletContext);

export function EvmWalletProvider({ children }: { children: ReactNode }) {
  return (
    <EvmWalletContext.Provider value={defaultState}>
      {children}
    </EvmWalletContext.Provider>
  );
}
