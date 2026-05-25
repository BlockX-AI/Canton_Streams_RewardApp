'use client';

import { useWallet } from '@/lib/wallet-context';

// Vara NFT contract removed — Canton DevNet uses backend API for NFTs
export function useVaraNFT() {
  const { partyId } = useWallet();

  const mintScorecardNFT = async (_scoreData: any) => {
    console.warn('[useVaraNFT] NFT minting not yet implemented on Canton');
    return null;
  };

  const transferNFT = async (..._args: any[]) => null;

  return {
    mintScorecardNFT,
    transferNFT,
    isMinting: false,
    isTransferring: false,
    mintError: null,
    transferError: null,
    isConnected: !!partyId,
  };
}
