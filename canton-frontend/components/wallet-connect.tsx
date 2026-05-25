'use client';

import { Waves } from 'lucide-react';
import { useWallet } from '@/lib/wallet-context';

export default function WalletConnect() {
  const { partyId } = useWallet();

  return (
    <div className="min-h-screen bg-provn-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
          <Waves className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-provn-text mb-2">GrowStreams</h1>
        <p className="text-provn-muted text-sm mb-4">
          {partyId ? `Connected: ${partyId.slice(0, 12)}…` : 'Connect your Canton wallet to start streaming'}
        </p>
        <p className="text-center text-xs text-provn-muted mt-6">Canton DevNet</p>
      </div>
    </div>
  );
}
