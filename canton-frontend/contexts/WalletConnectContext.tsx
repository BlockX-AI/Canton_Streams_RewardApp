'use client';

import {
  createContext,
  useContext,
  ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface WCState {
  /** Whether a WalletConnect session is active */
  isConnected: boolean;
  /** True while the QR modal is open / waiting for approval */
  isConnecting: boolean;
  /** Start WalletConnect flow (shows QR modal) */
  connect: () => Promise<void>;
  /** Tear down the WC session */
  disconnect: () => Promise<void>;
  /** Error from last attempt, if any */
  error: string | null;
}

const WalletConnectContext = createContext<WCState>({
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
  error: null,
});

export const useWalletConnect = () => useContext(WalletConnectContext);

// WalletConnect removed for Canton DevNet — uses Canton wallet extension instead
export function WalletConnectProvider({ children }: { children: ReactNode }) {
  return (
    <WalletConnectContext.Provider
      value={{ isConnected: false, isConnecting: false, connect: async () => {}, disconnect: async () => {}, error: null }}
    >
      {children}
    </WalletConnectContext.Provider>
  );
}
