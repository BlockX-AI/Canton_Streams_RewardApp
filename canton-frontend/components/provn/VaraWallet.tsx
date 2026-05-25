'use client';

import { useWallet } from '@/lib/wallet-context';

export function VaraWallet() {
  const { partyId } = useWallet();

  if (!partyId) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-provn-muted font-mono">
      {partyId.slice(0, 8)}…{partyId.slice(-4)}
    </div>
  );
}
