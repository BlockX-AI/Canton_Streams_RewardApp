"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowChip } from "@/components/arrow-chip";
import { Nav } from "@/components/nav";
import { WalletModal } from "@/components/wallet-modal";
import { useWallet } from "@/lib/wallet-context";

const SCAN_URL = "https://scan.sv-2.dev.global.canton.network.digitalasset.com";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

interface UserStats {
  wallet: string;
  display_name: string | null;
  total_xp: number;
  rank: number | null;
  campaign_xp: number | null;
}

export default function ClaimPage() {
  const { partyId, status: walletStatus } = useWallet();
  const [walletOpen, setWalletOpen] = useState(false);
  const [wallet, setWallet] = useState("");
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimTx, setClaimTx] = useState<string | null>(null);

  useEffect(() => {
    if (partyId && !wallet) setWallet(partyId);
  }, [partyId]);

  const handleCheck = async () => {
    if (!wallet) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/participants/${encodeURIComponent(wallet)}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats(null);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setStats(null);
    }
    setLoading(false);
  };

  const handleClaim = async () => {
    if (!stats || stats.total_xp === 0) return;
    setClaiming(true);
    try {
      const res = await fetch(
        `http://localhost:8000/streams?party=${encodeURIComponent(wallet)}`
      );
      if (res.ok) {
        const streamList = await res.json();
        if (Array.isArray(streamList) && streamList.length > 0) {
          const stream = streamList[0];
          const withdrawRes = await fetch(
            `http://localhost:8000/streams/${stream.contract_id}/withdraw?party=${encodeURIComponent(wallet)}`,
            { method: "POST" }
          );
          const result = await withdrawRes.json();
          const txId = result?.transaction_id ?? result?.offset ?? null;
          setClaimTx(txId);
          setClaiming(false);
          return;
        }
      }
      setClaimTx("xp_recorded");
    } catch (err) {
      console.error("Claim failed:", err);
      alert("Claim failed — ensure backend is running.");
    }
    setClaiming(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Nav />
      <WalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />

      <main className="relative pt-32 pb-20 px-6 lg:px-10 max-w-[1680px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="mb-16"
        >
          <span className="inline-flex items-center rounded-md border border-white/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 mb-6">
            Claim Rewards
          </span>
          <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.95] tracking-tight mb-6">
            Convert your XP into continuous payment streams.
          </h1>
          <p className="max-w-2xl text-xl text-white/60 leading-relaxed">
            Check your earned XP, view your estimated CC rewards, and claim your
            tokens through Canton smart contracts.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
          className="max-w-2xl"
        >
          <div className="p-8 border border-white/10 rounded-2xl bg-white/5 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Check Your Rewards</h3>
              {walletStatus !== "connected" && (
                <button
                  onClick={() => setWalletOpen(true)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-400/30 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                placeholder="Enter your party ID or wallet address"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50 font-mono text-sm"
              />
              <button
                onClick={handleCheck}
                disabled={loading || !wallet}
                className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
              >
                {loading ? "Checking..." : "Check"}
              </button>
            </div>

            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-white/10 pt-6"
              >
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <span className="text-white/40 text-sm block mb-1">
                      Total XP
                    </span>
                    <span className="text-3xl font-mono">
                      {stats.total_xp.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 text-sm block mb-1">Rank</span>
                    <span className="text-3xl font-mono">
                      #{stats.rank || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="p-6 border border-cyan-400/20 rounded-xl bg-cyan-400/5 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/60">Estimated CC Reward</span>
                    <span className="text-2xl font-mono text-cyan-300">
                      {(stats.total_xp * 0.01).toFixed(2)} CC
                    </span>
                  </div>
                  <p className="text-sm text-white/40">
                    Based on current XP pool and conversion rate
                  </p>
                </div>

                {claimTx ? (
                  <div className="p-4 border border-emerald-400/30 bg-emerald-400/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-300 font-medium text-sm">Claim Submitted</span>
                    </div>
                    {claimTx === "xp_recorded" ? (
                      <p className="text-sm text-white/60">
                        XP recorded on Canton DevNet. Deploy a funded stream to claim CC.{" "}
                        <Link href="/dashboard" className="text-cyan-400 underline underline-offset-2">Open Dashboard →</Link>
                      </p>
                    ) : (
                      <p className="text-sm text-white/60">
                        Transaction submitted.{" "}
                        <a
                          href={`${SCAN_URL}/transactions/${claimTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 underline underline-offset-2"
                        >
                          View on Cantonscan ↗
                        </a>
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleClaim}
                    disabled={claiming || stats.total_xp === 0}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-400 hover:to-purple-400 transition-all"
                  >
                    {claiming ? "Claiming..." : "Claim Rewards"}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          <div className="p-8 border border-white/10 rounded-2xl bg-white/5">
            <h3 className="text-lg font-medium mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-mono flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium mb-1">Participate in Campaigns</p>
                  <p className="text-white/60 text-sm">
                    Join active campaigns and complete tasks to earn XP
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-mono flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium mb-1">Climb the Leaderboard</p>
                  <p className="text-white/60 text-sm">
                    Higher XP means higher rank and larger reward share
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-sm font-mono flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium mb-1">Claim Your CC</p>
                  <p className="text-white/60 text-sm">
                    Convert your XP to CC tokens via Canton contract
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <Link href="/campaigns" className="group inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 transition-colors">
                <span>View Active Campaigns</span>
                <ArrowChip className="border border-cyan-400/30 text-cyan-300 group-hover:border-cyan-400/50" />
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
