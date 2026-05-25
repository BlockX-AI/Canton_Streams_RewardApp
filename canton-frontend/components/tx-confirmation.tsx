"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CANTONSCAN =
  "https://scan.sv-2.dev.global.canton.network.digitalasset.com";

export interface TxResult {
  txHash?: string;
  ccAmount?: number;
  action?: string;
  contractId?: string;
}

interface TxConfirmationProps {
  open: boolean;
  onClose: () => void;
  result: TxResult | null;
}

export function TxConfirmation({
  open,
  onClose,
  result,
}: TxConfirmationProps): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result?.txHash) return;
    try {
      await navigator.clipboard.writeText(result.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available in some environments
    }
  };

  return (
    <AnimatePresence>
      {open && result && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50"
            aria-hidden
          />

          {/* Panel — slides up from bottom, anchors bottom-right on md+ */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label="Transaction confirmed"
            className="fixed bottom-0 left-0 right-0 z-50 md:left-auto md:right-6 md:bottom-6 md:w-[22rem]"
          >
            <div className="bg-neutral-900 border border-white/12 rounded-t-2xl md:rounded-2xl p-6 shadow-2xl">

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22, delay: 0.1 }}
                  className="w-10 h-10 rounded-full bg-emerald-400/15 border border-emerald-400/35 flex items-center justify-center shrink-0"
                >
                  <span className="text-emerald-400 text-base leading-none">✓</span>
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-white">Transaction Confirmed</p>
                  <p className="text-xs text-white/40 capitalize mt-0.5">
                    {result.action ?? "Claim"} on Canton DevNet
                  </p>
                </div>
              </div>

              {/* CC amount */}
              {result.ccAmount !== undefined && (
                <div className="p-4 rounded-xl bg-black/30 border border-white/[0.07] mb-4 text-center">
                  <p className="text-[2rem] leading-none font-mono font-medium text-cyan-300 tabular-nums">
                    {result.ccAmount.toFixed(4)}
                  </p>
                  <p className="text-[10px] font-mono text-white/30 mt-1.5 uppercase tracking-wider">
                    CC transferred on-chain
                  </p>
                </div>
              )}

              {/* Tx hash */}
              {result.txHash && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.05] border border-white/10 mb-4">
                  <code className="flex-1 font-mono text-[10px] text-white/45 truncate min-w-0">
                    {result.txHash}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium text-white/40 hover:text-white/75 hover:bg-white/10 transition-colors"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {result.txHash && (
                  <a
                    href={`${CANTONSCAN}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 border border-cyan-400/30 rounded-xl text-cyan-300 text-xs text-center hover:bg-cyan-400/10 transition-colors"
                  >
                    Cantonscan ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`${
                    result.txHash ? "" : "flex-1 "
                  }py-2.5 px-5 bg-white text-neutral-900 rounded-xl text-xs font-semibold hover:bg-white/90 transition-colors`}
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
