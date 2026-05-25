"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface Stream {
  contract_id: string;
  sender: string;
  receiver: string;
  rate_per_second: string;
  total_deposited: string;
  total_withdrawn: string;
  accrued: string;
  status: string;
  last_settled: string;
}

export interface WithdrawResult {
  txHash?: string;
  ccAmount?: number;
}

interface StreamCardProps {
  stream: Stream;
  onWithdraw?: (contractId: string) => Promise<WithdrawResult | void>;
  onTxConfirmed?: (result: WithdrawResult) => void;
  index?: number;
}

const ease = [0.33, 1, 0.68, 1] as const;

function timeRemaining(ratePerSec: number, capCC: number, baseAccrued: number): string {
  if (ratePerSec === 0) return "∞";
  const remaining = capCC - baseAccrued;
  if (remaining <= 0) return "Depleted";
  const secs = remaining / ratePerSec;
  if (secs > 86400) return `${Math.floor(secs / 86400)}d`;
  if (secs > 3600)  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  if (secs > 60)    return `${Math.floor(secs / 60)}m`;
  return `${Math.floor(secs)}s`;
}

export function StreamCard({
  stream,
  onWithdraw,
  onTxConfirmed,
  index = 0,
}: StreamCardProps): ReactNode {
  const [withdrawing, setWithdrawing] = useState(false);
  const [txBanner, setTxBanner] = useState<string | null>(null);
  const displayRef = useRef<HTMLSpanElement>(null);

  const isActive  = stream.status === "ACTIVE";
  const rate      = parseFloat(stream.rate_per_second ?? "0");
  const deposited = parseFloat(stream.total_deposited ?? "0");
  const withdrawn = parseFloat(stream.total_withdrawn ?? "0");
  const base      = parseFloat(stream.accrued ?? "0");
  const cap       = deposited - withdrawn;

  // ── Live counter — direct DOM mutation, zero React re-renders ──
  useEffect(() => {
    if (!displayRef.current) return;

    if (!isActive || rate === 0) {
      displayRef.current.textContent = base.toFixed(6);
      return;
    }

    const settledAt = stream.last_settled
      ? new Date(stream.last_settled).getTime()
      : Date.now();

    const tick = () => {
      const elapsed = (Date.now() - settledAt) / 1000;
      const live    = Math.min(base + rate * elapsed, cap);
      if (displayRef.current) displayRef.current.textContent = live.toFixed(6);
    };

    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [isActive, rate, base, cap, stream.last_settled]);

  const handleWithdraw = async () => {
    if (!onWithdraw || withdrawing || !isActive) return;
    setWithdrawing(true);
    setTxBanner(null);
    try {
      const result = await onWithdraw(stream.contract_id);
      if (result?.txHash) {
        const short = `${result.txHash.slice(0, 10)}…${result.txHash.slice(-6)}`;
        setTxBanner(`✓ ${(result.ccAmount ?? 0).toFixed(4)} CC claimed · tx ${short}`);
        onTxConfirmed?.(result);
      }
    } finally {
      setWithdrawing(false);
    }
  };

  const nearDepleted = cap > 0 && (cap - base) / cap < 0.2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease, delay: index * 0.06 }}
      className="group relative p-5 border border-white/10 rounded-xl bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04] transition-colors duration-300"
    >
      {isActive && (
        <div className="absolute -inset-px rounded-xl bg-gradient-to-br from-cyan-500/[0.08] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}

      {/* ── Top row ── */}
      <div className="relative flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
              isActive
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                : stream.status === "PAUSED"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                : "bg-white/10 text-white/45 border-white/10"
            }`}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {stream.status}
          </span>
          <span className="font-mono text-[10px] text-white/25">
            {stream.contract_id.slice(0, 8)}…{stream.contract_id.slice(-6)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleWithdraw}
          disabled={withdrawing || !isActive || !onWithdraw}
          className="ml-2 shrink-0 px-3.5 py-1.5 bg-cyan-600/15 text-cyan-300 text-xs font-medium rounded-lg border border-cyan-500/25 hover:bg-cyan-600/25 hover:border-cyan-400/45 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {withdrawing ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 border border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
              Claiming…
            </span>
          ) : (
            "Claim"
          )}
        </button>
      </div>

      {/* ── Live accrual — the product identity ── */}
      <div className="relative mb-4 p-3.5 rounded-lg bg-black/20 border border-white/[0.06]">
        <p className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-1.5">
          Accrued
        </p>
        <div className="flex items-baseline gap-2">
          <span
            ref={displayRef}
            className={`text-[1.65rem] leading-none font-mono font-medium tabular-nums ${
              isActive ? "text-cyan-300 accrual-live" : "text-white/45"
            }`}
          >
            {base.toFixed(6)}
          </span>
          <span className="text-xs font-mono text-white/30">CC</span>
          {isActive && (
            <span className="ml-auto text-[9px] font-mono text-cyan-400/50 uppercase tracking-widest">
              live
            </span>
          )}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/28 mb-1">
            Rate
          </p>
          <p className="font-mono text-white/65">
            {rate.toFixed(6)}
            <span className="text-white/30">/s</span>
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/28 mb-1">
            Deposited
          </p>
          <p className="font-mono text-white/65">
            {deposited.toFixed(2)} <span className="text-white/30">CC</span>
          </p>
        </div>
        <div>
          <p className="text-[9px] font-mono uppercase tracking-widest text-white/28 mb-1">
            Remaining
          </p>
          <p
            className={`font-mono ${
              nearDepleted ? "text-amber-300/80" : "text-white/65"
            }`}
          >
            {timeRemaining(rate, cap, base)}
          </p>
        </div>
      </div>

      {/* ── Tx confirmation banner ── */}
      <AnimatePresence>
        {txBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 text-[9px] shrink-0">
                ✓
              </span>
              <span className="font-mono text-[10px] text-emerald-300 truncate">
                {txBanner}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Skeleton — exact same geometry as StreamCard ──────────────
export function StreamCardSkeleton({ index = 0 }: { index?: number }): ReactNode {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 border border-white/10 rounded-xl bg-white/[0.025]"
      aria-hidden
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-5 rounded-full skeleton-shimmer" />
          <div className="w-20 h-3 rounded skeleton-shimmer" />
        </div>
        <div className="w-16 h-7 rounded-lg skeleton-shimmer" />
      </div>
      <div className="p-3.5 rounded-lg bg-black/20 border border-white/[0.06] mb-4">
        <div className="w-10 h-2.5 rounded skeleton-shimmer mb-2" />
        <div className="w-36 h-8 rounded skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i}>
            <div className="w-8 h-2 rounded skeleton-shimmer mb-1.5" />
            <div className="w-16 h-3.5 rounded skeleton-shimmer" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
