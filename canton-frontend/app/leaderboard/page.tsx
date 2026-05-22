"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Nav } from "@/components/nav";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  display_name: string | null;
  github_handle: string | null;
  x_handle: string | null;
  track: string;
  total_xp: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
}

interface LeaderboardStats {
  total_participants: number;
  total_xp: number;
  total_contributions: number;
  oss_contributions: number;
  content_contributions: number;
  top_contributor: {
    wallet: string;
    display_name: string;
    total_xp: number;
    track: string;
  } | null;
  campaign_days_remaining: number | null;
  pool_cc: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<string | null>(null);

  useEffect(() => {
    const trackParam = track ? `?track=${track}` : "";
    Promise.all([
      fetch(`http://localhost:8000/leaderboard${trackParam}`).then((res) => res.json()),
      fetch("http://localhost:8000/leaderboard/stats").then((res) => res.json()),
    ])
      .then(([leaderboardData, statsData]) => {
        setLeaderboard(leaderboardData);
        setStats(statsData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch leaderboard:", err);
        setLoading(false);
      });
  }, [track]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Nav />

      <main className="relative pt-32 pb-20 px-6 lg:px-10 max-w-[1680px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="mb-16"
        >
          <span className="inline-flex items-center rounded-md border border-white/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-white/70 mb-6">
            Leaderboard
          </span>
          <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.95] tracking-tight mb-6">
            Top institutional contributors on Canton.
          </h1>
          <p className="max-w-2xl text-xl text-white/60 leading-relaxed">
            Ranked by XP earned through campaign contributions. Climb the ranks to
            earn continuous payment streams.
          </p>
        </motion.div>

        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
          >
            <div className="p-6 border border-white/10 rounded-2xl bg-white/5">
              <p className="text-white/40 text-sm font-mono uppercase tracking-wider mb-2">
                Total Participants
              </p>
              <p className="text-3xl font-medium">{stats.total_participants}</p>
            </div>
            <div className="p-6 border border-white/10 rounded-2xl bg-white/5">
              <p className="text-white/40 text-sm font-mono uppercase tracking-wider mb-2">
                Total XP
              </p>
              <p className="text-3xl font-medium">{stats.total_xp.toLocaleString()}</p>
            </div>
            <div className="p-6 border border-white/10 rounded-2xl bg-white/5">
              <p className="text-white/40 text-sm font-mono uppercase tracking-wider mb-2">
                Contributions
              </p>
              <p className="text-3xl font-medium">{stats.total_contributions}</p>
            </div>
            <div className="p-6 border border-white/10 rounded-2xl bg-white/5">
              <p className="text-white/40 text-sm font-mono uppercase tracking-wider mb-2">
                Pool CC
              </p>
              <p className="text-3xl font-medium">{stats.pool_cc.toLocaleString()}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.2 }}
          className="mb-8 flex items-center gap-4"
        >
          <span className="text-white/60 text-sm">Filter by track:</span>
          <button
            onClick={() => setTrack(null)}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
              track === null
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTrack("OSS")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
              track === "OSS"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
            }`}
          >
            OSS
          </button>
          <button
            onClick={() => setTrack("CONTENT")}
            className={`px-4 py-2 rounded-lg text-sm font-mono transition-colors ${
              track === "CONTENT"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:border-white/20"
            }`}
          >
            Content
          </button>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : !leaderboard || leaderboard.entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 border border-white/10 rounded-2xl"
          >
            <p className="text-white/40 text-lg">No participants yet</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.3 }}
            className="border border-white/10 rounded-2xl overflow-hidden"
          >
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    Participant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    Track
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-mono text-white/60 uppercase tracking-wider">
                    Total XP
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.entries.map((entry, idx) => (
                  <tr
                    key={entry.wallet}
                    className="border-t border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-mono ${
                          entry.rank === 1
                            ? "bg-amber-500/20 text-amber-300"
                            : entry.rank === 2
                            ? "bg-neutral-400/20 text-neutral-300"
                            : entry.rank === 3
                            ? "bg-orange-600/20 text-orange-300"
                            : "bg-white/5 text-white/60"
                        }`}
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 flex items-center justify-center text-base font-mono">
                          {entry.display_name?.[0] || entry.wallet[0]}
                        </div>
                        <div>
                          <p className="font-medium text-lg">
                            {entry.display_name ||
                              entry.github_handle ||
                              entry.x_handle ||
                              `${entry.wallet.slice(0, 8)}...${entry.wallet.slice(-4)}`}
                          </p>
                          <p className="text-sm text-white/40 font-mono">
                            {entry.github_handle && `@${entry.github_handle}`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                          entry.track === "OSS"
                            ? "bg-purple-500/20 text-purple-300"
                            : entry.track === "CONTENT"
                            ? "bg-pink-500/20 text-pink-300"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {entry.track}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xl">
                      {entry.total_xp.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </main>
    </div>
  );
}
