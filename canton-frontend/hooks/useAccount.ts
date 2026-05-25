'use client';

import { useWallet } from '@/lib/wallet-context';

/**
 * Compatibility shim — maps Canton wallet to the same shape
 * that Vara's useAccount() returned, so existing components
 * keep working without a full rewrite.
 */
export function useAccount() {
  const { partyId, status } = useWallet();
  return {
    account: partyId
      ? {
          decodedAddress: partyId,
          address: partyId,
          meta: { name: partyId.slice(0, 20) + '…' },
        }
      : null,
    isAccountReady: status === 'connected',
  };
}
