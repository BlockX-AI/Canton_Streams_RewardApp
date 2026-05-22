"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowChip } from "@/components/arrow-chip";
import { Nav } from "@/components/nav";

const easeOutExpo = [0.33, 1, 0.68, 1] as const;

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  pool_amount: string;
  pool_remaining: string;
  token: string;
  status: string;
  track_type: string;
  start_date: string;
  end_date: string;
  participant_count: number;
}

interface LeaderboardEntry {
  rank: number;
  wallet: string;
  display_name: string | null;
  github_handle: string | null;
  x_handle: string | null;
  campaign_xp: number;
  estimated_cc: string;
}

interface CampaignLeaderboard {
  campaign_id: string;
  title: string;
  status: string;
  pool_amount: string;
  total_xp: number;
  total_participants: number;
  entries: LeaderboardEntry[];
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [leaderboard, setLeaderboard] = useState<CampaignLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [wallet, setWallet] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:8000/campaigns/${params.id}`).then((res) => res.json()),
      fetch(`http://localhost:8000/campaigns/${params.id}/leaderboard`).then((res) => res.json()),
    ])
      .then(([campaignData, leaderboardData]) => {
        setCampaign(campaignData);
        setLeaderboard(leaderboardData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch campaign:", err);
        setLoading(false);
      });
  }, [params.id]);

  const handleEnroll = async () => {
    if (!wallet) return;
    setEnrolling(true);
    try {
      await fetch(`http://localhost:8000/campaigns/${params.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      alert("Enrolled successfully!");
    } catch (err) {
      console.error("Enrollment failed:", err);
      alert("Enrollment failed");
    }
    setEnrolling(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <p>Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Nav />

      <main className="relative pt-32 pb-20 px-6 lg:px-10 max-w-[1680px] mx-auto">
        <Link href="/campaigns">
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            ← Back to Campaigns
          </motion.button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                campaign.status === "ACTIVE"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : campaign.status === "ENDED"
                  ? "bg-neutral-500/20 text-neutral-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {campaign.status}
            </span>
            <span className="px-3 py-1 rounded-full border border-white/20 text-xs font-mono text-white/70 uppercase tracking-wider">
              {campaign.track_type}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-medium tracking-tight mb-4">
            {campaign.title}
          </h1>

          {campaign.description && (
            <p className="text-xl text-white/60 max-w-3xl mb-8">
              {campaign.description}
            </p>
          )}

          <div className="flex flex-wrap gap-8 text-sm border-t border-white/10 pt-8">
            <div>
              <span className="text-white/40 block mb-1">Pool Size</span>
              <span className="text-2xl font-mono">
                {campaign.pool_amount} {campaign.token}
              </span>
            </div>
            <div>
              <span className="text-white/40 block mb-1">Participants</span>
              <span className="text-2xl font-mono">{campaign.participant_count}</span>
            </div>
            <div>
              <span className="text-white/40 block mb-1">Total XP</span>
              <span className="text-2xl font-mono">{leaderboard?.total_xp || 0}</span>
            </div>
            <div>
              <span className="text-white/40 block mb-1">End Date</span>
              <span className="text-2xl font-mono">
                {new Date(campaign.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </motion.div>

        {campaign.status === "ACTIVE" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.2 }}
            className="mb-12 p-6 border border-white/10 rounded-2xl bg-white/5"
          >
            <h3 className="text-lg font-medium mb-4">Join Campaign</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter your wallet address"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50"
              />
              <button
                onClick={handleEnroll}
                disabled={enrolling || !wallet}
                className="px-6 py-3 bg-white text-neutral-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-colors"
              >
                {enrolling ? "Enrolling..." : "Enroll"}
              </button>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.3 }}
        >
          <h2 className="text-3xl font-medium mb-6">Leaderboard</h2>

          {!leaderboard || leaderboard.entries.length === 0 ? (
            <div className="text-center py-12 border border-white/10 rounded-2xl">
              <p className="text-white/40">No participants yet</p>
            </div>
          ) : (
            <div className="border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-mono text-white/60 uppercase tracking-wider">
                      XP
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-mono text-white/60 uppercase tracking-wider">
                      Est. CC
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.entries.map((entry) => (
                    <tr
                      key={entry.wallet}
                      className="border-t border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-mono ${
                            entry.rank === 1
                              ? "bg-amber-500/20 text-amber-300"
                              : entry.rank === 2
                              ? "bg-neutral-400/20 text-neutral-300"
                              : entry.rank === 3
                              ? "bg-orange-600/20 text-orange-300"
                              : "text-white/60"
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 flex items-center justify-center text-sm font-mono">
                            {entry.display_name?.[0] || entry.wallet[0]}
                          </div>
                          <div>
                            <p className="font-medium">
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
                      <td className="px-6 py-4 text-right font-mono">
                        {entry.campaign_xp}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-cyan-300">
                        {parseFloat(entry.estimated_cc).toFixed(2)} CC
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
