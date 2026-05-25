'use client';

import AppLayout from '@/components/app-layout';
import { useWallet } from '@/lib/wallet-context';
import { WalletModal } from '@/components/wallet-modal';
import { useState } from 'react';

const DEV_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET;

export default function AppRootLayout({ children }: { children: React.ReactNode }) {
  const { partyId, status } = useWallet();
  const [walletOpen, setWalletOpen] = useState(false);

  if (!partyId && !DEV_WALLET) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-provn-bg text-provn-text">
        <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
        <div className="text-center space-y-6 max-w-md px-6">
          <h1 className="text-3xl font-bold">Connect to Canton</h1>
          <p className="text-provn-muted">
            Connect your Canton wallet or enter a party ID to access the GrowStreams app.
          </p>
          <button
            onClick={() => setWalletOpen(true)}
            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
