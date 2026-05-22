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
  category?: string;
  flow_rate?: string;
  distributed?: string;
  start_date: string;
  end_date: string;
  participant_count: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/campaigns")
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch campaigns:", err);
        setLoading(false);
      });
  }, []);

  const formatFlowRate = (rate?: string) => {
    if (!rate) return "0 CC/mo";
    const num = parseFloat(rate);
    return `${(num / 1000).toFixed(0)}k CC/mo`;
  };

  const formatDistributed = (dist?: string, pool?: string) => {
    if (!dist || !pool) return "0 CC";
    const num = parseFloat(dist);
    const total = parseFloat(pool);
    const pct = total > 0 ? ((num / total) * 100).toFixed(0) : "0";
    return `${num} CC of ${total} CC`;
  };

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
            Campaigns
          </span>
          <h1 className="text-[clamp(2.5rem,5vw,5rem)] font-medium leading-[0.95] tracking-tight mb-6">
            Institutional reward programs on Canton Network.
          </h1>
          <p className="max-w-2xl text-xl text-white/60 leading-relaxed">
            Join campaigns, complete contributions, and earn continuous payment
            streams through Daml smart contracts.
          </p>
        </motion.div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : campaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 border border-white/10 rounded-2xl"
          >
            <p className="text-white/40 text-lg">No active campaigns yet</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.2 }}
            className="border border-white/10 rounded-2xl overflow-hidden"
          >
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    Flow Rate
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    CC Distributed
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-mono text-white/60 uppercase tracking-wider">
                    You Earned
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-mono text-white/60 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, idx) => (
                  <tr
                    key={campaign.id}
                    className="border-t border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-lg group-hover:text-cyan-300 transition-colors">
                          {campaign.title}
                        </p>
                        {campaign.description && (
                          <p className="text-sm text-white/50 mt-1 line-clamp-1">
                            {campaign.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                          campaign.category === "OSS Development"
                            ? "bg-purple-500/20 text-purple-300"
                            : campaign.category === "Social"
                            ? "bg-pink-500/20 text-pink-300"
                            : campaign.category === "DeFi"
                            ? "bg-cyan-500/20 text-cyan-300"
                            : campaign.category === "Grants"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-gray-500/20 text-gray-300"
                        }`}
                      >
                        {campaign.category || campaign.track_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-white/80">
                      {formatFlowRate(campaign.flow_rate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-mono text-white/80">
                          {formatDistributed(campaign.distributed, campaign.pool_amount)}
                        </p>
                        {campaign.distributed && campaign.pool_amount && (
                          <p className="text-white/40 text-xs mt-1">
                            {((parseFloat(campaign.distributed) / parseFloat(campaign.pool_amount)) * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-white/80">
                      0 CC
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 text-cyan-300 text-sm font-medium hover:bg-cyan-600/30 transition-colors"
                      >
                        Open App
                        <ArrowChip className="border border-cyan-400/30 text-cyan-300" />
                      </Link>
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
