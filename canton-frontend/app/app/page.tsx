'use client';

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/lib/wallet-context';
import {
  fetchHealth, fetchCampaigns, fetchLeaderboardStats,
  fetchStreams, fetchRewardsSummary,
} from '@/lib/canton-backend-api';
import {
  Waves, Coins, Activity, ArrowRight, RefreshCw,
  TrendingUp, Zap, ChevronRight, Wallet, Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Stream {
  contractId: string;
  sender: string;
  receiver: string;
  ratePerSecond: number;
  startTime: string;
  totalAccrued?: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  track?: string;
  total_xp?: number;
}

function shortenId(id: string) {
  if (!id) return '';
  return id.length > 16 ? id.slice(0, 8) + '…' + id.slice(-6) : id;
}

const cardClass = 'rounded-2xl border border-provn-border bg-provn-surface/80 backdrop-blur-sm p-6';

export default function DashboardPage() {
  const { partyId } = useWallet();
  const [health, setHealth] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lbStats, setLbStats] = useState<any>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [rewards, setRewards] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [h, c, lb, rw] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchCampaigns().catch(() => ({ campaigns: [] })),
        fetchLeaderboardStats().catch(() => null),
        fetchRewardsSummary().catch(() => null),
      ]);
      setHealth(h);
      setCampaigns(c?.campaigns ?? []);
      setLbStats(lb);
      setRewards(rw);

      if (partyId) {
        const st = await fetchStreams(partyId).catch(() => []);
        setStreams(Array.isArray(st) ? st : st?.streams ?? []);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [partyId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE' || c.status === 'active');
  const activeStreams = streams.length;
  const totalParticipants = lbStats?.total_participants ?? 0;
  const totalXP = lbStats?.total_xp ?? 0;

  const stats = [
    { label: 'Active Streams', value: activeStreams.toString(), icon: Waves, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Campaigns', value: activeCampaigns.length.toString(), icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'Participants', value: totalParticipants.toLocaleString(), icon: Trophy, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Total XP', value: totalXP.toLocaleString(), icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-provn-muted text-sm mt-1">
            {partyId ? `Connected: ${shortenId(partyId)}` : 'Canton DevNet Overview'}
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-provn-surface border border-provn-border hover:border-emerald-500/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Network Status */}
      {health && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-sm"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-medium">Canton DevNet Connected</span>
          <span className="text-provn-muted ml-auto font-mono text-xs">{health.version || 'v1.0'}</span>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cardClass}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center`}>
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
              </div>
              <span className="text-provn-muted text-sm">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-mono">{loading ? '—' : s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Streams */}
        <div className={`lg:col-span-2 ${cardClass}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Waves className="w-5 h-5 text-emerald-400" />
              Active Streams
            </h2>
            <Link
              href="/app/streams"
              className="text-xs text-provn-muted hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-16 rounded-xl bg-provn-border/20 animate-pulse" />
              ))}
            </div>
          ) : streams.length === 0 ? (
            <div className="text-center py-12 text-provn-muted">
              <Waves className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active streams yet</p>
              <p className="text-xs mt-1 opacity-60">Streams will appear here when created</p>
            </div>
          ) : (
            <div className="space-y-2">
              {streams.slice(0, 5).map((s, i) => (
                <motion.div
                  key={s.contractId || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-xl bg-provn-bg/50 border border-provn-border/50 hover:border-emerald-500/20 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {shortenId(s.sender)} → {shortenId(s.receiver)}
                    </p>
                    <p className="text-xs text-provn-muted font-mono">
                      {s.ratePerSecond?.toFixed(6) ?? '0'} CC/sec
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-emerald-400">
                      {(s.totalAccrued ?? 0).toFixed(4)} CC
                    </p>
                    <p className="text-[10px] text-provn-muted">accrued</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Rewards Summary */}
          <div className={cardClass}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              CC Rewards
            </h3>
            {rewards ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-provn-muted">Total Earned</span>
                  <span className="font-mono font-medium">{rewards.total_cc_earned?.toFixed(2) ?? '0'} CC</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-provn-muted">Records</span>
                  <span className="font-mono">{rewards.total_records ?? 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-provn-muted">No rewards data yet</p>
            )}
            <Link
              href="/app/leaderboard"
              className="mt-4 flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View Leaderboard <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Active Campaigns */}
          <div className={cardClass}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Active Campaigns
            </h3>
            {activeCampaigns.length === 0 ? (
              <p className="text-sm text-provn-muted">No active campaigns</p>
            ) : (
              <div className="space-y-2">
                {activeCampaigns.slice(0, 3).map(c => (
                  <div key={c.id} className="p-3 rounded-lg bg-provn-bg/50 border border-provn-border/50">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {c.track && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {c.track}
                        </span>
                      )}
                      <span className="text-[10px] text-provn-muted font-mono">
                        {(c.total_xp ?? 0).toLocaleString()} XP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/app/campaign"
              className="mt-4 flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick Links */}
          <div className={cardClass}>
            <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Create Stream', href: '/app/streams', icon: Waves },
                { label: 'View Campaigns', href: '/app/campaign', icon: Zap },
                { label: 'Leaderboard', href: '/app/leaderboard', icon: Trophy },
              ].map(q => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-provn-border/20 transition-colors group"
                >
                  <q.icon className="w-4 h-4 text-provn-muted group-hover:text-emerald-400 transition-colors" />
                  <span className="flex-1">{q.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-provn-muted group-hover:text-provn-text transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
