"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Nav } from "@/components/nav";
import { WalletModal } from "@/components/wallet-modal";
import { useWallet } from "@/lib/wallet-context";
import { API_BASE } from "@/lib/api";

const ease = [0.33, 1, 0.68, 1] as const;

const DEVNET_PARTY =
  "PAR::GINIE-VALIDATOR::1220f42cead6c3bf0443af1f0e51ee250afb48ee528756945ee2733cbfef62c10986";

interface Health {
  status: string;
  canton_reachable: boolean;
  canton_version: string;
  env: string;
}

interface Stream {
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

interface Campaign {
  id: string;
  title: string;
  pool_amount: string;
  pool_remaining: string;
  token: string;
  status: string;
  participant_count: number;
  track_type: string;
  category?: string;
  flow_rate?: string;
}

interface LeaderboardStats {
  total_participants: number;
  total_xp: number;
  total_contributions: number;
  pool_cc: number;
}

export default function DashboardPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lbStats, setLbStats] = useState<LeaderboardStats | null>(null);
  const { status: walletStatus, partyId: connectedParty, setManualParty } = useWallet();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [withdrawResult, setWithdrawResult] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/health`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/campaigns`).then((r) => r.json()).catch(() => ({ campaigns: [] })),
      fetch(`${API_BASE}/leaderboard/stats`).then((r) => r.json()).catch(() => null),
    ]).then(([h, c, lb]) => {
      setHealth(h);
      setCampaigns(c?.campaigns ?? []);
      setLbStats(lb);
    });
  }, []);

  useEffect(() => {
    if (connectedParty) loadStreams(connectedParty);
  }, [connectedParty]);

  const loadStreams = useCallback(async (party: string) => {
    if (!party.trim()) return;
    setLoadingStreams(true);
    setStreamError(null);
    try {
      const res = await fetch(
        `${API_BASE}/streams?party=${encodeURIComponent(party.trim())}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStreams(Array.isArray(data) ? data : []);
    } catch (err) {
      setStreamError("No streams found or party not recognised on DevNet.");
      setStreams([]);
    } finally {
      setLoadingStreams(false);
    }
  }, []);

  const openWallet = () => setWalletModalOpen(true);

  const handleWithdraw = async (contractId: string) => {
    if (!connectedParty) return;
    setWithdrawing(contractId);
    try {
      const res = await fetch(
        `${API_BASE}/streams/${contractId}/withdraw?party=${encodeURIComponent(connectedParty)}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        setWithdrawResult((prev) => ({
          ...prev,
          [contractId]: `✓ Withdrawn — tx: ${data.transaction_id ?? "confirmed"}`,
        }));
        loadStreams(connectedParty);
      } else {
        setWithdrawResult((prev) => ({
          ...prev,
          [contractId]: `Error: ${data.detail ?? "withdraw failed"}`,
        }));
      }
    } catch {
      setWithdrawResult((prev) => ({
        ...prev,
        [contractId]: "Network error",
      }));
    } finally {
      setWithdrawing(null);
    }
  };

  const totalPoolCC = campaigns.reduce(
    (sum, c) => sum + parseFloat(c.pool_amount ?? "0"),
    0
  );
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE");

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Nav />

      <main className="relative pt-28 pb-20 px-6 lg:px-10 max-w-[1680px] mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-10 flex flex-col sm:flex-row sm:items-end gap-6 justify-between"
        >
          <div>
            <span className="inline-flex items-center rounded-md border border-white/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 mb-4">
              Dashboard
            </span>
            <h1 className="text-4xl md:text-5xl font-medium leading-tight tracking-tight">
              GrowStreams on Canton DevNet
            </h1>
          </div>

          {/* DevNet status pill */}
          {health && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono border ${
                health.canton_reachable
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-red-400/30 bg-red-400/10 text-red-300"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health.canton_reachable ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                }`}
              />
              {health.canton_reachable
                ? `DevNet Live — v${health.canton_version.split(".").slice(0, 2).join(".")}`
                : "DevNet Unreachable"}
            </div>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10"
        >
          {[
            { label: "Active Campaigns", value: activeCampaigns.length },
            {
              label: "Total CC Pool",
              value: `${(totalPoolCC / 1000).toFixed(0)}k CC`,
            },
            {
              label: "Participants",
              value: lbStats?.total_participants ?? "—",
            },
            {
              label: "Canton Version",
              value: health?.canton_version?.split("-")[0] ?? "—",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="p-5 border border-white/10 rounded-2xl bg-white/[0.03]"
            >
              <p className="text-white/40 text-xs font-mono uppercase tracking-wider mb-2">
                {s.label}
              </p>
              <p className="text-2xl font-medium font-mono">{s.value}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left col — party connect + streams */}
          <div className="lg:col-span-2 space-y-6">

              {/* Connect panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.15 }}
              className="p-6 border border-white/10 rounded-2xl bg-white/[0.03]"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-medium">Canton Party</h2>
                {connectedParty && (
                  <button
                    onClick={openWallet}
                    className="text-xs text-white/40 hover:text-white/70 transition-colors"
                  >
                    Manage
                  </button>
                )}
              </div>

              {connectedParty ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="font-mono text-sm text-emerald-300 break-all">
                      {connectedParty}
                    </span>
                  </div>
                  <button
                    onClick={() => loadStreams(connectedParty)}
                    disabled={loadingStreams}
                    className="mt-2 px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-300 text-sm font-medium hover:bg-cyan-600/30 transition-colors disabled:opacity-50"
                  >
                    {loadingStreams ? "Loading…" : "Refresh Streams"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-white/50 text-sm">
                    Connect your Canton wallet to view streams. Use the GINIE-VALIDATOR
                    party for DevNet testing.
                  </p>
                  <button
                    onClick={openWallet}
                    className="w-full py-3 bg-white text-neutral-900 rounded-xl text-sm font-medium hover:bg-white/90 transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              )}
            </motion.div>

            <WalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />

            {/* Streams list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.2 }}
              className="p-6 border border-white/10 rounded-2xl bg-white/[0.03]"
            >
              <h2 className="text-lg font-medium mb-5">Active Streams</h2>

              {!connectedParty ? (
                <p className="text-white/30 text-sm py-8 text-center">
                  Connect a party to see streams
                </p>
              ) : loadingStreams ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-7 h-7 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : streamError ? (
                <div className="py-8 text-center">
                  <p className="text-white/40 text-sm">{streamError}</p>
                  <p className="text-white/25 text-xs mt-2">
                    Deploy Daml contracts to DevNet to create real streams.
                  </p>
                </div>
              ) : streams.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-white/40 text-sm">No streams found for this party.</p>
                  <p className="text-white/25 text-xs mt-2">
                    Daml contracts need to be deployed to create streams on DevNet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {streams.map((s) => (
                    <div
                      key={s.contract_id}
                      className="p-5 border border-white/10 rounded-xl bg-white/[0.02] hover:border-white/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider mr-2 ${
                              s.status === "ACTIVE"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-white/10 text-white/50"
                            }`}
                          >
                            {s.status}
                          </span>
                          <span className="font-mono text-xs text-white/30">
                            {s.contract_id.slice(0, 20)}…
                          </span>
                        </div>
                        <button
                          onClick={() => handleWithdraw(s.contract_id)}
                          disabled={
                            withdrawing === s.contract_id ||
                            s.status !== "ACTIVE"
                          }
                          className="px-4 py-1.5 bg-cyan-600/20 text-cyan-300 text-xs font-medium rounded-lg hover:bg-cyan-600/30 transition-colors disabled:opacity-40"
                        >
                          {withdrawing === s.contract_id ? "Claiming…" : "Claim"}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-white/40 text-xs mb-1">Accrued</p>
                          <p className="font-mono text-cyan-300">
                            {parseFloat(s.accrued ?? "0").toFixed(4)} CC
                          </p>
                        </div>
                        <div>
                          <p className="text-white/40 text-xs mb-1">Rate</p>
                          <p className="font-mono">
                            {parseFloat(s.rate_per_second ?? "0").toFixed(6)}/s
                          </p>
                        </div>
                        <div>
                          <p className="text-white/40 text-xs mb-1">Withdrawn</p>
                          <p className="font-mono text-white/60">
                            {parseFloat(s.total_withdrawn ?? "0").toFixed(4)} CC
                          </p>
                        </div>
                      </div>

                      {withdrawResult[s.contract_id] && (
                        <p className="mt-3 text-xs font-mono text-emerald-400">
                          {withdrawResult[s.contract_id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right col */}
          <div className="space-y-6">

            {/* DevNet info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.2 }}
              className="p-6 border border-white/10 rounded-2xl bg-white/[0.03]"
            >
              <h2 className="text-lg font-medium mb-5">DevNet Info</h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Validator", value: "GINIE-VALIDATOR" },
                  { label: "Ledger API", value: "100.49.52.241:7575" },
                  { label: "Network", value: "Canton DevNet" },
                  {
                    label: "Status",
                    value: health?.canton_reachable ? "Connected" : "Offline",
                    color: health?.canton_reachable
                      ? "text-emerald-300"
                      : "text-red-300",
                  },
                  {
                    label: "SDK Version",
                    value: health?.canton_version?.split("-")[0] ?? "—",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/40">{row.label}</span>
                    <span
                      className={`font-mono text-xs ${row.color ?? "text-white/80"}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <a
                href="https://scan.sv-2.dev.global.canton.network.digitalasset.com"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block text-center py-2.5 border border-cyan-400/30 rounded-lg text-cyan-300 text-sm hover:bg-cyan-400/10 transition-colors"
              >
                View on DevNet Explorer ↗
              </a>
            </motion.div>

            {/* Active campaigns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.25 }}
              className="p-6 border border-white/10 rounded-2xl bg-white/[0.03]"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-medium">Active Campaigns</h2>
                <Link
                  href="/campaigns"
                  className="text-xs text-cyan-400/70 hover:text-cyan-300 transition-colors"
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-3">
                {activeCampaigns.slice(0, 4).map((c) => (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    className="block p-4 border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-medium leading-snug line-clamp-1">
                        {c.title}
                      </p>
                      <span className="text-xs font-mono text-cyan-300 ml-2 shrink-0">
                        {parseFloat(c.pool_amount).toLocaleString()} CC
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">
                        {c.participant_count} participants
                      </span>
                      <span className="text-white/20">·</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          c.category === "OSS Development" || c.track_type === "OSS"
                            ? "bg-purple-500/20 text-purple-300"
                            : c.category === "Social"
                            ? "bg-pink-500/20 text-pink-300"
                            : c.category === "DeFi"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {c.category ?? c.track_type}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Quick links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.3 }}
              className="p-6 border border-white/10 rounded-2xl bg-white/[0.03]"
            >
              <h2 className="text-lg font-medium mb-4">Quick Links</h2>
              <div className="space-y-2">
                {[
                  { label: "Leaderboard", href: "/leaderboard" },
                  { label: "Claim Rewards", href: "/claim" },
                  { label: "Browse Campaigns", href: "/campaigns" },
                ].map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-sm"
                  >
                    <span>{l.label}</span>
                    <span className="text-white/30">→</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
