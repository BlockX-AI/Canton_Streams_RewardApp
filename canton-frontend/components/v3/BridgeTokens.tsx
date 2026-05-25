'use client';

import { ArrowLeftRight, Info } from 'lucide-react';

// Bridge functionality removed — Canton DevNet uses native DAML transfers
export default function BridgeTokens() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ArrowLeftRight className="w-6 h-6 text-purple-400" /> Bridge Tokens
        </h1>
        <p className="text-provn-muted text-sm mt-1">
          Cross-chain bridging is not available on Canton DevNet
        </p>
      </div>

      <div className="rounded-2xl bg-provn-surface border border-provn-border p-8 text-center">
        <Info className="w-8 h-8 text-blue-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
        <p className="text-provn-muted text-sm max-w-md mx-auto">
          Canton Network uses native DAML token transfers. Cross-network bridging
          will be available when Canton connects to external ledgers.
        </p>
      </div>
    </div>
  );
}
