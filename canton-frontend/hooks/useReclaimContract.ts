'use client';

import { useWallet } from '@/lib/wallet-context';

// Reclaim contract removed — Canton DevNet uses backend API for proof verification
export function useReclaimContract() {
  const { partyId } = useWallet();

  const submitProofOnChain = async (_transformedProof: any) => {
    console.warn('[useReclaimContract] Proof verification not yet implemented on Canton');
    return null;
  };

  return {
    submitProofOnChain,
    isVerifying: false,
    verifyError: null,
    isConnected: !!partyId,
  };
}
