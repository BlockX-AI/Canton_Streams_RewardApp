'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@/lib/wallet-context';

export const PROGRAM_IDS: Record<string, string> = {
  streamCore: 'canton::stream::core',
  tokenVault: 'canton::vault::core',
  growToken: 'canton::token::cc',
};

export function useGearSign() {
  const { partyId } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signAndSend = useCallback(async (..._args: any[]) => {
    setLoading(true);
    setError(null);
    try {
      console.warn('[useGearSign] Use Canton backend API instead');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { signAndSend, loading, error, account: partyId ? { decodedAddress: partyId } : null };
}

export function useStreamActions() {
  const { signAndSend, loading, error, account } = useGearSign();
  const createStream = async (..._args: any[]) => null;
  const cancelStream = async (_streamId: string | number) => null;
  const pauseStream = async (_streamId: string | number) => null;
  const resumeStream = async (_streamId: string | number) => null;
  const stopStream = async (_streamId: string | number) => null;
  const withdrawFromStream = async (_streamId: string | number, _amount?: string) => null;
  const liquidateStream = async (_streamId: string | number) => null;
  const depositToStream = async (_streamId: string | number, _amount: string) => null;
  return { createStream, cancelStream, pauseStream, resumeStream, stopStream, withdrawFromStream, liquidateStream, depositToStream, loading, error, account };
}

export function useVaultActions() {
  const { loading, error } = useGearSign();
  const depositTokens = async (_token: string, _amount: string) => null;
  const withdrawTokens = async (_token: string, _amount: string) => null;
  const depositNative = async (_amount: string) => null;
  const withdrawNative = async (_amount: string) => null;
  return { depositTokens, withdrawTokens, depositNative, withdrawNative, loading, error };
}

export function useSplitsActions() {
  const { loading, error } = useGearSign();
  const createGroup = async (_recipients: { address: string; weight: number }[]) => null;
  const distribute = async (_groupId: string, _token: string, _amount: string) => null;
  const deleteGroup = async (_groupId: string) => null;
  return { createGroup, distribute, deleteGroup, loading, error };
}

export function useBountyActions() {
  const { loading, error } = useGearSign();
  const createBounty = async (..._args: any[]) => null;
  const claimBounty = async (..._args: any[]) => null;
  const completeBounty = async (..._args: any[]) => null;
  return { createBounty, claimBounty, completeBounty, loading, error };
}

export function usePermissionActions() {
  const { loading, error } = useGearSign();
  const grantPermission = async (_grantee: string, _scope: string) => null;
  const revokePermission = async (_grantee: string, _scope: string) => null;
  return { grantPermission, revokePermission, loading, error };
}

export function useGrowTokenActions() {
  const { loading, error } = useGearSign();
  const approve = async (_spender: string, _amount: string) => null;
  const transfer = async (_to: string, _amount: string) => null;
  const mint = async (_to: string, _amount: string) => null;
  return { approve, transfer, mint, loading, error };
}

export function useIdentityActions() {
  const { loading, error } = useGearSign();
  const bindIdentity = async (..._args: any[]) => null;
  return { bindIdentity, loading, error };
}
