'use client';

import { ReactNode } from 'react';

// Vara providers removed — Canton uses WalletProvider from lib/wallet-context
export function VaraProviders({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
